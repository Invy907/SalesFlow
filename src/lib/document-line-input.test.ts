import assert from "node:assert/strict";
import test from "node:test";
import { documentLineQuantity, isBlankDocumentLine, parseDocumentNumber } from "./documents/line-form-values";
import { computeDocumentTotals } from "./tax";

const empty = { name: "", qty: "", unit: "", price: "" };

test("blank document rows stay zero but a priced row defaults to one unit", () => {
  assert.equal(isBlankDocumentLine({ ...empty, name: "  " }), true);
  assert.equal(documentLineQuantity(empty), 0);
  assert.equal(documentLineQuantity({ ...empty, name: "Service", price: "1,000" }), 1);
  assert.equal(documentLineQuantity({ ...empty, name: "Service", qty: "0", price: "1,000" }), 0);
});

test("formatted and fractional quantities give the same preview and saved totals", () => {
  const row = { name: "Service", qty: "1,000.5", unit: "h", price: "1,200" };
  const totals = computeDocumentTotals([{
    qty: documentLineQuantity(row), unitPrice: parseDocumentNumber(row.price), taxCategory: "standard_10",
  }], "round_half");
  assert.deepEqual([totals.subtotal, totals.tax, totals.total], [1_200_600, 120_060, 1_320_660]);
});

test("blank-quantity preview honors tax-inclusive amounts and withholding exclusions", () => {
  const row = { ...empty, name: "Service", price: "1,100" };
  const totals = computeDocumentTotals([{
    qty: documentLineQuantity(row), unitPrice: parseDocumentNumber(row.price), taxCategory: "standard_10", withholdingExempt: true,
  }], "round_down", { taxDisplay: "included", withholdingType: "with_recovery" });
  assert.deepEqual([totals.tax, totals.withholding, totals.total], [100, 0, 1100]);
});
