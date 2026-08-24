import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getInvoiceById } from "@/lib/db/invoices";
import { getCompanyProfile } from "@/lib/db/company";
import { buildInvoiceDetailUi } from "@/lib/documents/build-detail-ui";
import { mapSalesDocumentDetail } from "@/lib/documents/map-document-detail";
import { SalesDocumentDetailClient } from "@/components/sales-document-detail-client";
import { getInvoiceContent } from "../content";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);

  const [invoice, profile] = await Promise.all([
    getInvoiceById(id),
    getCompanyProfile(scope.orgId),
  ]);
  if (!invoice || invoice.organization_id !== scope.orgId) notFound();

  const ui = getInvoiceContent(lang);
  const detail = mapSalesDocumentDetail(
    invoice as Parameters<typeof mapSalesDocumentDetail>[0],
    invoice.invoice_line_items as Parameters<typeof mapSalesDocumentDetail>[1],
    {
      companyName: profile?.company_name_line1 ?? "",
      tel: profile?.tel ?? "",
      email: profile?.email ?? "",
    },
    { secondaryDate: (invoice.payment_due as string | null) ?? undefined },
  );

  return (
    <SalesDocumentDetailClient
      detail={detail}
      ui={buildInvoiceDetailUi(lang, ui)}
      shellActiveItem="invoices"
      listHref={`/${lang}/invoices`}
    />
  );
}
