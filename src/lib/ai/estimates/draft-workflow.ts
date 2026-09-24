import { aiEstimateDraftSchema, isContextDocument, type AiEstimateDraft } from "./schemas";
import { groundAiGeneratedEstimate, type AiGeneratedEstimate, type AiEstimateGenerationEvidence, type AiEstimatePriceAnchor } from "./generation-core";
import { normalizeItemName } from "./normalize";
import { tokenScore } from "./retrieval";

type Locale = "ja" | "ko" | "en";
export class AiDraftWorkflowError extends Error {
  constructor(readonly code: "no_evidence" | "no_price_evidence" | "invalid_draft") { super(code); }
}
const messages = {
  ja: {
    rateCard: "承認済み単価表の品目です。数量と適用条件を確認してください。",
    contextLimit: "選択資料の内容が大きいため、内部資料から候補を作成しました。AI分析を使うには資料の選択を減らして再試行してください。",
    historical: "関連する承認済み見積を参考にした明細です。数量と作業範囲を確認してください。",
    review: "保存前に数量・作業範囲・単価をご確認ください。根拠のない単価は空欄相当の0円で表示します。",
    fallback: "AIの応答を取得できなかったため、承認済み資料から候補を作成しました。",
  },
  ko: {
    rateCard: "승인된 단가표의 품목입니다. 수량과 적용 조건을 확인해 주세요.",
    contextLimit: "선택 자료의 내용이 커서 내부 자료로 후보를 만들었습니다. AI 분석은 자료 선택을 줄여 다시 시도해 주세요.",
    historical: "관련 승인 견적을 참고한 품목입니다. 수량과 작업 범위를 확인해 주세요.",
    review: "저장 전 수량·작업 범위·단가를 확인해 주세요. 근거가 없는 단가는 입력이 필요한 0원으로 표시됩니다.",
    fallback: "AI 응답을 가져오지 못해 승인된 자료에서 후보를 구성했습니다.",
  },
  en: {
    rateCard: "Item from an approved rate card. Review quantity and applicable terms.",
    contextLimit: "The selected sources were too large for AI analysis. Candidates were prepared from internal sources. Select fewer sources and try again to use AI analysis.",
    historical: "Item from a related approved estimate. Review quantity and work scope.",
    review: "Review quantities, work scope and prices before saving. Unsupported prices are shown as 0 and need your input.",
    fallback: "The AI response was unavailable. Candidates were prepared from approved documents.",
  },
};

/** The same deterministic grounding runs for model output and the offline path. */
export async function composeGroundedDraft(input: {
  subject: string; workDescription: string; locale: Locale; taxMode: "included" | "excluded";
  requirements?: string; assumptions?: string; exclusions?: string;
  evidence: AiEstimateGenerationEvidence[]; priceAnchors: AiEstimatePriceAnchor[]; minimumSamples: number;
  retrievalMode: "local" | "hybrid"; allowExternalProcessing: boolean;
  generate?: () => Promise<{ generated: AiGeneratedEstimate; provider: string; model: string }>;
}): Promise<{ draft: AiEstimateDraft; generationMode: "model" | "local"; provider: string; model: string }> {
  if (!input.evidence.length) throw new AiDraftWorkflowError("no_evidence");
  const priceSources = input.evidence.filter((example) => !isContextDocument(example.documentKind) && example.lines.length);
  const bestHistorical = priceSources.find((example) => example.documentKind !== "price_list");
  const copy = messages[input.locale];
  const query = [input.subject, input.workDescription, input.requirements,
    ...input.evidence.filter((example) => isContextDocument(example.documentKind)).map((example) => example.workDetails)].filter(Boolean).join(" ");
  const allCandidates = priceSources.flatMap((example) => example.lines.filter(line => line.qty > 0).map(line => ({ example, line })));
  // A short item such as 開発 must not disappear merely because the requirements
  // contain many other words. Check item coverage as well as query relevance.
  const matching = allCandidates.filter(({ line }) => tokenScore(query, line.name) >= 0.15 || tokenScore(line.name, query) >= 0.75);
  const rateCards = allCandidates.filter(({ example }) => example.documentKind === "price_list");
  const candidates = matching.length ? matching : rateCards.length ? rateCards
    : allCandidates.filter(({ example }) => example.exampleId === bestHistorical?.exampleId);
  type Candidate = typeof allCandidates[number];
  const identity = ({ line }: Candidate) => JSON.stringify([normalizeItemName(line.name), normalizeItemName(line.unit ?? ""), line.taxCategory]);
  const bySourceTerms = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const key = JSON.stringify([identity(candidate), candidate.example.taxMode, candidate.example.currency]);
    const existing = bySourceTerms.get(key);
    if (!existing || (candidate.example.documentKind === "price_list" && existing.example.documentKind !== "price_list")) bySourceTerms.set(key, candidate);
  }
  // An estimate has one currency/tax mode. Prefer its compatible source when the same item
  // appears under several source terms, rather than adding the same priced item twice.
  const compatible = ({ example }: Candidate) => example.currency === "JPY" && example.taxMode === input.taxMode;
  const byOutputItem = new Map<string, Candidate>();
  for (const candidate of bySourceTerms.values()) {
    const key = identity(candidate);
    const existing = byOutputItem.get(key);
    if (!existing || (compatible(candidate) && !compatible(existing))) byOutputItem.set(key, candidate);
  }
  const historical = [...byOutputItem.values()].slice(0, 80);
  const quantityReason = { ja: "資料の参考数量です。今回の作業量に合わせて確認・修正してください。",
    ko: "참고 자료의 임시 수량입니다. 이번 작업량에 맞게 확인·수정해 주세요.",
    en: "Reference quantity only. Review and adjust it for the current scope." }[input.locale];
  let generated: AiGeneratedEstimate | null = historical.length ? {
    subject: input.subject || input.workDescription.slice(0, 70),
    lines: historical.map(({ line, example }) => ({ name: line.name, qty: example.documentKind === "price_list" ? 1 : line.qty,
      unit: line.unit ?? "", unitPrice: line.unitPrice, quantityReason,
      taxCategory: line.taxCategory, confidence: Math.min(example.similarity, 0.65), reason: example.documentKind === "price_list" ? copy.rateCard : copy.historical })),
    templateMessage: "", remarks: "", evidenceIndexes: [0], warnings: [],
  } : null;
  let generationMode: "model" | "local" = "local";
  let provider = "salesflow-approved-retrieval";
  let model = "grounded-draft-v2";
  const warnings = [copy.review];
  if (input.allowExternalProcessing && input.generate) {
    try {
      const result = await input.generate();
      generated = result.generated;
      provider = result.provider;
      model = result.model;
      generationMode = "model";
    } catch (error) { warnings.push(error && typeof error === "object" && "code" in error && error.code === "context_limit" ? copy.contextLimit : copy.fallback); }
  }
  if (!generated) throw new AiDraftWorkflowError("no_price_evidence");
  // Preserve the user's title and avoid moving historical contractual text into a new document.
  generated = { ...generated, subject: input.subject || generated.subject || input.workDescription.slice(0, 70),
    templateMessage: "", remarks: "" };
  const draft = groundAiGeneratedEstimate({ generated, evidence: input.evidence, priceAnchors: input.priceAnchors,
    minimumSamples: input.minimumSamples, fallbackWarnings: warnings, targetTaxMode: input.taxMode,
    currency: "JPY", retrievalMode: input.retrievalMode, locale: input.locale });
  const validated = aiEstimateDraftSchema.safeParse(draft);
  if (!validated.success) throw new AiDraftWorkflowError("invalid_draft");
  return { draft: validated.data, generationMode, provider, model };
}
