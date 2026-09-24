import assert from "node:assert/strict";
import test from "node:test";
import { createEstimateSchema, createInvoiceSchema, createDeliveryNoteSchema, createReceiptSchema } from "./validators/document";

const valid = {
  issueDate: new Date("2026-09-22"), taxDisplay: "separate", taxRounding: "round_down", withholdingType: "none",
  lineItems: [{ name: "Service", qty: 1, unitPrice: 1000, taxCategory: "standard_10", taxRateSnapshot: 0.1 }],
};

test("all document create/edit schemas reject entirely empty detail rows", () => {
  for (const schema of [createEstimateSchema, createInvoiceSchema, createDeliveryNoteSchema, createReceiptSchema]) {
    assert.equal(schema.safeParse({ ...valid, lineItems: [{ ...valid.lineItems[0], name: " ", qty: 0, unitPrice: 0 }] }).success, false);
    assert.equal(schema.safeParse(valid).success, true);
  }
});

test("intentional blank spacing rows are preserved alongside a real line", () => {
  const parsed = createEstimateSchema.parse({ ...valid, lineItems: [...valid.lineItems, { ...valid.lineItems[0], name: "", qty: 0, unitPrice: 0 }] });
  assert.equal(parsed.lineItems.length, 2);
});

test("date validation rejects absent and impossible calendar dates", () => {
  for (const issueDate of [null, false, "2026-02-30", "not a date", ""]) {
    assert.equal(createInvoiceSchema.safeParse({ ...valid, issueDate }).success, false);
  }
  assert.equal(createInvoiceSchema.safeParse({ ...valid, issueDate: "2026-09-22" }).success, true);
});

test("quantities match persisted four-decimal precision and money stays safe", () => {
  assert.equal(createEstimateSchema.safeParse({ ...valid, lineItems: [{ ...valid.lineItems[0], qty: 0.00001 }] }).success, false);
  assert.equal(createEstimateSchema.safeParse({ ...valid, lineItems: [{ ...valid.lineItems[0], qty: 0.1234 }] }).success, true);
  assert.equal(createEstimateSchema.safeParse({ ...valid, lineItems: [{ ...valid.lineItems[0], qty: 2, unitPrice: Number.MAX_SAFE_INTEGER }] }).success, false);
});

test("negative unit prices support discounts but the document subtotal stays nonnegative", () => {
  assert.equal(createInvoiceSchema.safeParse({ ...valid, lineItems: [
    valid.lineItems[0], { ...valid.lineItems[0], name: "Discount", unitPrice: -240 },
  ] }).success, true);
  assert.equal(createInvoiceSchema.safeParse({ ...valid, lineItems: [
    { ...valid.lineItems[0], name: "Discount only", unitPrice: -240 },
  ] }).success, false);
});
