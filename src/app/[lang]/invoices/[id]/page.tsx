import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getInvoiceById } from "@/lib/db/invoices";
import { getBankAccounts, getCompanyProfile } from "@/lib/db/company";
import { getDocumentSealUrl } from "@/lib/documents/seal-url";
import { buildInvoiceDetailUi } from "@/lib/documents/build-detail-ui";
import { mapSalesDocumentDetail } from "@/lib/documents/map-document-detail";
import { SalesDocumentDetailClient } from "@/components/sales-document-detail-client";
import { getInvoiceContent } from "../content";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);

  const [invoice, profile, bankRows] = await Promise.all([
    getInvoiceById(id),
    getCompanyProfile(scope.orgId),
    getBankAccounts(scope.orgId),
  ]);
  if (!invoice || invoice.organization_id !== scope.orgId) notFound();

  const ui = getInvoiceContent(lang);
  const outputLocale = normalizeDocumentOutputLocale(invoice.output_locale);
  const detail = mapSalesDocumentDetail(
    invoice as Parameters<typeof mapSalesDocumentDetail>[0],
    invoice.invoice_line_items as Parameters<typeof mapSalesDocumentDetail>[1],
    {
      companyName: profile?.company_name_line1 ?? "",
      postalCode: profile?.postal_code ?? "",
      addressLine1: profile?.address_line1 ?? "",
      addressLine2: profile?.address_line2 ?? "",
      addressLine3: profile?.address_line3 ?? "",
      tel: profile?.tel ?? "",
      fax: profile?.fax ?? "",
      email: profile?.email ?? "",
      registrationNumber: profile?.invoice_registration_number ?? "",
      sealUrl:
        invoice.show_seal !== false
          ? await getDocumentSealUrl(profile?.seal_path ?? null)
          : null,
    },
    {
      secondaryDate: (invoice.payment_due as string | null) ?? undefined,
      bankAccounts: bankRows
        .filter((bank) => ((invoice.bank_account_ids as string[] | null) ?? []).includes(bank.id))
        .map((bank) =>
          [bank.bank_name, bank.branch_name, bank.account_number, bank.account_holder]
            .filter(Boolean)
            .join(" / "),
        ),
    },
  );

  return (
    <SalesDocumentDetailClient
      detail={detail}
      ui={buildInvoiceDetailUi(lang, ui)}
      documentUi={buildInvoiceDetailUi(outputLocale, getInvoiceContent(outputLocale))}
      shellActiveItem="invoices"
      listHref={`/${lang}/invoices`}
      clientEmail={((invoice.clients as { email?: string | null } | null)?.email as string) ?? ""}
      clientEmailCc={
        ((invoice.clients as { email_cc?: string[] | null } | null)?.email_cc as string[] | null) ?? []
      }
      senderName={profile?.company_name_line1 ?? ""}
      replyTo={profile?.email ?? ""}
    />
  );
}
