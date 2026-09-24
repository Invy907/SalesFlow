import assert from "node:assert/strict";
import test from "node:test";
import { collectAllRows } from "./db/paginate";
import { dashboardMonthBounds } from "./business-date";

test("aggregate loader includes rows beyond the API page cap", async () => {
  const source = Array.from({ length: 1203 }, (_, i) => ({ total: i + 1 }));
  const rows = await collectAllRows(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));
  assert.equal(rows.length, 1203);
  assert.equal(rows.reduce((sum, row) => sum + row.total, 0), 1203 * 1204 / 2);
});

test("aggregate loader rejects errors instead of showing partial totals", async () => {
  await assert.rejects(collectAllRows(async (from) => from === 0
    ? { data: [1, 2], error: null }
    : { data: null, error: { message: "page unavailable" } }, 2), /page unavailable/);
});

test("Japanese month boundaries remain correct before UTC midnight", () => {
  assert.deepEqual(dashboardMonthBounds(new Date("2026-12-31T15:00:00Z")), {
    today: "2027-01-01", monthStart: "2027-01-01", nextMonthStart: "2027-02-01", lastMonthStart: "2026-12-01",
  });
});
