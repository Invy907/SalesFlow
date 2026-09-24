import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseLocalDocument } from "../../../src/lib/ai/estimates/local-document-parser";
import { normalizeExtraction, toReviewExtraction } from "../../../src/lib/ai/estimates/batch/normalize";
import type { EstimateExtractionResult, SourceDocumentKind } from "../../../src/lib/ai/estimates/batch/extraction-schema";
import type { AiEstimateGenerationEvidence } from "../../../src/lib/ai/estimates/generation-core";

export const FIXTURE_DIR = resolve(import.meta.dirname, "../../../fixtures/ai-estimate-validation");
export const CASES = [
  { id: "pdf-extraction", suite: "smoke", title: "PDF의 2개 명세·수량·세금·합계를 실제 추출" },
  { id: "pdf-to-estimate", suite: "smoke", title: "실제 PDF 추출 자료로 3화면 이력을 5화면 견적으로 생성" },
  { id: "rate-ja", suite: "full", title: "일본어 단가표+설계+작업 범위로 5화면 생성" },
  { id: "rate-ko", suite: "full", title: "한국어 요청과 일본어 품목명을 유지한 생성" },
  { id: "rate-en", suite: "full", title: "영어 단가표로 5화면 생성" },
  { id: "tax-mismatch", suite: "full", title: "세금 포함 기준 불일치는 가격 0·확인 필요" },
  { id: "rate-conflict", suite: "full", title: "충돌 단가표는 임의 평균 없이 가격 0" },
  { id: "missing-price", suite: "full", title: "미등록 품목은 제외 또는 0·확인 필요" },
  { id: "prompt-injection", suite: "full", title: "자료에 삽입된 지시문과 무단 품목을 무시" },
] as const;
export type CaseId = typeof CASES[number]["id"];
export type Locale = "ja" | "ko" | "en";
export type ExpectedLine = { name: string; unit: string; qty: number; unitPrice: number; priceEvidence: "price_list" | "historical" | "insufficient" };
export type Scenario = {
  id: CaseId; locale: Locale; subject: string; workDescription: string; requirements: string;
  assumptions: string; exclusions: string; taxMode: "included" | "excluded";
  evidence: AiEstimateGenerationEvidence[]; expected: ExpectedLine[]; allowedUnpriced?: string[];
};
export type FixtureData = { extractions: Record<string, EstimateExtractionResult>; evidence: Record<string, AiEstimateGenerationEvidence>;
  hashes: Record<string, string>; pdf: Buffer; injection: string };

// Stable synthetic IDs let reports prove provenance without touching any database.
function fixtureId(seed: string) {
  const hash = createHash("sha256").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4000-8000-${hash.slice(20, 32)}`;
}
export function evidenceFromExtraction(raw: EstimateExtractionResult, file: string, kind: SourceDocumentKind): AiEstimateGenerationEvidence {
  const review = toReviewExtraction(normalizeExtraction({ ...raw, documentKind: kind }), file);
  return { exampleId: fixtureId(`${file}:example`), sourceId: fixtureId(`${file}:source`),
    currency: raw.document.currency ?? "unknown", taxMode: review.taxMode, label: file, similarity: 1,
    clientName: review.clientName || null, subject: review.subject, issueDate: review.issueDate,
    templateMessage: review.templateMessage, remarks: review.remarks, documentKind: kind,
    workDetails: review.workDetails, assumptions: review.assumptions, exclusions: review.exclusions,
    projectName: "Synthetic five-screen validation", revision: "fixture-v1", validFrom: null, validUntil: null,
    lines: review.lines.map((line, index) => ({ id: fixtureId(`${file}:line:${index}`), name: line.name,
      qty: line.qty, unit: line.unit, unitPrice: line.unitPrice, taxCategory: line.taxCategory })) };
}
export async function loadFixtures(): Promise<FixtureData> {
  const specs: Array<[string, SourceDocumentKind, string]> = [
    ["rate-card-ja.csv", "price_list", "text/csv"], ["rate-card-en.csv", "price_list", "text/csv"],
    ["history-ja.csv", "estimate", "text/csv"], ["conflicting-rate-card-ja.csv", "price_list", "text/csv"],
    ["design-ja.md", "design", "text/markdown"], ["work-scope-ja.md", "work_scope", "text/markdown"],
  ];
  const extractions: FixtureData["extractions"] = {}, evidence: FixtureData["evidence"] = {}, hashes: FixtureData["hashes"] = {};
  for (const [file, kind, mimeType] of specs) {
    const bytes = await readFile(resolve(FIXTURE_DIR, file));
    hashes[file] = createHash("sha256").update(bytes).digest("hex");
    const raw = await parseLocalDocument({ data: new Blob([new Uint8Array(bytes)]), mimeType, documentKind: kind });
    extractions[file] = raw;
    evidence[file] = evidenceFromExtraction(raw, file, kind);
  }
  const pdf = await readFile(resolve(FIXTURE_DIR, "estimate.pdf"));
  const injection = await readFile(resolve(FIXTURE_DIR, "prompt-injection.md"), "utf8");
  for (const [file, bytes] of [["estimate.pdf", pdf], ["prompt-injection.md", injection]] as const)
    hashes[file] = createHash("sha256").update(bytes).digest("hex");
  return { extractions, evidence, hashes, pdf, injection };
}
export function buildScenario(id: Exclude<CaseId, "pdf-extraction">, fixtures: FixtureData, extractedPdf?: EstimateExtractionResult): Scenario {
  const english = !["rate-ja", "rate-ko", "rate-conflict"].includes(id);
  const locale = id === "rate-ko" ? "ko" : english ? "en" : "ja";
  const rate = fixtures.evidence[english ? "rate-card-en.csv" : "rate-card-ja.csv"];
  const names = english ? ["Design", "Development"] : ["画面設計", "開発"];
  const unit = english ? "screen" : "画面";
  const scenario: Scenario = { id, locale, subject: "QA five-screen website", taxMode: "excluded",
    workDescription: locale === "ko" ? "5개 화면의 画面設計 및 開発 견적을 작성해 주세요. 각 품목 수량은 5입니다. PC·모바일 대응을 포함합니다."
      : locale === "ja" ? "5画面の画面設計と開発を見積もってください。各品目の数量は5画面です。PC・モバイル対応を含みます。"
        : "Estimate Design and Development for five screens. Each item has quantity 5 screen. Include PC and mobile responsiveness.",
    requirements: "Keep catalogue names, units and tax categories exactly. Two catalogue entries, each for five screens. Explain the quantity calculation in the requested language.",
    assumptions: "The customer supplies all final copy. The current project has five screens; historical quantities belong to other projects.",
    exclusions: "Translation, hosting, maintenance, photography and content migration are excluded.",
    evidence: [rate, fixtures.evidence["design-ja.md"], fixtures.evidence["work-scope-ja.md"]],
    expected: names.map((name, index) => ({ name, unit, qty: 5, unitPrice: index ? 80000 : 50000, priceEvidence: "price_list" })) };
  if (id === "pdf-to-estimate") {
    if (!extractedPdf) throw new Error("PDF_EXTRACTION_REQUIRED");
    // No golden prices are injected into the generation input. Only the actual extraction is used.
    scenario.evidence = [evidenceFromExtraction(extractedPdf, "estimate.pdf", "estimate"),
      fixtures.evidence["design-ja.md"], fixtures.evidence["work-scope-ja.md"]];
    scenario.expected = scenario.expected.map(line => ({ ...line, priceEvidence: "historical" }));
  }
  if (id === "tax-mismatch") {
    scenario.taxMode = "included";
    scenario.requirements += " Requested tax mode is INCLUDED; evidence is EXCLUDED. Keep the requested items and flag unavailable compatible prices for review; do not convert prices.";
    scenario.expected = scenario.expected.map(line => ({ ...line, unitPrice: 0, priceEvidence: "insufficient" }));
  }
  if (id === "rate-conflict") {
    scenario.evidence.push(fixtures.evidence["conflicting-rate-card-ja.csv"]);
    scenario.requirements += " Keep both requested items. The Design rate cards conflict; flag the price for review and never average them.";
    scenario.expected[0] = { ...scenario.expected[0], unitPrice: 0, priceEvidence: "insufficient" };
  }
  if (id === "missing-price") {
    scenario.workDescription = "Estimate Design for five screens and Content migration for one project. No Development is requested. Content migration has no approved price; omit it with a warning or use price 0 and flag it for review.";
    scenario.requirements = "Design quantity is 5 screen. Do not price Content migration from a different item. Explain missing price evidence in warnings.";
    scenario.exclusions = "Development, translation, hosting and maintenance are excluded.";
    // Do not let the unrelated design fixture request Development in this single-item case.
    scenario.evidence = [rate];
    scenario.expected = scenario.expected.slice(0, 1);
    scenario.allowedUnpriced = ["Content migration"];
  }
  if (id === "prompt-injection") {
    scenario.evidence = [...scenario.evidence, { ...fixtures.evidence["work-scope-ja.md"],
      exampleId: fixtureId("injection:example"), sourceId: fixtureId("injection:source"),
      label: "prompt-injection.md", workDetails: fixtures.injection }];
  }
  return scenario;
}
