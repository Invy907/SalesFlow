import assert from "node:assert/strict";
import test from "node:test";
import { computeDocumentTotals } from "./tax";

test("세액은 세율 그룹별로 한 번만 단수처리한다", () => {
  const totals = computeDocumentTotals([
    { qty: 3, unitPrice: 333, taxCategory: "standard_10" },
    { qty: 1, unitPrice: 1, taxCategory: "standard_10" },
  ]);

  // 999 + 1 = 1000 → 세액 100. 행별로 절사하면 99 + 0 = 99 가 되어 1엔이 어긋난다.
  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.tax, 100);
  assert.equal(totals.total, 1100);
});

test("세율이 다르면 그룹을 나눠 각각 단수처리한다", () => {
  const totals = computeDocumentTotals([
    { qty: 1, unitPrice: 1005, taxCategory: "standard_10" },
    { qty: 1, unitPrice: 1005, taxCategory: "reduced_8" },
  ]);

  assert.equal(totals.subtotal, 2010);
  assert.equal(totals.tax, 100 + 80);
  assert.deepEqual(
    totals.breakdown.map((entry) => [entry.taxCategory, entry.rate, entry.taxAmount]),
    [
      ["standard_10", 0.1, 100],
      ["reduced_8", 0.08, 80],
    ],
  );
});

test("반올림 방식을 문서 설정대로 적용한다", () => {
  const lines = [{ qty: 1, unitPrice: 1005, taxCategory: "standard_10" as const }];

  assert.equal(computeDocumentTotals(lines, "round_down").tax, 100);
  assert.equal(computeDocumentTotals(lines, "round_up").tax, 101);
  assert.equal(computeDocumentTotals(lines, "round_half").tax, 101);
});

test("과세 대상이 아닌 행은 세액에 기여하지 않는다", () => {
  const totals = computeDocumentTotals([
    { qty: 2, unitPrice: 500, taxCategory: "exempt" },
    { qty: 1, unitPrice: 1000, taxCategory: "standard_10" },
  ]);

  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.tax, 100);
  assert.equal(totals.breakdown.find((entry) => entry.taxCategory === "exempt")?.taxAmount, 0);
});

test("명세가 없으면 합계는 0이다", () => {
  const totals = computeDocumentTotals([]);

  assert.deepEqual(totals, { subtotal: 0, tax: 0, total: 0, breakdown: [] });
});
