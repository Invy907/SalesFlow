import { notFound } from "next/navigation";
import "server-only";

import { DEFAULT_CLIENT_HONORIFIC } from "@/lib/documents/client-honorific";

import { requireActiveOrg } from "@/lib/guards";
import { getClientOptions } from "@/lib/db/clients";
import { getBankAccounts, getCompanyProfile, getDocumentDefaults } from "@/lib/db/company";
import type { InvoiceClientOption, InvoiceFormInitial } from "./invoice-form-client";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";
import { getDocumentSealUrl } from "@/lib/documents/seal-url";
import { getInvoiceById } from "@/lib/db/invoices";
import { getEstimateById } from "@/lib/db/estimates";
import { getItems } from "@/lib/db/items";
import { normalizeClientHonorific } from "@/lib/documents/client-honorific";
import { TAX_CATEGORY_TO_LABEL, type TaxCategory } from "@/lib/tax";
import type { ItemOption, LineItemRow } from "./../documents/new-document-shared";

function toItemOptions(items: Array<Record<string, unknown>>): ItemOption[] {
  return items.map((it) => ({
    id: it.id as string,
    name: (it.name as string) ?? "",
    unit: (it.unit as string | null) ?? null,
    unitPrice: Number(it.unit_price ?? 0),
    taxCategory: (it.tax_category as string) ?? "follow_company",
    withholdingExempt: Boolean(it.withholding_exempt),
  }));
}

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
    itemId: (line.item_id as string | null) ?? null,
    withholdingExempt: Boolean(line.withholding_exempt_snapshot),
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
    templateKey: source.template_key ?? "standard",
    ...(source.sender_snapshot ? {
      sender: source.sender_snapshot as Record<string, string>,
      senderCompanyName: String((source.sender_snapshot as Record<string, unknown>).companyName ?? ""),
    } : {}),
    taxDisplay: source.tax_display ?? "separate",
    taxRounding: source.tax_rounding ?? "round_down",
    withholdingType: source.withholding_type ?? "none",
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

/** 見積書からの変換(?fromEstimate=<id>). 청구서 전용 필드(입금 등)는 제외. */
async function buildFromEstimateInitial(orgId: string, estimateId: string) {
  const source = await getEstimateById(estimateId).catch(() => null);
  if (!source || source.organization_id !== orgId) return null;

  const recipient = (source.recipient_snapshot ?? {}) as Record<string, string>;
  const lines: LineItemRow[] = (
    (source.estimate_line_items ?? []) as Array<Record<string, unknown>>
  ).map((line) => ({
    itemId: (line.item_id as string | null) ?? null,
    withholdingExempt: Boolean(line.withholding_exempt_snapshot),
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
    subject: (source.subject as string) ?? "",
    templateKey: source.template_key ?? "standard",
    ...(source.sender_snapshot ? {
      sender: source.sender_snapshot as Record<string, string>,
      senderCompanyName: String((source.sender_snapshot as Record<string, unknown>).companyName ?? ""),
    } : {}),
    taxDisplay: source.tax_display ?? "separate",
    taxRounding: source.tax_rounding ?? "round_down",
    withholdingType: source.withholding_type ?? "none",
    clientHonorific: normalizeClientHonorific(source.client_honorific),
    showSeal: source.show_seal !== false,
    outputLocale: normalizeDocumentOutputLocale(source.output_locale),
    templateMessage: (source.template_message as string) ?? "",
    remarks: (source.remarks as string) ?? "",
    recipient: { ...recipient, section: recipient.section ?? recipient.name ?? "" },
    lines,
  };
}

function formatSlashDate(value: string | null | undefined): string {
  if (!value) return "";
  if (value.includes("/")) return value;
  const parts = value.slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
  return value;
}

export async function buildEditInvoiceInitial(
  lang: string,
  invoiceId: string,
): Promise<{
  initial: InvoiceFormInitial & { id: string };
  clients: ClientOption[];
  bankAccounts: BankAccountOption[];
  sealUrl: string | null;
  items: ItemOption[];
}> {
  const scope = await requireActiveOrg(lang);
  const invoice = await getInvoiceById(invoiceId).catch(() => null);
  if (!invoice || invoice.organization_id !== scope.orgId) {
    notFound();
  }

  const [profile, clientList, banks, itemList] = await Promise.all([
    getCompanyProfile(scope.orgId),
    getClientOptions(scope.orgId),
    getBankAccounts(scope.orgId),
    getItems(scope.orgId, { pageSize: 500 }),
  ]);

  const recipient = (invoice.recipient_snapshot ?? {}) as Record<string, string>;
  const sender = (invoice.sender_snapshot ?? {}) as Record<string, string>;

  const lines: LineItemRow[] = (
    (invoice.invoice_line_items ?? []) as Array<Record<string, unknown>>
  ).map((line) => ({
    itemId: (line.item_id as string | null) ?? null,
    withholdingExempt: Boolean(line.withholding_exempt_snapshot),
    name: (line.name_snapshot as string) ?? "",
    qty: line.qty === null || line.qty === undefined ? "" : String(line.qty),
    unit: (line.unit_snapshot as string) ?? "",
    price:
      line.unit_price_snapshot === null || line.unit_price_snapshot === undefined
        ? ""
        : String(line.unit_price_snapshot),
    tax: TAX_CATEGORY_TO_LABEL[line.tax_category as TaxCategory] ?? "10%",
  }));

  const sealUrl = await getDocumentSealUrl(profile?.seal_path ?? null, 60 * 60 * 2);

  return {
    sealUrl,
    clients: clientList,
    items: toItemOptions(itemList.items),
    bankAccounts: banks.map((b) => ({
      id: b.id as string,
      label: [b.bank_name, b.branch_name, b.account_number, b.account_holder]
        .filter(Boolean)
        .join(" / "),
    })),
    initial: {
      id: invoice.id as string,
      clientId: (invoice.client_id as string | null) ?? null,
      clientName: (invoice.clients?.name as string) ?? recipient.clientName ?? "",
      issueDate: formatSlashDate(invoice.issue_date as string),
      paymentDue: formatSlashDate(invoice.payment_due as string | null),
      documentNumber: (invoice.document_number as string) ?? "",
      subject: (invoice.subject as string) ?? "",
      senderCompanyName: sender.companyName ?? profile?.company_name_line1 ?? "",
      sender: {
        postalCode: sender.postalCode ?? profile?.postal_code ?? "",
        addressLine1: sender.addressLine1 ?? profile?.address_line1 ?? "",
        addressLine2: sender.addressLine2 ?? profile?.address_line2 ?? "",
        addressLine3: sender.addressLine3 ?? profile?.address_line3 ?? "",
        tel: sender.tel ?? profile?.tel ?? "",
        fax: sender.fax ?? profile?.fax ?? "",
        email: sender.email ?? profile?.email ?? "",
        registrationNumber:
          sender.registrationNumber ?? profile?.invoice_registration_number ?? "",
      },
      billingMonth: (invoice.billing_month as string) ?? "",
      taxDisplay: invoice.tax_display ?? "separate",
      taxRounding: invoice.tax_rounding ?? "round_down",
      withholdingType: invoice.withholding_type ?? "none",
      templateKey: (invoice.template_key as string) ?? "standard",
      outputLocale: normalizeDocumentOutputLocale(invoice.output_locale),
      clientHonorific: normalizeClientHonorific(invoice.client_honorific),
      templateMessage: (invoice.template_message as string) ?? "",
      remarks: (invoice.remarks as string) ?? "",
      bankAccountIds: (invoice.bank_account_ids as string[] | null) ?? [],
      showSeal: invoice.show_seal !== false,
      recipient: {
        postalCode: recipient.postalCode ?? "",
        addressLine1: recipient.addressLine1 ?? "",
        addressLine2: recipient.addressLine2 ?? "",
        companyName: recipient.companyName ?? "",
        department: recipient.department ?? "",
        section: recipient.section ?? "",
        contact: recipient.contact ?? "",
        phone: recipient.phone ?? "",
      },
      lines,
    },
  };
}

export async function buildNewInvoiceInitial(
  lang: string,
  copyFromId?: string,
  fromEstimateId?: string,
  clientId?: string,
): Promise<{
  initial: InvoiceFormInitial;
  clients: ClientOption[];
  bankAccounts: BankAccountOption[];
  sealUrl: string | null;
  items: ItemOption[];
}> {
  const scope = await requireActiveOrg(lang);
  const [profile, defaults, clientList, banks, itemList] = await Promise.all([
    getCompanyProfile(scope.orgId),
    getDocumentDefaults(scope.orgId),
    getClientOptions(scope.orgId),
    getBankAccounts(scope.orgId),
    getItems(scope.orgId, { pageSize: 500 }),
  ]);

  const copy: Partial<InvoiceFormInitial> | null = copyFromId
    ? await buildCopyInitial(scope.orgId, copyFromId)
    : fromEstimateId
      ? await buildFromEstimateInitial(scope.orgId, fromEstimateId)
      : null;

  const prefilledClient = clientId ? clientList.find((c) => c.id === clientId) : undefined;

  const today = new Date();
  const issueDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  // Signed URL (2h) so the live preview can draw the seal while editing.
  const sealUrl = await getDocumentSealUrl(profile?.seal_path ?? null, 60 * 60 * 2);

  return {
    sealUrl,
    clients: clientList,
    items: toItemOptions(itemList.items),
    bankAccounts: banks.map((b) => ({
      id: b.id as string,
      label: [b.bank_name, b.branch_name, b.account_number, b.account_holder]
        .filter(Boolean)
        .join(" / "),
    })),
    initial: {
      clientId: prefilledClient?.id ?? null,
      clientName: prefilledClient?.name ?? "",
      recipient: {
        postalCode: prefilledClient?.postalCode ?? "", addressLine1: prefilledClient?.addressLine1 ?? "",
        addressLine2: prefilledClient?.addressLine2 ?? "", companyName: prefilledClient?.name ?? "",
        department: prefilledClient?.department ?? "", phone: prefilledClient?.phone ?? "",
      },
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
