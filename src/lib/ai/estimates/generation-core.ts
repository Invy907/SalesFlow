import { z } from "zod";
import { aiEstimateLineSchema, type AiEstimateDraft } from "./schemas";
import { normalizeItemName } from "./normalize";

export const aiGeneratedEstimateSchema = z.object({
  subject: z.string().trim().max(70),
  lines: z.array(aiEstimateLineSchema).min(1).max(80),
  templateMessage: z.string().trim().max(2000),
  remarks: z.string().trim().max(5000),
  evidenceIndexes: z.array(z.coerce.number().int().min(0).max(9)).min(1).max(10),
  warnings: z.array(z.string().trim().max(500)).max(20),
});

export type AiGeneratedEstimate = z.infer<typeof aiGeneratedEstimateSchema>;

export type AiEstimateGenerationEvidence = {
  exampleId: string;
  label: string;
  similarity: number;
  clientName: string | null;
  subject: string | null;
  issueDate: string | null;
  templateMessage: string | null;
  remarks: string | null;
  lines: Array<{
    name: string;
    qty: number;
    unit: string | null;
    unitPrice: number;
    taxCategory: AiEstimateDraft["lines"][number]["taxCategory"];
  }>;
};

export type AiEstimatePriceAnchor = {
  name: string;
  normalizedName: string;
  sampleCount: number;
  medianPrice: number;
  p25Price: number;
  p75Price: number;
  scope: "client" | "company";
};

export function isPlausibleOpenAiApiKey(value: string | null | undefined) {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(value ?? "");
}

function escapedPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactKnownClientNames(value: string, clientNames: Array<string | null | undefined>) {
  let redacted = value;
  for (const name of clientNames) {
    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) continue;
    redacted = redacted.replace(new RegExp(escapedPattern(trimmed), "giu"), "[CLIENT]");
  }
  return redacted;
}

export function buildAiEstimateGenerationContext(input: {
  clientName: string;
  subject: string;
  workDescription: string;
  evidence: AiEstimateGenerationEvidence[];
  priceAnchors: AiEstimatePriceAnchor[];
  marketResearch?: unknown;
}) {
  const clientNames = [input.clientName, ...input.evidence.map((item) => item.clientName)];
  const redact = (value: string | null | undefined) => redactKnownClientNames(value ?? "", clientNames);

  return {
    request: {
      subject: redact(input.subject),
      workDescription: redact(input.workDescription),
    },
    approvedEvidence: input.evidence.map((example, evidenceIndex) => ({
      evidenceIndex,
      similarity: example.similarity,
      subject: redact(example.subject),
      issueDate: example.issueDate,
      templateMessage: redact(example.templateMessage),
      remarks: redact(example.remarks),
      lines: example.lines,
    })),
    priceAnchors: input.priceAnchors,
    publicMarketResearch: input.marketResearch ?? null,
  };
}

function tokenOverlap(left: string, right: string) {
  const leftTokens = normalizeItemName(left).split(" ").filter((token) => token.length > 1);
  const rightValue = normalizeItemName(right);
  if (!leftTokens.length) return 0;
  return leftTokens.filter((token) => rightValue.includes(token)).length / leftTokens.length;
}

function nearestPrice(target: number, candidates: number[]) {
  return [...candidates].sort((left, right) => Math.abs(left - target) - Math.abs(right - target))[0];
}

/**
 * The model may compose item names and quantities, but a price must remain grounded in
 * approved statistics or an approved evidence line. Unsupported prices are reset to 0.
 */
export function groundAiGeneratedEstimate(input: {
  generated: AiGeneratedEstimate;
  evidence: AiEstimateGenerationEvidence[];
  priceAnchors: AiEstimatePriceAnchor[];
  minimumSamples: number;
  fallbackWarnings?: string[];
}): AiEstimateDraft {
  const warnings = new Set([...(input.fallbackWarnings ?? []), ...input.generated.warnings]);
  const evidenceLines = input.evidence.flatMap((example) => example.lines);

  const lines = input.generated.lines.map((line) => {
    const normalized = normalizeItemName(line.name);
    const anchor = input.priceAnchors.find((item) => item.normalizedName === normalized && item.sampleCount >= input.minimumSamples);
    if (anchor) {
      return {
        ...line,
        unitPrice: anchor.medianPrice,
        reason: `${line.reason} · ${anchor.scope === "client" ? "동일 거래처" : "회사"} ${anchor.sampleCount}건 중앙값`.slice(0, 500),
      };
    }

    const matchingEvidence = evidenceLines
      .map((item) => ({ item, score: Math.max(tokenOverlap(line.name, item.name), tokenOverlap(item.name, line.name)) }))
      .filter(({ score }) => score >= 0.5)
      .sort((left, right) => right.score - left.score);
    const supportedPrices = [...new Set(matchingEvidence.map(({ item }) => item.unitPrice).filter((price) => price > 0))];
    if (supportedPrices.length) {
      warnings.add(`${line.name}: 가격 표본이 ${input.minimumSamples}건 미만이라 승인 견적의 단가를 사용했습니다.`);
      return {
        ...line,
        unitPrice: nearestPrice(line.unitPrice, supportedPrices),
        confidence: Math.min(line.confidence, 0.75),
        reason: `${line.reason} · 승인 견적 단가`.slice(0, 500),
      };
    }

    warnings.add(`${line.name}: 승인된 가격 근거가 없어 단가를 0으로 두었습니다.`);
    return {
      ...line,
      unitPrice: 0,
      confidence: Math.min(line.confidence, 0.4),
      reason: `${line.reason} · 가격 근거 없음`.slice(0, 500),
    };
  });

  const evidence = [...new Set(input.generated.evidenceIndexes)]
    .map((index) => input.evidence[index])
    .filter((item): item is AiEstimateGenerationEvidence => Boolean(item))
    .map((item) => ({
      exampleId: item.exampleId,
      label: item.label.slice(0, 255),
      similarity: item.similarity,
    }));

  return {
    subject: input.generated.subject,
    lines,
    templateMessage: input.generated.templateMessage,
    remarks: input.generated.remarks,
    evidence: evidence.length ? evidence : input.evidence.slice(0, 1).map((item) => ({
      exampleId: item.exampleId,
      label: item.label.slice(0, 255),
      similarity: item.similarity,
    })),
    warnings: [...warnings].slice(0, 20),
  };
}
