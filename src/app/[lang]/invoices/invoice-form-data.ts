import "server-only";

import { requireActiveOrg } from "@/lib/guards";
import { getClients } from "@/lib/db/clients";
import { getBankAccounts, getCompanyProfile, getDocumentDefaults } from "@/lib/db/company";
import type { InvoiceFormInitial } from "./invoice-form-client";

export type ClientOption = { id: string; name: string };
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
    getClients(scope.orgId, { pageSize: 500 }),
    getBankAccounts(scope.orgId),
  ]);

  const today = new Date();
  const issueDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  return {
    clients: clientList.clients.map((c) => ({
      id: c.id as string,
      name: (c.name as string) ?? "",
    })),
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
      templateMessage: defaults?.invoice_message ?? "",
      remarks: defaults?.invoice_remarks ?? "",
      bankAccountIds: [],
      lines: [],
    },
  };
}
