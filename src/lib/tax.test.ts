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

  assert.deepEqual(totals, { subtotal: 0, tax: 0, withholding: 0, total: 0, breakdown: [] });
});

test("税込表示 extracts tax without adding it to the payable amount", () => {
  const totals = computeDocumentTotals([{ qty: 1, unitPrice: 1100, taxCategory: "standard_10" }], "round_down", { taxDisplay: "included" });
  assert.equal(totals.subtotal, 1100);
  assert.equal(totals.tax, 100);
  assert.equal(totals.total, 1100);
});

test("免税 and delivery-note tax deferred until invoicing do not charge tax", () => {
  const lines = [{ qty: 1, unitPrice: 1000, taxCategory: "standard_10" as const }];
  assert.equal(computeDocumentTotals(lines, "round_down", { taxDisplay: "exempt" }).total, 1000);
  assert.equal(computeDocumentTotals(lines, "round_down", { taxDisplay: "separate_on_invoice", documentType: "delivery_note" }).tax, 0);
  assert.equal(computeDocumentTotals(lines, "round_down", { taxDisplay: "separate_on_invoice", documentType: "invoice" }).total, 1100);
});

test("withholding uses both brackets and excludes exempt line items", () => {
  const lines = [
    { qty: 1, unitPrice: 1_200_000, taxCategory: "standard_10" as const },
    { qty: 1, unitPrice: 300_000, taxCategory: "standard_10" as const, withholdingExempt: true },
  ];
  const totals = computeDocumentTotals(lines, "round_up", { withholdingType: "with_recovery" });
  assert.equal(totals.withholding, 102_100 + 40_840);
  assert.equal(totals.total, 1_650_000 - 142_940);
  assert.equal(computeDocumentTotals(lines, "round_down", { withholdingType: "without_recovery" }).withholding, 140_000);
});

test("decimal quantities use exact yen arithmetic instead of floating point", () => {
  const totals = computeDocumentTotals([{ qty: 0.29, unitPrice: 100, taxCategory: "standard_10" }]);
  assert.equal(totals.subtotal, 29);
  assert.equal(totals.tax, 2);
  const wholeTax = computeDocumentTotals([{ qty: 3, unitPrice: 100, taxCategory: "standard_8" }], "round_up");
  assert.equal(wholeTax.tax, 24);
});

test("company default and explicit 10 percent share the same rounding bucket", () => {
  const totals = computeDocumentTotals([
    { qty: 1, unitPrice: 5, taxCategory: "follow_company" },
    { qty: 1, unitPrice: 5, taxCategory: "standard_10" },
  ]);
  assert.equal(totals.tax, 1);
});

test("discount rows reduce the matching tax bucket and withholding base", () => {
  const totals = computeDocumentTotals([
    { qty: 1, unitPrice: 100_000, taxCategory: "standard_10" },
    { qty: 1, unitPrice: -24_000, taxCategory: "standard_10" },
  ], "round_down", { withholdingType: "with_recovery" });
  assert.equal(totals.subtotal, 76_000);
  assert.equal(totals.tax, 7_600);
  assert.equal(totals.withholding, 7_759);
  assert.equal(totals.total, 75_841);
});

test("a negative tax bucket must not be silently discarded", () => {
  const lines = [
    { qty: 1, unitPrice: 1000, taxCategory: "exempt" as const },
    { qty: 1, unitPrice: -15, taxCategory: "standard_10" as const },
  ];
  assert.equal(computeDocumentTotals(lines, "round_down").tax, -2);
  assert.equal(computeDocumentTotals(lines, "round_up").tax, -1);
  assert.equal(computeDocumentTotals(lines, "round_half").tax, -2);
});

test("equal rates are rounded once even across legacy and reduced categories", () => {
  assert.equal(computeDocumentTotals([
    { qty: 1, unitPrice: 7, taxCategory: "standard_8" },
    { qty: 1, unitPrice: 7, taxCategory: "reduced_8" },
  ]).tax, 1);
});
