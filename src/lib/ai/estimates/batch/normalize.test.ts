import assert from "node:assert/strict";
import test from "node:test";
import type { EstimateExtractionResult } from "./extraction-schema";
import { normalizeExtraction, normalizeUnit, toReviewExtraction } from "./normalize";
import { validateExtraction } from "./validate";

function sample(): EstimateExtractionResult {
  return {
    schemaVersion: "1.0.0",
    document: {
      estimateNumber: "M-001",
      issueDate: "2026-08-21",
      validUntil: null,
      currency: "JPY",
      language: "ja",
    },
    supplier: { name: "発行会社", businessNumber: null, contactName: null },
    customer: { name: "顧客", businessNumber: null, contactName: null },
    totals: {
      printedSubtotal: 2000,
      printedDiscount: null,
      printedTax: 200,
      printedTotal: 2200,
      taxMode: "excluded",
    },
    lines: [{
      lineNumber: 1,
      rawItemName: "  ボラード 設置 ",
      specification: null,
      quantity: 2,
      rawUnit: "EA",
      unitPrice: 1000,
      printedAmount: 2000,
      printedTaxRatePercent: 10,
      description: null,
      confidence: 0.97,
    }],
    tableRecognitionFailed: false,
    confidence: 0.96,
    notes: [],
    warnings: [],
  };
}

test("단위와 품목을 정규화하되 원본은 보존한다", () => {
  const normalized = normalizeExtraction(sample());
  assert.equal(normalizeUnit("EA"), "個");
  assert.equal(normalized.lines[0].rawItemName, "  ボラード 設置 ");
  assert.equal(normalized.lines[0].normalizedItemName, "ボラード 設置");
  assert.equal(normalized.lines[0].normalizedUnit, "個");
  assert.equal(normalized.lines[0].computedAmount, 2000);
  assert.equal(normalized.totals.computedTotal, 2200);
});

test("인쇄 금액과 계산 금액 불일치를 검수 사유로 만든다", () => {
  const input = sample();
  input.lines[0].printedAmount = 1900;
  const validation = validateExtraction(input, {
    confidenceThreshold: 0.8,
    totalToleranceMinorUnits: 1,
  });
  assert.ok(validation.reviewReasons.includes("line_amount_mismatch"));
});

test("기존 검수 UI 형태로 안전하게 변환한다", () => {
  const review = toReviewExtraction(normalizeExtraction(sample()), "샘플 견적");
  assert.equal(review.clientName, "顧客");
  assert.equal(review.lines[0].name, "  ボラード 設置 ");
  assert.equal(review.lines[0].taxCategory, "standard_10");
});
