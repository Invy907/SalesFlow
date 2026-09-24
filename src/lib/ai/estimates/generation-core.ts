import { z } from "zod";
import { aiEstimateLineSchema, isContextDocument, type AiEstimateDocumentKind, type AiEstimateDraft } from "./schemas";
import { normalizeItemName } from "./normalize";

export const aiGeneratedEstimateSchema = z.object({
  subject: z.string().trim().max(70),
  lines: z.array(aiEstimateLineSchema.extend({ quantityReason: z.string().trim().max(500).optional() })
    .refine((line) => line.qty > 0, "수량은 0보다 커야 합니다.")).min(1).max(80),
  templateMessage: z.string().trim().max(2000),
  remarks: z.string().trim().max(5000),
  evidenceIndexes: z.array(z.coerce.number().int().min(0).max(9)).max(10),
  warnings: z.array(z.string().trim().max(500)).max(20),
});
export type AiGeneratedEstimate = z.infer<typeof aiGeneratedEstimateSchema>;
export type AiEstimateTaxMode = "included" | "excluded" | "unknown";
export type AiEstimateGenerationEvidence = {
  exampleId: string; sourceId: string; currency: string; taxMode: AiEstimateTaxMode;
  label: string; similarity: number; clientName: string | null; subject: string | null; issueDate: string | null;
  templateMessage: string | null; remarks: string | null;
  documentKind?: AiEstimateDocumentKind; projectName?: string; revision?: string;
  validFrom?: string | null; validUntil?: string | null;
  workDetails?: string | null; assumptions?: string | null; exclusions?: string | null;
  lines: Array<{ id: string; name: string; qty: number; unit: string | null; unitPrice: number;
    taxCategory: AiEstimateDraft["lines"][number]["taxCategory"] }>;
};
export type AiEstimatePriceAnchor = {
  name: string; normalizedName: string; sampleCount: number; medianPrice: number; p25Price: number; p75Price: number;
  scope: "client" | "company"; unit: string | null; taxCategory: AiEstimateDraft["lines"][number]["taxCategory"];
  currency: string; taxMode: AiEstimateTaxMode; exampleIds: string[]; lineIds: string[];
  sources?: Array<{ exampleId: string; sourceId: string; label: string }>;
};

export function isPlausibleOpenAiApiKey(value: string | null | undefined) {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(value ?? "");
}

export function redactKnownClientNames(value: string, clientNames: Array<string | null | undefined>) {
  let redacted = value;
  const names = [...new Set(clientNames.map((name) => name?.trim()).filter((name): name is string => Boolean(name)))].sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (name.length < 2) continue;
    redacted = redacted.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "[CLIENT]");
  }
  return redacted.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[EMAIL]")
    .replace(/(?<!\d)(?:\+\d{1,3}[ -]?)?(?:\(\d{2,4}\)|\d{2,4})[- ]\d{2,4}[- ]\d{4}(?!\d)/gu, "[PHONE]");
}

export function buildAiEstimateGenerationContext(input: {
  clientName: string; subject: string; workDescription: string; evidence: AiEstimateGenerationEvidence[];
  priceAnchors: AiEstimatePriceAnchor[]; marketResearch?: unknown;
  requirements?: string; assumptions?: string; exclusions?: string;
}) {
  const names = [input.clientName, ...input.evidence.map((item) => item.clientName)];
  const redact = (value: string | null | undefined) => redactKnownClientNames(value ?? "", names);
  const redactTree = (value: unknown): unknown => {
    if (typeof value === "string") return redact(value);
    if (Array.isArray(value)) return value.map(redactTree);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactTree(child)]));
    return value;
  };
  return {
    request: { subject: redact(input.subject), workDescription: redact(input.workDescription),
      requirements: redact(input.requirements), assumptions: redact(input.assumptions), exclusions: redact(input.exclusions) },
    approvedEvidence: input.evidence.map((example, evidenceIndex) => ({
      evidenceIndex, similarity: example.similarity, subject: redact(example.subject), issueDate: example.issueDate,
      documentKind: example.documentKind ?? "estimate", projectName: redact(example.projectName), revision: redact(example.revision),
      validFrom: example.validFrom ?? null, validUntil: example.validUntil ?? null,
      workDetails: redact(example.workDetails), assumptions: redact(example.assumptions), exclusions: redact(example.exclusions),
      currency: example.currency, taxMode: example.taxMode,
      templateMessage: redact(example.templateMessage), remarks: redact(example.remarks),
      lines: isContextDocument(example.documentKind) ? [] : example.lines.map((line) => ({ name: redact(line.name), qty: line.qty, unit: redact(line.unit), unitPrice: line.unitPrice, taxCategory: line.taxCategory })),
    })),
    priceAnchors: input.priceAnchors.map((anchor) => ({
      name: redact(anchor.name), unit: redact(anchor.unit), taxCategory: anchor.taxCategory, taxMode: anchor.taxMode,
      currency: anchor.currency, sampleCount: anchor.sampleCount, medianPrice: anchor.medianPrice,
      p25Price: anchor.p25Price, p75Price: anchor.p75Price, scope: anchor.scope,
    })),
    publicMarketResearch: redactTree(input.marketResearch ?? null),
  };
}

const normalUnit = (unit: string | null) => normalizeItemName(unit ?? "");
const validPrice = (price: number) => Number.isSafeInteger(price) && Math.abs(price) <= 999999999999 && price !== 0;

/** Only compatible approved lines can support a price; model-written citations are not trusted. */
export function groundAiGeneratedEstimate(input: {
  generated: AiGeneratedEstimate; evidence: AiEstimateGenerationEvidence[]; priceAnchors: AiEstimatePriceAnchor[];
  minimumSamples: number; fallbackWarnings?: string[]; targetTaxMode?: "included" | "excluded";
  currency?: string; retrievalMode?: "local" | "hybrid"; locale?: "ja" | "ko" | "en";
}): AiEstimateDraft {
  const warnings = new Set([...(input.fallbackWarnings ?? []), ...input.generated.warnings]);
  const currency = input.currency ?? "JPY";
  const taxMode = input.targetTaxMode ?? "excluded";
  const locale = input.locale ?? "ko";
  const text = {
    ja: { client: "同じ取引先", company: "組織", median: "件の中央値", historicalWarning: "統計の標本が不足しているため、一致する承認済み見積書の単価を使用しました。", historical: "同一品目・単位・税区分の承認済み単価", insufficient: "承認済みの価格根拠がないため、単価を提案していません。確認して入力してください。", missing: "価格根拠なし — 単価入力が必要", source: "承認済み価格標本" },
    ko: { client: "동일 거래처", company: "회사", median: "건 중앙값", historicalWarning: "통계 표본이 부족하여 일치하는 승인 견적의 단가를 사용했습니다.", historical: "동일 품목·단위·세율의 승인 견적 단가", insufficient: "승인된 가격 근거가 없어 단가를 제안하지 않았습니다. 직접 확인해 입력해 주세요.", missing: "가격 근거 없음 — 단가 입력 필요", source: "승인된 가격 표본" },
    en: { client: "Same client", company: "Organization", median: "document median", historicalWarning: "There are too few statistical samples; the matching approved estimate's unit price is used.", historical: "Approved price for the same item, unit and tax category", insufficient: "No approved price evidence is available. Please verify and enter a unit price.", missing: "No price evidence — unit price required", source: "Approved price sample" },
  }[locale];
  const citations = new Map<string, AiEstimateDraft["evidence"][number]>();
  const citeExample = (example: AiEstimateGenerationEvidence) => citations.set(example.exampleId, {
    exampleId: example.exampleId, sourceId: example.sourceId, label: example.label.slice(0, 255), similarity: example.similarity, documentKind: example.documentKind,
  });
  const lines: AiEstimateDraft["lines"] = input.generated.lines.map((proposal) => {
    const line = { ...proposal, quantityReason: proposal.quantityReason || ({
      ja: "数量の算定条件を確認してください。", ko: "수량 산정 조건을 확인해 주세요.", en: "Please verify the quantity assumptions.",
    }[locale]) };
    const normalized = normalizeItemName(line.name);
    const compatible = (item: { unit: string | null; taxCategory: typeof line.taxCategory }) =>
      item.taxCategory !== "follow_company" && normalUnit(item.unit) === normalUnit(line.unit) && item.taxCategory === line.taxCategory;
    // A current rate card is an explicit price, not another historical sample.
    const rateCards = input.evidence.filter((example) => example.documentKind === "price_list"
      && example.currency === currency && example.taxMode === taxMode && example.similarity >= 0.25)
      .flatMap((example) => example.lines.filter((item) => normalizeItemName(item.name) === normalized
        && compatible(item) && item.qty > 0 && validPrice(item.unitPrice)).map((item) => ({ example, item })));
    if (rateCards.length) {
      const prices = new Set(rateCards.map(({ item }) => item.unitPrice));
      rateCards.forEach(({ example }) => citeExample(example));
      if (prices.size > 1) {
        const conflict = { ja: "選択された単価表の価格が一致しません。適用する版・条件を確認してください。",
          ko: "단가표의 가격이 서로 다릅니다. 적용할 버전과 조건을 확인해 주세요.",
          en: "Rate cards disagree. Confirm the applicable revision and conditions." }[locale];
        warnings.add(`${line.name}: ${conflict}`);
        return { ...line, unitPrice: 0, priceEvidence: "insufficient", confidence: 0, evidenceExampleIds: [], evidenceLineIds: [], reason: conflict };
      }
      const rate = rateCards[0];
      return { ...line, unitPrice: rate.item.unitPrice, priceEvidence: "price_list", confidence: Math.min(line.confidence, 0.95),
        evidenceExampleIds: [...new Set(rateCards.map(({ example }) => example.exampleId))],
        evidenceLineIds: rateCards.map(({ item }) => item.id).slice(0, 100),
        reason: `${line.reason} · ${{ ja: "承認済み単価表", ko: "승인된 단가표", en: "Approved rate card" }[locale]}`.slice(0, 500) };
    }
    const anchor = input.priceAnchors.find((item) => item.normalizedName === normalized && compatible(item)
      && item.currency === currency && item.taxMode === taxMode && item.sampleCount >= input.minimumSamples
      && validPrice(item.medianPrice) && item.medianPrice > 0 && item.exampleIds.length > 0 && item.lineIds.length > 0);
    if (anchor) {
      for (const id of anchor.exampleIds) {
        const example = input.evidence.find((item) => item.exampleId === id);
        if (example) citeExample(example);
        else {
          const source = anchor.sources?.find((item) => item.exampleId === id);
          citations.set(id, { exampleId: id, sourceId: source?.sourceId, label: (source?.label ?? text.source).slice(0, 255), similarity: 0 });
        }
      }
      return { ...line, unitPrice: anchor.medianPrice, priceEvidence: "statistical",
        evidenceExampleIds: anchor.exampleIds.slice(0, 50), evidenceLineIds: anchor.lineIds.slice(0, 100),
        confidence: Math.min(line.confidence, 0.9),
        priceRange: { low: anchor.p25Price, high: anchor.p75Price, sampleCount: anchor.sampleCount, unit: line.unit },
        reason: `${line.reason} · ${anchor.scope === "client" ? text.client : text.company} ${anchor.sampleCount}${locale === "en" ? " " : ""}${text.median}`.slice(0, 500) };
    }
    // An exact item match is required even if a whole document was semantically relevant.
    const candidates = input.evidence.filter((example) => (!example.documentKind || example.documentKind === "estimate")
      && example.currency === currency && example.taxMode === taxMode && example.similarity >= 0.25)
      .flatMap((example) => example.lines.filter((item) => normalizeItemName(item.name) === normalized && compatible(item)
        && item.qty > 0 && validPrice(item.unitPrice)).map((item) => ({ example, item })))
      .sort((a, b) => b.example.similarity - a.example.similarity
        || (b.example.issueDate ?? "").localeCompare(a.example.issueDate ?? "") || a.item.id.localeCompare(b.item.id));
    const historical = candidates[0];
    if (historical) {
      citeExample(historical.example);
      warnings.add(`${line.name}: ${text.historicalWarning}`);
      return { ...line, unitPrice: historical.item.unitPrice, priceEvidence: "historical",
        evidenceExampleIds: [historical.example.exampleId], evidenceLineIds: [historical.item.id],
        confidence: Math.min(line.confidence, 0.75), reason: `${line.reason} · ${text.historical}`.slice(0, 500) };
    }
    warnings.add(`${line.name}: ${text.insufficient}`);
    return { ...line, unitPrice: 0, priceEvidence: "insufficient", evidenceExampleIds: [], evidenceLineIds: [],
      confidence: 0, reason: `${line.reason} · ${text.missing}`.slice(0, 500) };
  });
  const insufficientLines = lines.filter((line) => line.priceEvidence === "insufficient").length;
  return { subject: input.generated.subject, lines, templateMessage: input.generated.templateMessage,
    remarks: input.generated.remarks, evidence: [...citations.values()].slice(0, 10),
    contextEvidence: input.evidence.filter((example) => isContextDocument(example.documentKind)).map((example) => ({
      exampleId: example.exampleId, sourceId: example.sourceId, label: example.label.slice(0, 255), similarity: example.similarity, documentKind: example.documentKind,
    })).slice(0, 10), warnings: [...warnings].slice(0, 20),
    retrieval: { mode: input.retrievalMode ?? "local", matchedExamples: input.evidence.length, pricedLines: lines.length - insufficientLines, insufficientLines } };
}
