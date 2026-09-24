import { taxRateSnapshotFor, type TaxCategory } from "./tax";

export const INVOICE_CSV_HEADERS = ["invoice_key", "client_name", "issue_date", "payment_due", "subject", "item_name", "quantity", "unit", "unit_price", "tax_rate"] as const;
export const INVOICE_CSV_LIMIT = 50;
export type InvoiceCsvIssue = { row: number; column?: string; code: "headers" | "quotes" | "empty" | "limit" | "columns" | "required" | "date" | "number" | "tax" | "conflict" | "lines" | "length" };
export type InvoiceCsvDocument = {
  key: string;
  clientName: string;
  issueDate: string;
  paymentDue: string;
  subject: string;
  lineItems: Array<{ name: string; qty: number; unit: string; unitPrice: number; taxCategory: TaxCategory; taxRateSnapshot: number }>;
};

function csvRecords(input: string): { rows: string[][]; invalidQuotes: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const source = input.replace(/^\ufeff/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field.trim()); field = ""; closed = false;
      if (char !== ",") {
        rows.push(row); row = [];
        if (char === "\r" && source[i + 1] === "\n") i++;
      }
    } else if (char === '"') {
      if (field || closed) return { rows, invalidQuotes: true };
      quoted = true;
    } else if (closed && char.trim()) return { rows, invalidQuotes: true };
    else field += char;
  }
  if (quoted) return { rows, invalidQuotes: true };
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return { rows, invalidQuotes: false };
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function numeric(value: string, defaultValue?: number): number {
  if (!value && defaultValue !== undefined) return defaultValue;
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)) return NaN;
  return Number(value.replace(/,/g, ""));
}

/** Explicit SalesFlow CSV contract; a shared invoice_key groups up to 80 item rows. */
export function parseInvoiceCsv(text: string): { documents: InvoiceCsvDocument[]; issues: InvoiceCsvIssue[] } {
  const parsed = csvRecords(text);
  if (parsed.invalidQuotes) return { documents: [], issues: [{ row: 1, code: "quotes" }] };
  const [header, ...rows] = parsed.rows;
  if (!header || header.join(",") !== INVOICE_CSV_HEADERS.join(",")) {
    return { documents: [], issues: [{ row: 1, code: "headers" }] };
  }
  const issues: InvoiceCsvIssue[] = [];
  const documents = new Map<string, InvoiceCsvDocument>();
  const taxCategories: Record<string, TaxCategory> = { "10": "standard_10", R8: "reduced_8", "8": "standard_8", "5": "standard_5", "0": "exempt" };
  rows.forEach((cols, index) => {
    if (cols.every((value) => !value)) return;
    const row = index + 2;
    if (cols.length !== INVOICE_CSV_HEADERS.length) { issues.push({ row, code: "columns" }); return; }
    const [key, clientName, issueDate, paymentDue, subject, name, quantity, unit, price, taxRate] = cols;
    const firstIssue = issues.length;
    for (const [column, value] of [["invoice_key", key], ["client_name", clientName], ["item_name", name]] as const) {
      if (!value) issues.push({ row, column, code: "required" });
    }
    for (const [column, value, limit] of [["invoice_key", key, 100], ["client_name", clientName, 255], ["subject", subject, 70], ["item_name", name, 255], ["unit", unit, 255]] as const) {
      if (value.length > limit) issues.push({ row, column, code: "length" });
    }
    if (!isDate(issueDate)) issues.push({ row, column: "issue_date", code: "date" });
    if (paymentDue && !isDate(paymentDue)) issues.push({ row, column: "payment_due", code: "date" });
    const qty = numeric(quantity, 1);
    const unitPrice = numeric(price);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 1_000_000_000) issues.push({ row, column: "quantity", code: "number" });
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || !Number.isSafeInteger(Math.ceil(qty * unitPrice))) issues.push({ row, column: "unit_price", code: "number" });
    const taxCategory = taxCategories[taxRate];
    if (!taxCategory) issues.push({ row, column: "tax_rate", code: "tax" });
    if (issues.length !== firstIssue) return;
    const existing = documents.get(key);
    if (existing && [existing.clientName, existing.issueDate, existing.paymentDue, existing.subject].join("\0") !== [clientName, issueDate, paymentDue, subject].join("\0")) {
      issues.push({ row, column: "invoice_key", code: "conflict" }); return;
    }
    const document = existing ?? { key, clientName, issueDate, paymentDue, subject, lineItems: [] };
    document.lineItems.push({ name, qty, unit, unitPrice, taxCategory, taxRateSnapshot: taxRateSnapshotFor(taxCategory) });
    if (document.lineItems.length > 80) issues.push({ row, column: "invoice_key", code: "lines" });
    documents.set(key, document);
  });
  if (documents.size > INVOICE_CSV_LIMIT) issues.push({ row: 1, code: "limit" });
  if (!documents.size && !issues.length) issues.push({ row: 2, code: "empty" });
  return { documents: [...documents.values()], issues };
}
