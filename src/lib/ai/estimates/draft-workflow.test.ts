import assert from "node:assert/strict";
import test from "node:test";
import { tokenScore } from "./retrieval";
import { composeGroundedDraft } from "./draft-workflow";
import type { AiEstimateGenerationEvidence } from "./generation-core";
const evidence: AiEstimateGenerationEvidence = { exampleId: "00000000-0000-4000-8000-000000000001", sourceId: "00000000-0000-4000-8000-000000000002",
  currency: "JPY", taxMode: "excluded", label: "デザイン実績", similarity: 0.8, clientName: "過去の会社", subject: "旧案件",
  issueDate: "2026-01-01", templateMessage: "前の契約条件", remarks: "前の振込先", lines: [
    { id: "00000000-0000-4000-8000-000000000003", name: "デザイン", qty: 3, unit: "ページ", unitPrice: 30000, taxCategory: "standard_10" },
    { id: "00000000-0000-4000-8000-000000000004", name: "撮影", qty: 1, unit: "日", unitPrice: 90000, taxCategory: "standard_10" }] };
const input = { subject: "新しい見積", workDescription: "デザイン", locale: "ja" as const, taxMode: "excluded" as const,
  evidence: [evidence], priceAnchors: [], minimumSamples: 3, retrievalMode: "local" as const, allowExternalProcessing: false };
test("offline workflow filters unrelated lines, retains user's title and excludes historical contractual text", async () => {
  let externalCalls = 0;
  const result = await composeGroundedDraft({ ...input, generate: async () => { externalCalls++; throw new Error("must not call"); } });
  assert.equal(externalCalls, 0);
  assert.equal(result.generationMode, "local");
  assert.equal(result.draft.subject, input.subject);
  assert.deepEqual(result.draft.lines.map((line) => line.name), ["デザイン"]);
  assert.equal(result.draft.lines[0].unitPrice, 30000);
  assert.equal(result.draft.lines[0].priceEvidence, "historical");
  assert.equal(result.draft.evidence[0].sourceId, evidence.sourceId);
  assert.equal(result.draft.templateMessage, "");
  assert.equal(result.draft.remarks, "");
  assert.equal(result.draft.warnings.some((message) => /数量/.test(message)), true);
});
test("missing evidence stops before provider invocation", async () => {
  let calls = 0;
  await assert.rejects(composeGroundedDraft({ ...input, evidence: [], allowExternalProcessing: true,
    generate: async () => { calls++; throw new Error("should not run"); } }), { message: "no_evidence" });
  assert.equal(calls, 0);
});
test("provider failure gives an honest local fallback with grounded prices", async () => {
  const result = await composeGroundedDraft({ ...input, allowExternalProcessing: true, generate: async () => { throw new Error("429"); } });
  assert.equal(result.generationMode, "local");
  assert.equal(result.provider, "salesflow-approved-retrieval");
  assert.ok(result.draft.warnings.some((message) => message.includes("AIの応答")));
  assert.equal(result.draft.lines[0].unitPrice, 30000);
});
test("model output passes deterministic evidence validation and cannot invent unit prices", async () => {
  const result = await composeGroundedDraft({ ...input, allowExternalProcessing: true, generate: async () => ({
    provider: "gemini", model: "synthetic-contract", generated: { subject: "モデルが変えた件名", lines: [
      { name: "デザイン", qty: 2, unit: "ページ", unitPrice: 1, taxCategory: "standard_10", confidence: 1, reason: "" },
      { name: "不明な保守サービス", qty: 1, unit: "年", unitPrice: 999999, taxCategory: "standard_10", confidence: 1, reason: "" }],
      templateMessage: "知らない契約", remarks: "前の納期", evidenceIndexes: [9], warnings: [] } }) });
  assert.equal(result.generationMode, "model");
  assert.equal(result.draft.subject, input.subject);
  assert.equal(result.draft.lines[0].unitPrice, 30000);
  assert.equal(result.draft.lines[1].unitPrice, 0);
  assert.equal(result.draft.lines[1].priceEvidence, "insufficient");
  assert.equal(result.draft.lines[1].confidence, 0);
  assert.equal(result.draft.remarks, "");
});
test("tax inclusion mismatch never copies a price into the new estimate", async () => {
  const result = await composeGroundedDraft({ ...input, taxMode: "included" });
  assert.equal(result.draft.lines[0].unitPrice, 0);
  assert.equal(result.draft.retrieval?.insufficientLines, 1);
});

const rateCard = (number: number, name: string, unit = "画面", taxMode: "included" | "excluded" = "excluded"): AiEstimateGenerationEvidence => ({
  ...evidence, exampleId: `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
  sourceId: `20000000-0000-4000-8000-${String(number).padStart(12, "0")}`, documentKind: "price_list", taxMode,
  lines: [{ ...evidence.lines[0], id: `30000000-0000-4000-8000-${String(number).padStart(12, "0")}`, name, unit, qty: 7, unitPrice: number * 1000 }],
});

test("offline workflow combines relevant items from multiple selected rate cards", async () => {
  const result = await composeGroundedDraft({ ...input, subject: "Design Development", workDescription: "Design Development",
    evidence: [rateCard(1, "Design"), rateCard(2, "Development")] });
  assert.deepEqual(result.draft.lines.map(line => [line.name, line.unitPrice, line.qty]), [["Design", 1000, 1], ["Development", 2000, 1]]);
  assert.equal(result.draft.evidence.length, 2);
});

test("without a keyword match, all rate cards remain candidates and units/taxes stay distinct", async () => {
  const differentTax = rateCard(3, "Design", "画面");
  differentTax.lines[0].taxCategory = "exempt";
  const result = await composeGroundedDraft({ ...input, subject: "Unrelated", workDescription: "Unrelated",
    evidence: [rateCard(1, "Design", "画面"), rateCard(2, "Design", "時間"), differentTax] });
  assert.deepEqual(result.draft.lines.map(line => [line.unit, line.taxCategory, line.unitPrice]),
    [["画面", "standard_10", 1000], ["時間", "standard_10", 2000], ["画面", "exempt", 3000]]);
});

test("duplicate items are not added twice when source tax modes differ", async () => {
  const result = await composeGroundedDraft({ ...input, subject: "Design", workDescription: "Design",
    evidence: [rateCard(1, "Design", "画面", "included"), rateCard(2, "Design", "画面", "excluded")] });
  assert.equal(result.draft.lines.length, 1);
  assert.equal(result.draft.lines[0].unitPrice, 2000);
});

test("matching historical items span sources while unmatched historical fallback remains one document", async () => {
  const first = { ...rateCard(1, "Design"), documentKind: "estimate" as const };
  const second = { ...rateCard(2, "Development"), documentKind: "estimate" as const };
  const matched = await composeGroundedDraft({ ...input, subject: "Design Development", workDescription: "Design Development", evidence: [first, second] });
  assert.deepEqual(matched.draft.lines.map(line => line.name), ["Design", "Development"]);
  const fallback = await composeGroundedDraft({ ...input, subject: "Unrelated", workDescription: "Unrelated", evidence: [first, second] });
  assert.deepEqual(fallback.draft.lines.map(line => line.name), ["Design"]);
});

test("oversized provider context gives a specific actionable fallback warning", async () => {
  const result = await composeGroundedDraft({ ...input, locale: "ko", allowExternalProcessing: true,
    generate: async () => { throw Object.assign(new Error("Too large"), { code: "context_limit" }); } });
  assert.equal(result.generationMode, "local");
  assert.equal(result.draft.lines[0].unitPrice, 30000);
  assert.ok(result.draft.warnings.some(warning => warning.includes("자료 선택을 줄여")));
  assert.ok(!result.draft.warnings.some(warning => warning.includes("AI 응답을 가져오지 못해")));
});

test("a short CJK item explicitly named with another item is retained from one rate card", async () => {
  const table = { ...rateCard(1, "画面設計"), lines: [
    ...rateCard(1, "画面設計").lines, ...rateCard(2, "開発").lines, ...rateCard(3, "撮影").lines,
  ] };
  const description = "画面設計と開発。税込で確認。";
  assert.ok(tokenScore(description, "開発") < 0.15);
  const result = await composeGroundedDraft({ ...input, subject: "", workDescription: description,
    taxMode: "included", evidence: [table] });
  assert.deepEqual(result.draft.lines.map(line => line.name), ["画面設計", "開発"]);
  assert.ok(result.draft.lines.every(line => line.unitPrice === 0)); // Still no tax-mode conversion.
});

test("long Japanese and Korean requirements retain named short items without unrelated candidates", async () => {
  const cases = [
    { locale: "ja" as const, names: ["画面設計", "開発", "撮影"], requirements: "今回の依頼は画面設計と開発です。納品形式は既存環境との互換性を重視し、公開予定日までに担当者との確認と品質検証を行います。操作説明については別途打合せを行って確定してください。" },
    { locale: "ko" as const, names: ["화면설계", "개발", "촬영"], requirements: "이번 요청에는 화면설계와 개발을 포함합니다. 기존 환경의 호환성을 확인하고 납품 일정에 맞춰 담당자 검토 및 품질 검증을 진행합니다. 사용 설명과 최종 결과물의 전달 방법은 별도 회의에서 결정해 주세요." },
  ];
  for (const { locale, names, requirements } of cases) {
    const table = { ...rateCard(1, names[0]), lines: names.flatMap((name, index) => rateCard(index + 1, name).lines) };
    assert.ok(tokenScore(requirements, names[1]) < 0.15);
    assert.equal(tokenScore(names[2], requirements), 0);
    const result = await composeGroundedDraft({ ...input, locale, subject: "", workDescription: "", requirements, evidence: [table] });
    assert.deepEqual(result.draft.lines.map(line => line.name), names.slice(0, 2));
    assert.deepEqual(result.draft.lines.map(line => line.unitPrice), [1000, 2000]);
  }
});
