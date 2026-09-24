import assert from "node:assert/strict";
import test from "node:test";
import { currentMonthKey, summarizeCollections } from "./db/reports";
import { collectAllRows } from "./db/paginate";

test("report month uses the Japanese business date at UTC month boundaries", () => {
  assert.equal(currentMonthKey(new Date("2026-09-30T15:00:00Z")), "2026-10");
});

test("collections keeps all pages and separates unregistered recipient snapshots", async () => {
  const invoices = Array.from({ length: 1201 }, (_, index) => ({
    client_id: null, clients: null,
    recipient_snapshot: { clientName: index === 1200 ? "Second recipient" : "First recipient" },
    payment_due: index === 1200 ? "2026-10-01" : "2026-09-01",
    total: 1100, paid_amount: 100,
  }));
  const rows = await collectAllRows(async (from, to) => ({ data: invoices.slice(from, to + 1), error: null }));
  const report = summarizeCollections("2026-09", rows);
  assert.equal(report.rows.length, 2);
  assert.equal(report.totals.thisMonth, 1_200_000);
  assert.equal(report.totals.nextMonth, 1000);
  assert.equal(report.rows.find((row) => row.clientName === "Second recipient")?.nextMonth, 1000);
});

test("collections handles due-date buckets and excludes settled or overpaid balances", () => {
  const row = { client_id: "client", clients: { name: "Client" }, total: 1000, paid_amount: 0 };
  const report = summarizeCollections("2026-09", [
    { ...row, payment_due: "2026-08-31" },
    { ...row, payment_due: "2026-09-01" },
    { ...row, payment_due: "2026-10-01" },
    { ...row, payment_due: null },
    { ...row, payment_due: "2026-09-02", paid_amount: 1200 },
  ]);
  assert.deepEqual(report.totals, { prevUncollected: 1000, thisMonth: 1000, nextMonth: 1000, afterNext: 1000 });
});
