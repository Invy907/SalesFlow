import "server-only";

import { DEFAULT_CLIENT_HONORIFIC } from "@/lib/documents/client-honorific";

import { requireActiveOrg } from "@/lib/guards";
import { getClientOptions } from "@/lib/db/clients";
import { getBankAccounts, getCompanyProfile, getDocumentDefaults } from "@/lib/db/company";
import type { InvoiceClientOption, InvoiceFormInitial } from "./invoice-form-client";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";

export type ClientOption = InvoiceClientOption;
export type BankAccountOption = {
  id: string;
  label: string;
};

export async function buildNewInvoiceInitial(lang: string): Promise<{
  initial: InvoiceFormInitial;
  clients: ClientOption[];
  bankAccounts: BankAccountOption[];
}> {
  const scope = await requireActiveOrg(lang);
  const [profile, defaults, clientList, banks] = await Promise.all([
    getCompanyProfile(scope.orgId),
    getDocumentDefaults(scope.orgId),
    getClientOptions(scope.orgId),
    getBankAccounts(scope.orgId),
  ]);

  const today = new Date();
  const issueDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  return {
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
      billingMonth: "",
      taxDisplay: defaults?.tax_display_default ?? "separate",
      taxRounding: defaults?.tax_rounding_default ?? "round_down",
      withholdingType: defaults?.withholding_default ?? "none",
      templateKey: defaults?.invoice_template_key ?? "standard",
      outputLocale: normalizeDocumentOutputLocale(undefined),
      clientHonorific: DEFAULT_CLIENT_HONORIFIC,
      templateMessage: defaults?.invoice_message ?? "",
      remarks: defaults?.invoice_remarks ?? "",
      bankAccountIds: [],
      lines: [],
    },
  };
}
