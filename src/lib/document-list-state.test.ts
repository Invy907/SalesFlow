import assert from "node:assert/strict";
import test from "node:test";
import { documentRecipientName, documentSearchClause, documentSearchPattern, parseListInteger, visibleDocumentSelection } from "./document-list-state";
import { invoiceOutstandingTotals } from "./invoice-outstanding";

test("list URL parameters cannot produce fractional tabs or invalid database ranges", () => {
  for (const input of [undefined, "", "-1", "0.5", "Infinity", "NaN", "1e10", "9999999999999999999999"]) {
    assert.equal(parseListInteger(input, 0, 2), 0);
    assert.equal(parseListInteger(input, 1), 1);
  }
  assert.equal(parseListInteger("2", 0, 2), 2);
  assert.equal(parseListInteger("3", 0, 2), 0);
  assert.equal(parseListInteger("0", 1), 1);
  assert.equal(parseListInteger("45", 1), 45);
});

test("bulk actions cannot include selected documents that disappeared from the visible page", () => {
  const selection = new Set(["previous-page", "deleted-document", "current-document"]);
  const visible = visibleDocumentSelection(selection, [{ id: "current-document" }, { id: "unselected" }]);
  assert.deepEqual([...visible], ["current-document"]);
  assert.deepEqual([...visibleDocumentSelection(selection, [])], []);
});

test("document lists use the saved recipient for free-text clients and renamed client records", () => {
  assert.equal(documentRecipientName({ clientName: "QA 거래처" }, null), "QA 거래처");
  assert.equal(documentRecipientName({ clientName: "Original name", companyName: "Destination name" }, "Renamed client"), "Original name");
  assert.equal(documentRecipientName({ clientName: " ", companyName: "Destination name" }, null), "Destination name");
  assert.equal(documentRecipientName({ name: "Legacy recipient" }, null), "Legacy recipient");
  assert.equal(documentRecipientName(null, "Master name"), "Master name");
  assert.equal(documentRecipientName({}, "Master name"), "Master name");
  assert.equal(documentRecipientName({ clientName: 123 }, null), "");
});

test("search supports memo and matching clients while keeping punctuation inside quoted values", () => {
  const query = 'ACME, Inc. ("Japan") 10%_';
  assert.equal(documentSearchPattern(query), '%ACME, Inc. ("Japan") 10\\%\\_%');
  const pattern = JSON.stringify(documentSearchPattern(query));
  assert.equal(documentSearchClause(query, ["client-a"]), [
    `document_number.ilike.${pattern}`,
    `subject.ilike.${pattern}`,
    `internal_memo.ilike.${pattern}`,
    `recipient_snapshot->>clientName.ilike.${pattern}`,
    `recipient_snapshot->>companyName.ilike.${pattern}`,
    `recipient_snapshot->>name.ilike.${pattern}`,
    "client_id.in.(client-a)",
  ].join(","));
});

test("outstanding totals count only remaining balances, and today is not overdue", () => {
  assert.deepEqual(invoiceOutstandingTotals([
    { total: 1000, paid_amount: 250, payment_due: "2026-09-21" },
    { total: 2000, paid_amount: 0, payment_due: "2026-09-22" },
    { total: 300, paid_amount: 400, payment_due: "2026-09-01" },
    { total: 500, paid_amount: 0, payment_due: null },
  ], "2026-09-22"), { unpaidTotal: 3250, overdueTotal: 750 });
});
