import type { AiEstimateDraft } from "./schemas";
import { taxLabelFromCategory } from "./normalize";

export type AiDraftApplyOptions = {
  lineIndexes: number[];
  mode: "append" | "replace";
  subject: boolean;
  templateMessage: boolean;
  remarks: boolean;
};
export type AiDraftFormRow = { name: string; qty: string; unit: string; price: string; tax: string; itemId?: string | null; withholdingExempt?: boolean };
export type AiDraftForm = { subject: string; templateMessage: string; remarks: string; rows: AiDraftFormRow[] };
export function isMeaningfulAiFormRow(row: AiDraftFormRow) {
  return Boolean(row.name.trim() || row.unit.trim() || row.itemId || row.withholdingExempt || (row.tax && row.tax !== "10%") || (row.price.trim() && Number(row.price) !== 0) || (row.qty.trim() && Number(row.qty) !== 1));
}

/** Compute the complete update before changing the form, so a row-limit failure never partly overwrites it. */
export function applyAiDraftToForm(current: AiDraftForm, draft: AiEstimateDraft, options: AiDraftApplyOptions): { ok: true; value: AiDraftForm } | { ok: false; error: "empty_selection" | "invalid_selection" | "invalid_tax" | "row_limit" } {
  const indexes = [...new Set(options.lineIndexes)];
  if (!indexes.length && !options.subject && !options.templateMessage && !options.remarks) return { ok: false, error: "empty_selection" };
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= draft.lines.length)) return { ok: false, error: "invalid_selection" };
  if (indexes.some((index) => draft.lines[index].taxCategory === "follow_company")) return { ok: false, error: "invalid_tax" };
  const selected = draft.lines.filter((_, index) => indexes.includes(index)).map((line) => ({ name: line.name, qty: String(line.qty), unit: line.unit, price: String(line.unitPrice), tax: taxLabelFromCategory(line.taxCategory) }));
  // Selecting text alone must leave every existing row intact, including unfinished edits.
  const rows = indexes.length ? [...(options.mode === "append" ? current.rows.filter(isMeaningfulAiFormRow) : []), ...selected] : current.rows;
  if (rows.length > 80) return { ok: false, error: "row_limit" };
  return { ok: true, value: { rows, subject: options.subject ? draft.subject : current.subject, templateMessage: options.templateMessage ? draft.templateMessage : current.templateMessage, remarks: options.remarks ? draft.remarks : current.remarks } };
}
