import assert from "node:assert/strict";
import test from "node:test";
import { buildConvertedSimpleDocumentFormInitial, buildSimpleDocumentFormInitial } from "./documents/simple-document-form";

test("editing preserves saved recipients, sender metadata, document settings and invoice linkage", () => {
  const initial = buildSimpleDocumentFormInitial({
    client_id: "client", client_destination_id: "destination", linked_invoice_id: "invoice",
    clients: { name: "Client renamed in master" }, document_number: "D-123", issue_date: "2026-04-01", delivery_date: "2026-04-05",
    recipient_snapshot: { clientName: "Name printed on original", companyName: "Destination", section: "Keep this hidden field", postalCode: "100-0001" },
    sender_snapshot: { companyName: "Original sender", email: "original@example.test", bankAccounts: ["Bank A"] },
    tax_display: "included", tax_rounding: "round_up", withholding_type: "with_recovery",
    output_locale: "en", show_seal: false, show_client_honorific: false, client_honorific: "onchu",
    template_key: "envelope", internal_memo: "Keep staff memo", remarks: "Original remarks",
  }, [{ line_no: 1, name_snapshot: "Service", qty: 1.5, unit_price_snapshot: 123, tax_category: "reduced_8", item_id: "item", withholding_exempt_snapshot: true }], "delivery_date");

  assert.equal(initial.clientName, "Name printed on original");
  assert.equal(initial.clientDestinationId, "destination");
  assert.equal(initial.linkedInvoiceId, "invoice");
  assert.equal(initial.documentNumber, "D-123");
  assert.equal(initial.issueDate, "2026-04-01");
  assert.equal(initial.secondaryDate, "2026-04-05");
  assert.equal(initial.senderCompanyName, "Original sender");
  assert.deepEqual(initial.senderSnapshot?.bankAccounts, ["Bank A"]);
  assert.equal(initial.recipientSnapshot?.section, "Keep this hidden field");
  assert.equal(initial.withholdingType, "with_recovery");
  assert.equal(initial.taxDisplay, "included");
  assert.equal(initial.clientHonorific, "none");
  assert.equal(initial.showSeal, false);
  assert.equal(initial.outputLocale, "en");
  assert.equal(initial.internalMemo, "Keep staff memo");
  assert.equal(initial.lines?.[0].qty, "1.5");
  assert.equal(initial.lines?.[0].tax, "軽減8%");
  assert.equal(initial.lines?.[0].withholdingExempt, true);
});

test("receipt editing keeps blank dates and zero-priced lines without inventing values", () => {
  const initial = buildSimpleDocumentFormInitial({ transaction_date: null, sender_snapshot: { companyName: "" } }, [
    { line_no: 2, name_snapshot: "Free", qty: 0, unit_price_snapshot: 0, tax_category: "exempt" },
    { line_no: 1, name_snapshot: "First", qty: 1, unit_price_snapshot: 20, tax_category: "standard_10" },
  ], "transaction_date");
  assert.equal(initial.secondaryDate, "");
  assert.equal(initial.senderCompanyName, "");
  assert.equal(initial.lines?.[0].name, "First");
  assert.equal(initial.lines?.[1].qty, "0");
  assert.equal(initial.lines?.[1].price, "0");
});

test("estimate conversion preserves original snapshots and settings but does not reuse dates or number", () => {
  const recipient = { clientName: "Original recipient", companyName: "Recipient company", section: "Sales" };
  const sender = { companyName: "Original sender", email: "sender@example.test", bankAccounts: ["Original bank"] };
  const initial = buildConvertedSimpleDocumentFormInitial({
    clients: { name: "Renamed master client" }, recipient_snapshot: recipient, sender_snapshot: sender,
    document_number: "EST-001", issue_date: "2020-01-01", delivery_date: "2020-01-10", expiry_date: "2020-01-15",
    tax_display: "included", tax_rounding: "round_up", withholding_type: "without_recovery",
    template_key: "envelope", template_message: "Custom message", output_locale: "ko", show_seal: false,
    show_client_honorific: false, client_destination_id: "destination", internal_memo: "Original memo",
  }, [{ line_no: 1, name_snapshot: "Reduced rate item", qty: 2.5, unit_price_snapshot: 250, tax_category: "reduced_8", withholding_exempt_snapshot: true }]);
  assert.equal(initial.clientName, "Original recipient");
  assert.deepEqual(initial.recipientSnapshot, recipient);
  assert.deepEqual(initial.senderSnapshot, sender);
  assert.equal(initial.senderCompanyName, "Original sender");
  assert.equal(initial.sender?.email, "sender@example.test");
  assert.equal(initial.documentNumber, undefined);
  assert.equal(initial.issueDate, undefined);
  assert.equal(initial.secondaryDate, undefined);
  assert.equal(initial.taxDisplay, "included");
  assert.equal(initial.taxRounding, "round_up");
  assert.equal(initial.withholdingType, "without_recovery");
  assert.equal(initial.templateKey, "envelope");
  assert.equal(initial.templateMessage, "Custom message");
  assert.equal(initial.showSeal, false);
  assert.equal(initial.clientHonorific, "none");
  assert.equal(initial.clientDestinationId, "destination");
  assert.equal(initial.internalMemo, "Original memo");
  assert.equal(initial.lines?.[0].tax, "軽減8%");
  assert.equal(initial.lines?.[0].qty, "2.5");
  assert.equal(initial.lines?.[0].withholdingExempt, true);
});
