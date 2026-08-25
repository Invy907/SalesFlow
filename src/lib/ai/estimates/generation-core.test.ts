import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiEstimateGenerationContext,
  groundAiGeneratedEstimate,
  isPlausibleOpenAiApiKey,
  type AiEstimateGenerationEvidence,
} from "./generation-core";

const evidence: AiEstimateGenerationEvidence[] = [{
  exampleId: "00000000-0000-4000-8000-000000000001",
  label: "2026-08-01 · A사 · 웹 제작",
  similarity: 0.9,
  clientName: "A사",
  subject: "A사 채용 사이트",
  issueDate: "2026-08-01",
  templateMessage: "A사 요청에 따라 견적드립니다.",
  remarks: "A사 담당자 확인 필요",
  lines: [{ name: "웹 디자인", qty: 1, unit: "식", unitPrice: 300000, taxCategory: "standard_10" }],
}];

test("placeholder API 키를 연결 완료로 판단하지 않는다", () => {
  assert.equal(isPlausibleOpenAiApiKey("여기에_API_키_입력"), false);
  assert.equal(isPlausibleOpenAiApiKey("sk-proj-abcdefghijklmnopqrstuvwxyz123456"), true);
});

test("외부 AI 문맥에서 거래처명과 내부 식별자를 제거한다", () => {
  const context = buildAiEstimateGenerationContext({
    clientName: "A사",
    subject: "A사 리뉴얼",
    workDescription: "A사의 채용 페이지를 제작",
    evidence,
    priceAnchors: [],
  });
  const serialized = JSON.stringify(context);
  assert.equal(serialized.includes("A사"), false);
  assert.equal(serialized.includes(evidence[0].exampleId), false);
  assert.match(serialized, /\[CLIENT\]/);
});

test("충분한 가격 통계가 있으면 모델 가격 대신 중앙값을 사용한다", () => {
  const draft = groundAiGeneratedEstimate({
    generated: {
      subject: "채용 사이트 제작",
      lines: [{
        name: "웹 디자인",
        qty: 1,
        unit: "식",
        unitPrice: 999999,
        taxCategory: "standard_10",
        confidence: 0.9,
        reason: "과거 사례 조합",
      }],
      templateMessage: "견적드립니다.",
      remarks: "",
      evidenceIndexes: [0],
      warnings: [],
    },
    evidence,
    priceAnchors: [{
      name: "웹 디자인",
      normalizedName: "웹 디자인",
      sampleCount: 4,
      medianPrice: 320000,
      p25Price: 280000,
      p75Price: 350000,
      scope: "company",
    }],
    minimumSamples: 3,
  });
  assert.equal(draft.lines[0].unitPrice, 320000);
  assert.equal(draft.evidence[0].exampleId, evidence[0].exampleId);
});

test("승인된 가격 근거가 없는 새 품목은 단가를 0으로 만든다", () => {
  const draft = groundAiGeneratedEstimate({
    generated: {
      subject: "채용 사이트 제작",
      lines: [{
        name: "근거 없는 신규 업무",
        qty: 1,
        unit: "식",
        unitPrice: 500000,
        taxCategory: "standard_10",
        confidence: 0.9,
        reason: "모델 제안",
      }],
      templateMessage: "",
      remarks: "",
      evidenceIndexes: [0],
      warnings: [],
    },
    evidence,
    priceAnchors: [],
    minimumSamples: 3,
  });
  assert.equal(draft.lines[0].unitPrice, 0);
  assert.ok(draft.warnings.some((warning) => warning.includes("가격 근거가 없어")));
});
