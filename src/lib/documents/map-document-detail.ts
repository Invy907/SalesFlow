import type { SpreadsheetLineItem } from "./export-spreadsheet";
import type { SalesDocumentDetail } from "./detail-types";
import { normalizeDocumentOutputLocale } from "./output-locale";
import { normalizeClientHonorific, normalizeShowClientHonorific } from "./client-honorific";

type LineRow = {
  line_no?: number | string;
  name_snapshot?: string | null;
  qty?: number | string;
  unit_snapshot?: string | null;
  unit_price_snapshot?: number | string;
};

type DocumentRow = {
  id: string;
  document_number?: string | null;
  client_id?: string | null;
  subject?: string | null;
  issue_date?: string | null;
  status?: string | null;
  output_locale?: string | null;
  show_client_honorific?: boolean | null;
  client_honorific?: string | null;
  show_seal?: boolean | null;
  template_message?: string | null;
  remarks?: string | null;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  total?: number | string | null;
  recipient_snapshot?: unknown;
  clients?: { name?: string } | null;
  payment_due?: string | null;
  delivery_date?: string | null;
  transaction_date?: string | null;
};

export function mapDocumentLines(lines: LineRow[] | null | undefined): SpreadsheetLineItem[] {
  return (lines ?? []).map((line) => ({
    name: line.name_snapshot ?? "",
    qty: Number(line.qty ?? 0),
    unit: line.unit_snapshot ?? "",
    unitPrice: Number(line.unit_price_snapshot) || 0,
  }));
}

export function mapSalesDocumentDetail(
  row: DocumentRow,
  lines: LineRow[] | null | undefined,
  sender: SalesDocumentDetail["sender"],
  options?: { secondaryDate?: string | null },
): SalesDocumentDetail {
  const recipient = (row.recipient_snapshot ?? {}) as Record<string, string>;

  return {
    id: row.id,
    documentNumber: row.document_number ?? "",
    clientName: row.clients?.name ?? recipient.clientName ?? "",
    subject: row.subject ?? "",
    issueDate: row.issue_date ?? "",
    secondaryDate: options?.secondaryDate ?? undefined,
    status: row.status ?? "draft",
    outputLocale: normalizeDocumentOutputLocale(row.output_locale),
    showClientHonorific: normalizeShowClientHonorific(row.show_client_honorific),
    clientHonorific: normalizeClientHonorific(row.client_honorific),
    templateMessage: row.template_message ?? "",
    remarks: row.remarks ?? "",
    subtotal: Number(row.subtotal ?? 0),
    tax: Number(row.tax_amount ?? 0),
    total: Number(row.total ?? 0),
    lines: mapDocumentLines(lines),
    showSeal: row.show_seal !== false,
    sender,
  };
}
