import assert from "node:assert/strict";
import test from "node:test";
import { aiGeneratedEstimateSchema, buildAiEstimateGenerationContext, groundAiGeneratedEstimate, isPlausibleOpenAiApiKey,
  type AiEstimateGenerationEvidence, type AiEstimatePriceAnchor, type AiGeneratedEstimate } from "./generation-core";
import { aiEstimateDraftSchema } from "./schemas";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const evidence: AiEstimateGenerationEvidence = {
  exampleId: uuid(1), sourceId: uuid(2), currency: "JPY", taxMode: "excluded", label: "웹 제작", similarity: 0.9,
  clientName: "A사", subject: "A사 채용 사이트", issueDate: "2026-08-01", templateMessage: "A사 견적", remarks: "",
  lines: [{ id: uuid(3), name: "웹 디자인", qty: 1, unit: "식", unitPrice: 300000, taxCategory: "standard_10" }],
};
const generated: AiGeneratedEstimate = {
  subject: "웹 제작", lines: [{ name: "웹 디자인", qty: 1, unit: "식", unitPrice: 999999, taxCategory: "standard_10", confidence: 0.9, reason: "과거 사례" }],
  templateMessage: "", remarks: "", evidenceIndexes: [9], warnings: [],
};
const anchor: AiEstimatePriceAnchor = {
  name: "웹 디자인", normalizedName: "웹 디자인", sampleCount: 4, medianPrice: 320000, p25Price: 280000, p75Price: 350000,
  scope: "company", unit: "식", taxCategory: "standard_10", currency: "JPY", taxMode: "excluded",
  exampleIds: [uuid(1), uuid(4)], lineIds: [uuid(3), uuid(5)], sources: [{ exampleId: uuid(4), sourceId: uuid(6), label: "통계 원본" }],
};
function ground(options: Partial<Parameters<typeof groundAiGeneratedEstimate>[0]> = {}) {
  return groundAiGeneratedEstimate({ generated, evidence: [evidence], priceAnchors: [], minimumSamples: 3, ...options });
}

test("API 키 placeholder를 연결로 판단하지 않는다", () => {
  assert.equal(isPlausibleOpenAiApiKey("여기에_API_키_입력"), false);
  assert.equal(isPlausibleOpenAiApiKey("sk-proj-abcdefghijklmnopqrstuvwxyz123456"), true);
});
test("줄·단위·가격근거·시장문맥까지 개인정보와 내부ID가 외부 프롬프트에서 제거된다", () => {
  const context = buildAiEstimateGenerationContext({ clientName: "A사", subject: "A사 리뉴얼", workDescription: "sales@example.com 03-1234-5678",
    evidence: [{ ...evidence, lines: [{ ...evidence.lines[0], name: "A사 로고", unit: "A사 식" }] }],
    priceAnchors: [{ ...anchor, name: "A사 디자인", unit: "A사 식" }], marketResearch: { summary: "A사 공개 조사" } });
  const serialized = JSON.stringify(context);
  for (const secret of ["A사", "sales@example.com", "03-1234-5678", uuid(1), uuid(2), uuid(3), uuid(4)]) assert.equal(serialized.includes(secret), false);
});
test("충분한 동일 기준 통계 중앙값과 실제 통계 출처를 사용한다", () => {
  const draft = ground({ priceAnchors: [anchor] });
  assert.equal(draft.lines[0].unitPrice, 320000);
  assert.equal(draft.lines[0].priceEvidence, "statistical");
  assert.deepEqual(draft.lines[0].evidenceLineIds, anchor.lineIds);
  assert.equal(draft.evidence.find((item) => item.exampleId === uuid(4))?.sourceId, uuid(6));
  assert.equal(draft.lines[0].priceRange?.sampleCount, 4);
  assert.ok(aiEstimateDraftSchema.safeParse(draft).success);
});
test("단위·세율·통화·내외세가 다른 가격 통계는 사용하지 않는다", () => {
  for (const mismatch of [{ unit: "시간" }, { taxCategory: "reduced_8" as const }, { currency: "USD" }, { taxMode: "included" as const }]) {
    const draft = ground({ evidence: [], priceAnchors: [{ ...anchor, ...mismatch }] });
    assert.equal(draft.lines[0].priceEvidence, "insufficient");
  }
});
test("표본 0가격·빈 출처·부족한 표본은 검증 통계로 취급하지 않는다", () => {
  for (const invalid of [{ medianPrice: 0 }, { medianPrice: NaN }, { exampleIds: [] }, { lineIds: [] }, { sampleCount: 1 }]) {
    assert.equal(ground({ evidence: [], priceAnchors: [{ ...anchor, ...invalid }] }).lines[0].priceEvidence, "insufficient");
  }
});
test("가격은 모델이 선호한 수치와 무관하게 가장 관련성 높은 실제 행에서 정한다", () => {
  const alternative = { ...evidence, exampleId: uuid(8), sourceId: uuid(9), similarity: 0.7,
    lines: [{ ...evidence.lines[0], id: uuid(10), unitPrice: 999999 }] };
  const draft = ground({ evidence: [alternative, evidence] });
  assert.equal(draft.lines[0].unitPrice, 300000);
  assert.equal(draft.lines[0].priceEvidence, "historical");
  assert.deepEqual(draft.evidence.map((item) => item.exampleId), [uuid(1)]);
});
test("넓은 단어 겹침과 무관한 모델 citation으로 가격을 꾸미지 않는다", () => {
  const draft = ground({ generated: { ...generated, lines: [{ ...generated.lines[0], name: "웹 디자인 유지보수" }], evidenceIndexes: [0] } });
  assert.equal(draft.lines[0].priceEvidence, "insufficient");
  assert.equal(draft.lines[0].confidence, 0);
  assert.deepEqual(draft.evidence, []);
  assert.equal(draft.retrieval?.insufficientLines, 1);
});
test("승인 할인행은 정확한 품목·단위·세율일 때 음수단가를 보존한다", () => {
  const discount = { ...evidence, lines: [{ ...evidence.lines[0], name: "割引", unitPrice: -24000 }] };
  const proposed = { ...generated, lines: [{ ...generated.lines[0], name: "割引", unitPrice: -99999 }] };
  assert.equal(ground({ generated: proposed, evidence: [discount] }).lines[0].unitPrice, -24000);
  assert.equal(ground({ generated: { ...proposed, lines: [{ ...proposed.lines[0], unit: "時間" }] }, evidence: [discount] }).lines[0].priceEvidence, "insufficient");
});
test("미확정 과세·0수량·0단가·낮은 관련성은 historical 근거에서 배제한다", () => {
  for (const invalid of [{ ...evidence, taxMode: "unknown" as const }, { ...evidence, similarity: 0.1 },
    { ...evidence, lines: [{ ...evidence.lines[0], qty: 0 }] }, { ...evidence, lines: [{ ...evidence.lines[0], unitPrice: 0 }] }]) {
    assert.equal(ground({ evidence: [invalid] }).lines[0].priceEvidence, "insufficient");
  }
});
test("생성 스키마는 수량 0과 비정상 숫자를 거절하고 근거 없는 구성을 허용한다", () => {
  assert.ok(aiGeneratedEstimateSchema.safeParse({ ...generated, evidenceIndexes: [] }).success);
  assert.equal(aiGeneratedEstimateSchema.safeParse({ ...generated, lines: [{ ...generated.lines[0], qty: 0 }] }).success, false);
  assert.equal(aiGeneratedEstimateSchema.safeParse({ ...generated, lines: [{ ...generated.lines[0], unitPrice: Infinity }] }).success, false);
});

test("가격 근거 설명은 요청 언어를 따른다", () => {
  const unsupported = { ...generated, lines: [{ ...generated.lines[0], name: "未検証" }] };
  assert.match(ground({ generated: unsupported, locale: "ja" }).warnings[0], /価格根拠/);
  assert.match(ground({ generated: unsupported, locale: "en" }).warnings[0], /No approved price evidence/);
  assert.match(ground({ priceAnchors: [anchor], locale: "ja" }).lines[0].reason, /中央値/);
});

test("회사 기본세율만 기록되어 실제 과거세율을 모르면 가격 근거에서 제외한다", () => {
  const draft = ground({ generated: { ...generated, lines: [{ ...generated.lines[0], taxCategory: "follow_company" }] },
    evidence: [{ ...evidence, lines: [{ ...evidence.lines[0], taxCategory: "follow_company" }] }],
    priceAnchors: [{ ...anchor, taxCategory: "follow_company" }] });
  assert.equal(draft.lines[0].priceEvidence, "insufficient");
});
