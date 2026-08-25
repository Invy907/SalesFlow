import assert from "node:assert/strict";
import test from "node:test";
import { parseExtractionResult } from "./extraction-schema";

test("필수 구조가 없는 Gemini 응답을 거부한다", () => {
  const parsed = parseExtractionResult({ schemaVersion: "1.0.0" });
  assert.equal(parsed.ok, false);
});

test("날짜 형식과 신뢰도 범위를 검증한다", () => {
  const parsed = parseExtractionResult({
    schemaVersion: "1.0.0",
    document: { estimateNumber: null, issueDate: "21/08/2026", validUntil: null, currency: "JPY", language: "ja" },
    supplier: { name: null, businessNumber: null, contactName: null },
    customer: { name: null, businessNumber: null, contactName: null },
    totals: { printedSubtotal: null, printedDiscount: null, printedTax: null, printedTotal: null, taxMode: "unknown" },
    lines: [],
    tableRecognitionFailed: true,
    confidence: 2,
    notes: [],
    warnings: [],
  });
  assert.equal(parsed.ok, false);
});
