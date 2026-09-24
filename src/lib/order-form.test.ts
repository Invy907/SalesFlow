import assert from "node:assert/strict";
import test from "node:test";
import { orderFormDraftSchema } from "./validators/order-form";

const valid = {
  name: "Example client", subject: "Monthly order", expirationMode: "none" as const,
  lines: [{ name: "Design", unit: "hour", unitPrice: 1000, taxCategory: "standard_10" as const }],
};

test("order drafts require a client, subject and at least one named item", () => {
  assert.equal(orderFormDraftSchema.safeParse(valid).success, true);
  for (const invalid of [{ ...valid, name: " " }, { ...valid, subject: " " }, { ...valid, lines: [] }, { ...valid, lines: [{ ...valid.lines[0], name: " " }] }]) {
    assert.equal(orderFormDraftSchema.safeParse(invalid).success, false);
  }
});

test("order draft unit prices must fit nonnegative whole-yen storage", () => {
  for (const unitPrice of [-1, 1.5, NaN, Infinity, 1_000_000_000]) {
    assert.equal(orderFormDraftSchema.safeParse({ ...valid, lines: [{ ...valid.lines[0], unitPrice }] }).success, false);
  }
  assert.equal(orderFormDraftSchema.safeParse({ ...valid, lines: [{ ...valid.lines[0], unitPrice: 0 }] }).success, true);
});

test("date expiration requires a real calendar date", () => {
  for (const expirationDate of [undefined, "", "2026-02-30", "2026-13-01", "not a date"]) {
    assert.equal(orderFormDraftSchema.safeParse({ ...valid, expirationMode: "date", expirationDate }).success, false);
  }
  assert.equal(orderFormDraftSchema.safeParse({ ...valid, expirationMode: "date", expirationDate: "2028-02-29" }).success, true);
});
