import type { LineItemRow, SenderDetails } from "@/app/[lang]/documents/new-document-shared";
import type { Json } from "@/lib/supabase/database.types";
import { documentRecipientName } from "@/lib/document-list-state";
import { TAX_CATEGORY_TO_LABEL, type TaxCategory, type TaxDisplay, type TaxRounding, type WithholdingType } from "@/lib/tax";
import { normalizeClientHonorific, type ClientHonorific } from "./client-honorific";
import { normalizeDocumentOutputLocale, type DocumentOutputLocale } from "./output-locale";

export type SimpleDocumentFormInitial = {
  clientId?: string | null;
  clientDestinationId?: string | null;
  linkedInvoiceId?: string | null;
  clientName?: string;
  documentNumber?: string;
  issueDate?: string;
  secondaryDate?: string;
  subject?: string;
  clientHonorific?: ClientHonorific;
  showSeal?: boolean;
  outputLocale?: DocumentOutputLocale;
  templateKey?: string;
  templateMessage?: string;
  remarks?: string;
  internalMemo?: string;
  senderCompanyName?: string;
  sender?: Partial<SenderDetails>;
  recipient?: Partial<{ postalCode: string; addressLine1: string; addressLine2: string; companyName: string; department: string; contact: string; phone: string }>;
  senderSnapshot?: Record<string, Json>;
  recipientSnapshot?: Record<string, Json>;
  lines?: LineItemRow[];
  taxDisplay?: TaxDisplay;
  taxRounding?: TaxRounding;
  withholdingType?: WithholdingType;
};

/** Editing uses stored snapshots, including fields the compact editor does not expose. */
export function buildSimpleDocumentFormInitial(
  source: Record<string, unknown>,
  lines: Array<Record<string, unknown>>,
  secondaryDateField: "delivery_date" | "transaction_date",
): SimpleDocumentFormInitial {
  const recipient = (source.recipient_snapshot ?? {}) as Record<string, Json>;
  const sender = (source.sender_snapshot ?? {}) as Record<string, Json>;
  const stringValue = (value: unknown) => typeof value === "string" ? value : "";
  return {
    clientId: (source.client_id as string | null) ?? null,
    clientDestinationId: (source.client_destination_id as string | null) ?? null,
    linkedInvoiceId: (source.linked_invoice_id as string | null) ?? null,
    clientName: documentRecipientName(recipient, (source.clients as { name?: string } | null)?.name),
    documentNumber: stringValue(source.document_number),
    issueDate: stringValue(source.issue_date),
    secondaryDate: stringValue(source[secondaryDateField]),
    subject: stringValue(source.subject),
    clientHonorific: source.show_client_honorific === false ? "none" : normalizeClientHonorific(source.client_honorific),
    showSeal: source.show_seal !== false,
    outputLocale: normalizeDocumentOutputLocale(source.output_locale),
    templateKey: stringValue(source.template_key) || "standard",
    templateMessage: stringValue(source.template_message),
    remarks: stringValue(source.remarks),
    internalMemo: stringValue(source.internal_memo),
    senderCompanyName: typeof sender.companyName === "string" ? sender.companyName : undefined,
    sender: Object.fromEntries(["postalCode", "addressLine1", "addressLine2", "addressLine3", "tel", "fax", "email", "registrationNumber"].filter((key) => typeof sender[key] === "string").map((key) => [key, String(sender[key])])),
    recipient: Object.fromEntries(["postalCode", "addressLine1", "addressLine2", "companyName", "department", "contact", "phone"].map((key) => [key, stringValue(recipient[key])])),
    senderSnapshot: sender,
    recipientSnapshot: recipient,
    taxDisplay: source.tax_display as TaxDisplay,
    taxRounding: source.tax_rounding as TaxRounding,
    withholdingType: (source.withholding_type as WithholdingType) ?? "none",
    lines: [...lines].sort((a, b) => Number(a.line_no) - Number(b.line_no)).map((line) => ({
      itemId: (line.item_id as string | null) ?? null,
      withholdingExempt: Boolean(line.withholding_exempt_snapshot),
      name: stringValue(line.name_snapshot),
      qty: line.qty == null ? "" : String(line.qty),
      unit: stringValue(line.unit_snapshot),
      price: line.unit_price_snapshot == null ? "" : String(line.unit_price_snapshot),
      tax: TAX_CATEGORY_TO_LABEL[line.tax_category as TaxCategory] ?? "10%",
    })),
  };
}

/** Conversion copies document content while the new document gets its own dates and number. */
export function buildConvertedSimpleDocumentFormInitial(
  source: Record<string, unknown>,
  lines: Array<Record<string, unknown>>,
): SimpleDocumentFormInitial {
  return {
    ...buildSimpleDocumentFormInitial(source, lines, "delivery_date"),
    documentNumber: undefined,
    issueDate: undefined,
    secondaryDate: undefined,
  };
}
