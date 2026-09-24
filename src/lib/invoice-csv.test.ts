import assert from "node:assert/strict";
import test from "node:test";
import { INVOICE_CSV_HEADERS, parseInvoiceCsv } from "./invoice-csv";
const header = INVOICE_CSV_HEADERS.join(",");
const sample = "A001,Acme,2026-09-22,2026-10-22,Design,Service,1,h,1000,10";

test("invoice CSV groups matching keys and preserves comma prices and quoted multiline names", () => {
  const parsed = parseInvoiceCsv(`\ufeff${header}\r\nA001,Acme,2026-09-22,2026-10-22,Design,"Service, phase 1\nWith \\\"details\\\"",1,h,"1,000",10\r\n`.replaceAll('\\"', '""') + "A001,Acme,2026-09-22,2026-10-22,Design,Second,,h,500,R8\r\n");
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.documents.length, 1);
  assert.equal(parsed.documents[0].lineItems[0].unitPrice, 1000);
  assert.equal(parsed.documents[0].lineItems[1].qty, 1);
  assert.equal(parsed.documents[0].lineItems[1].taxCategory, "reduced_8");
  assert.match(parsed.documents[0].lineItems[0].name, /\nWith "details"/);
});

test("invoice CSV rejects invalid calendar dates and numeric expressions", () => {
  const parsed = parseInvoiceCsv(`${header}\n${sample.replace("2026-09-22", "2026-02-30").replace(",1000,", ",1e3,")}`);
  assert.deepEqual(parsed.issues.map((issue) => issue.code), ["date", "number"]);
  assert.equal(parsed.documents.length, 0);
});

test("invoice CSV refuses ambiguous grouping and unsupported rates", () => {
  const parsed = parseInvoiceCsv(`${header}\n${sample}\n${sample.replace("Acme", "Other")}\n${sample.replace(/,10$/, ",9")}`);
  assert.deepEqual(parsed.issues.map((issue) => issue.code), ["conflict", "tax"]);
});

test("invoice CSV requires the explicit template and valid quoting", () => {
  assert.equal(parseInvoiceCsv(`other,headers\n${sample}`).issues[0].code, "headers");
  assert.equal(parseInvoiceCsv(`${header}\n"${sample}`).issues[0].code, "quotes");
  assert.equal(parseInvoiceCsv(`${header}\n`).issues[0].code, "empty");
});

test("invoice CSV enforces invoice and line limits before any writes", () => {
  const tooMany = parseInvoiceCsv(`${header}\n` + Array.from({ length: 51 }, (_, index) => sample.replace("A001", `A${index}`)).join("\n"));
  assert.equal(tooMany.issues.at(-1)?.code, "limit");
  const tooLong = parseInvoiceCsv(`${header}\n` + Array.from({ length: 81 }, () => sample).join("\n"));
  assert.equal(tooLong.issues.at(-1)?.code, "lines");
});
