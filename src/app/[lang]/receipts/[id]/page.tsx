import { getDocumentSealUrl } from "@/lib/documents/seal-url";
import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getReceiptById } from "@/lib/db/receipts";
import { getCompanyProfile } from "@/lib/db/company";
import { buildReceiptDetailUi } from "@/lib/documents/build-detail-ui";
import { mapSalesDocumentDetail } from "@/lib/documents/map-document-detail";
import { SalesDocumentDetailClient } from "@/components/sales-document-detail-client";
import { getReceiptContent } from "../content";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";

export const dynamic = "force-dynamic";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);

  const [receipt, profile] = await Promise.all([
    getReceiptById(id),
    getCompanyProfile(scope.orgId),
  ]);
  if (!receipt || receipt.organization_id !== scope.orgId) notFound();

  const ui = getReceiptContent(lang);
  const outputLocale = normalizeDocumentOutputLocale(receipt.output_locale);
  const detail = mapSalesDocumentDetail(
    receipt as Parameters<typeof mapSalesDocumentDetail>[0],
    receipt.receipt_line_items as Parameters<typeof mapSalesDocumentDetail>[1],
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
      sealUrl: receipt.show_seal !== false ? await getDocumentSealUrl(profile?.seal_path) : null,
    },
    { documentType: "receipt", secondaryDate: (receipt.transaction_date as string | null) ?? undefined },
  );

  return (
    <SalesDocumentDetailClient
      detail={detail}
      ui={buildReceiptDetailUi(lang, ui)}
      documentUi={buildReceiptDetailUi(outputLocale, getReceiptContent(outputLocale))}
      shellActiveItem="receipts"
      listHref={`/${lang}/receipts`}
    />
  );
}
