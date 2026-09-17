import "server-only";

import {
  DEFAULT_CLIENT_HONORIFIC,
  normalizeClientHonorific,
} from "@/lib/documents/client-honorific";

import { requireActiveOrg } from "@/lib/guards";
import { getClients } from "@/lib/db/clients";
import { getCompanyProfile, getDocumentDefaults } from "@/lib/db/company";
import { getEstimateById } from "@/lib/db/estimates";
import { getItems } from "@/lib/db/items";
import { TAX_CATEGORY_TO_LABEL } from "@/lib/tax";
import type { TaxCategory } from "@/lib/tax";
import type { ItemOption, LineItemRow } from "../documents/new-document-shared";
import type { EstimateFormInitial } from "./estimate-form-client";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";

export type ClientOption = { id: string; name: string };

function toItemOptions(items: Array<Record<string, unknown>>): ItemOption[] {
  return items.map((it) => ({
    id: it.id as string,
    name: (it.name as string) ?? "",
    unit: (it.unit as string | null) ?? null,
    unitPrice: Number(it.unit_price ?? 0),
    taxCategory: (it.tax_category as string) ?? "follow_company",
  }));
}

function toLineRows(
  lines: Array<{
    item_id?: string | null;
    name_snapshot: string;
    qty: number | string;
    unit_snapshot: string | null;
    unit_price_snapshot: number | string;
    tax_category: string;
  }>,
): LineItemRow[] {
  return lines.map((l) => ({
    name: l.name_snapshot ?? "",
    qty: String(l.qty ?? ""),
    unit: l.unit_snapshot ?? "",
    price: String(l.unit_price_snapshot ?? ""),
    tax: TAX_CATEGORY_TO_LABEL[(l.tax_category as TaxCategory) ?? "standard_10"] ?? "10%",
    itemId: l.item_id ?? null,
  }));
}

export async function buildNewEstimateInitial(
  lang: string,
  clientId?: string,
): Promise<{
  initial: EstimateFormInitial;
  clients: ClientOption[];
  items: ItemOption[];
}> {
  const scope = await requireActiveOrg(lang);
  const [profile, defaults, clientList, itemList] = await Promise.all([
    getCompanyProfile(scope.orgId),
    getDocumentDefaults(scope.orgId),
    getClients(scope.orgId, { pageSize: 500 }),
    getItems(scope.orgId, { pageSize: 500 }),
  ]);

  const today = new Date();
  const issueDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  const clients = clientList.clients.map((c) => ({
    id: c.id as string,
    name: (c.name as string) ?? "",
  }));
  const prefilledClient = clientId ? clients.find((c) => c.id === clientId) : undefined;

  return {
    clients,
    items: toItemOptions(itemList.items),
    initial: {
      clientId: prefilledClient?.id ?? null,
      clientName: prefilledClient?.name ?? "",
      issueDate,
      expiryDate: "",
      documentNumber: "",
      subject: "",
      senderCompanyName: profile?.company_name_line1 ?? "",
      recipient: {
        postalCode: "",
        addressLine1: "",
        addressLine2: "",
        companyName: "",
        department: "",
        name: "",
        contact: "",
      },
      taxDisplay: defaults?.tax_display_default ?? "separate",
      taxRounding: defaults?.tax_rounding_default ?? "round_down",
      templateKey: defaults?.estimate_template_key ?? "standard",
      outputLocale: normalizeDocumentOutputLocale(undefined),
      clientHonorific: DEFAULT_CLIENT_HONORIFIC,
      templateMessage: defaults?.estimate_message ?? "",
      remarks: defaults?.estimate_remarks ?? "",
      lines: [],
    },
  };
}

export async function buildEditEstimateInitial(
  lang: string,
  estimateId: string,
): Promise<{ initial: EstimateFormInitial; clients: ClientOption[]; items: ItemOption[] } | null> {
  const scope = await requireActiveOrg(lang);
  const estimate = await getEstimateById(estimateId);
  if (!estimate) return null;

  const [clientList, profile, itemList] = await Promise.all([
    getClients(scope.orgId, { pageSize: 500 }),
    getCompanyProfile(scope.orgId),
    getItems(scope.orgId, { pageSize: 500 }),
  ]);

  const recipient = (estimate.recipient_snapshot ?? {}) as Record<string, string>;
  const sender = (estimate.sender_snapshot ?? {}) as Record<string, string>;
  const lines = (estimate.estimate_line_items ?? []) as Array<{
    item_id?: string | null;
    name_snapshot: string;
    qty: number | string;
    unit_snapshot: string | null;
    unit_price_snapshot: number | string;
    tax_category: string;
  }>;

  return {
    clients: clientList.clients.map((c) => ({
      id: c.id as string,
      name: (c.name as string) ?? "",
    })),
    items: toItemOptions(itemList.items),
    initial: {
      id: estimate.id as string,
      clientId: (estimate.client_id as string | null) ?? null,
      clientName: ((estimate.clients as { name?: string } | null)?.name as string) ?? recipient.clientName ?? "",
      issueDate: (estimate.issue_date as string) ?? "",
      expiryDate: (estimate.expiry_date as string) ?? "",
      documentNumber: (estimate.document_number as string) ?? "",
      subject: (estimate.subject as string) ?? "",
      senderCompanyName: sender.companyName ?? profile?.company_name_line1 ?? "",
      recipient: {
        postalCode: recipient.postalCode ?? "",
        addressLine1: recipient.addressLine1 ?? "",
        addressLine2: recipient.addressLine2 ?? "",
        companyName: recipient.companyName ?? "",
        department: recipient.department ?? "",
        name: recipient.name ?? "",
        contact: recipient.contact ?? "",
      },
      taxDisplay: estimate.tax_display ?? "separate",
      taxRounding: estimate.tax_rounding ?? "round_down",
      templateKey: estimate.template_key ?? "standard",
      outputLocale: normalizeDocumentOutputLocale(estimate.output_locale),
      clientHonorific: normalizeClientHonorific(estimate.client_honorific),
      templateMessage: estimate.template_message ?? "",
      remarks: estimate.remarks ?? "",
      lines: toLineRows(lines),
    },
  };
}
