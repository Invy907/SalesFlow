import assert from "node:assert/strict";
import test from "node:test";
import { documentSummaryRows } from "./documents/summary-rows";
import { mapSalesDocumentDetail } from "./documents/map-document-detail";

const labels = { subtotal: "小計", tax: "消費税", total: "合計" };

test("included tax and withholding are explicit in the shared print/export summary", () => {
  assert.deepEqual(documentSummaryRows({
    subtotal: 1100, tax: 100, withholding: 112, total: 988, taxDisplay: "included", outputLocale: "ja",
  }, labels), [["小計", 1100], ["うち消費税", 100], ["源泉徴収税", -112], ["合計", 988]]);
  assert.deepEqual(documentSummaryRows({
    subtotal: 1000, tax: 0, total: 1000, taxDisplay: "exempt", outputLocale: "ja",
  }, labels), [["小計", 1000], ["合計", 1000]]);
});

test("saved documents preserve names and amounts after master data changes", () => {
  const detail = mapSalesDocumentDetail({
    id: "document", clients: { name: "Renamed client" }, recipient_snapshot: { clientName: "Saved client" },
    sender_snapshot: { companyName: "Saved sender" }, tax_display: "included", withholding_amount: 112,
    subtotal: 1100, tax_amount: 100, total: 988,
  }, [], { companyName: "Renamed sender", tel: "", email: "" });
  assert.equal(detail.clientName, "Saved client");
  assert.equal(detail.sender.companyName, "Saved sender");
  assert.equal(detail.taxDisplay, "included");
  assert.equal(detail.withholding, 112);
  assert.equal(detail.total, 988);
});

test("mixed tax rates keep their categories and rounded breakdown in exports", () => {
  const detail = mapSalesDocumentDetail({
    id: "mixed", output_locale: "ja", tax_display: "separate", tax_rounding: "round_up",
    subtotal: 2010, tax_amount: 182, total: 2192,
  }, [
    { name_snapshot: "Standard", qty: 1, unit_price_snapshot: 1005, tax_category: "standard_10" },
    { name_snapshot: "Reduced", qty: 1, unit_price_snapshot: 1005, tax_category: "reduced_8" },
  ], { companyName: "Sender", tel: "", email: "" });
  assert.equal(detail.lines[1].taxCategory, "reduced_8");
  assert.deepEqual(documentSummaryRows(detail, labels), [
    ["小計", 2010], ["10% 対象額", 1005], ["10% 消費税", 101],
    ["8% ※ 対象額", 1005], ["8% ※ 消費税", 81], ["消費税", 182], ["合計", 2192],
  ]);
});
