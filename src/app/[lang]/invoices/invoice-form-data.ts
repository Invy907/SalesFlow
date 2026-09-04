import "server-only";

import { DEFAULT_CLIENT_HONORIFIC } from "@/lib/documents/client-honorific";

import { requireActiveOrg } from "@/lib/guards";
import { getClientOptions } from "@/lib/db/clients";
import { getBankAccounts, getCompanyProfile, getDocumentDefaults } from "@/lib/db/company";
import type { InvoiceClientOption, InvoiceFormInitial } from "./invoice-form-client";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";
import { getDocumentSealUrl } from "@/lib/documents/seal-url";
import { getInvoiceById } from "@/lib/db/invoices";
import { normalizeClientHonorific } from "@/lib/documents/client-honorific";
import { TAX_CATEGORY_TO_LABEL, type TaxCategory } from "@/lib/tax";
import type { LineItemRow } from "./../documents/new-document-shared";

export type ClientOption = InvoiceClientOption;
export type BankAccountOption = {
  id: string;
  label: string;
};

/** Copy an existing invoice into the "new invoice" form (change request ⑩). */
async function buildCopyInitial(orgId: string, invoiceId: string) {
  const source = await getInvoiceById(invoiceId).catch(() => null);
  if (!source || source.organization_id !== orgId) return null;

  const recipient = (source.recipient_snapshot ?? {}) as Record<string, string>;
  const lines: LineItemRow[] = (
    (source.invoice_line_items ?? []) as Array<Record<string, unknown>>
  ).map((line) => ({
    name: (line.name_snapshot as string) ?? "",
    qty: line.qty === null || line.qty === undefined ? "" : String(line.qty),
    unit: (line.unit_snapshot as string) ?? "",
    price:
      line.unit_price_snapshot === null || line.unit_price_snapshot === undefined
        ? ""
        : String(line.unit_price_snapshot),
    tax: TAX_CATEGORY_TO_LABEL[line.tax_category as TaxCategory] ?? "10%",
  }));

  return {
    clientId: (source.client_id as string | null) ?? null,
    clientName: (source.clients?.name as string) ?? recipient.clientName ?? "",
    // Document number, issue date and payment state are not carried over.
    subject: (source.subject as string) ?? "",
    billingMonth: (source.billing_month as string) ?? "",
    clientHonorific: normalizeClientHonorific(source.client_honorific),
    showSeal: source.show_seal !== false,
    outputLocale: normalizeDocumentOutputLocale(source.output_locale),
    templateMessage: (source.template_message as string) ?? "",
    remarks: (source.remarks as string) ?? "",
    recipient,
    bankAccountIds: (source.bank_account_ids as string[] | null) ?? [],
    lines,
  };
}

export async function buildNewInvoiceInitial(lang: string, copyFromId?: string): Promise<{
  initial: InvoiceFormInitial;
  clients: ClientOption[];
  bankAccounts: BankAccountOption[];
  sealUrl: string | null;
}> {
  const scope = await requireActiveOrg(lang);
  const [profile, defaults, clientList, banks] = await Promise.all([
    getCompanyProfile(scope.orgId),
    getDocumentDefaults(scope.orgId),
    getClientOptions(scope.orgId),
    getBankAccounts(scope.orgId),
  ]);

  const copy = copyFromId ? await buildCopyInitial(scope.orgId, copyFromId) : null;

  const today = new Date();
  const issueDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  // Signed URL (2h) so the live preview can draw the seal while editing.
  const sealUrl = await getDocumentSealUrl(profile?.seal_path ?? null, 60 * 60 * 2);

  return {
    sealUrl,
    clients: clientList,
    bankAccounts: banks.map((b) => ({
      id: b.id as string,
      label: [b.bank_name, b.branch_name, b.account_number, b.account_holder]
        .filter(Boolean)
        .join(" / "),
    })),
    initial: {
      clientId: null,
      clientName: "",
      issueDate,
      paymentDue: "",
      documentNumber: "",
      subject: "",
      senderCompanyName: profile?.company_name_line1 ?? "",
      sender: {
        postalCode: profile?.postal_code ?? "",
        addressLine1: profile?.address_line1 ?? "",
        addressLine2: profile?.address_line2 ?? "",
        addressLine3: profile?.address_line3 ?? "",
        tel: profile?.tel ?? "",
        fax: profile?.fax ?? "",
        email: profile?.email ?? "",
        registrationNumber: profile?.invoice_registration_number ?? "",
      },
      billingMonth: "",
      taxDisplay: defaults?.tax_display_default ?? "separate",
      taxRounding: defaults?.tax_rounding_default ?? "round_down",
      withholdingType: defaults?.withholding_default ?? "none",
      templateKey: defaults?.invoice_template_key ?? "standard",
      outputLocale: normalizeDocumentOutputLocale(undefined),
      clientHonorific: DEFAULT_CLIENT_HONORIFIC,
      templateMessage: defaults?.invoice_message ?? "",
      remarks: defaults?.invoice_remarks ?? "",
      // Registered accounts are reflected by default; the user can uncheck them.
      bankAccountIds: banks.slice(0, 3).map((bank) => bank.id as string),
      lines: [],
      ...(copy ?? {}),
    },
  };
}
