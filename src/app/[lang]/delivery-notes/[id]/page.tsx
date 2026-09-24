import { getDocumentSealUrl } from "@/lib/documents/seal-url";
import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getDeliveryNoteById } from "@/lib/db/delivery-notes";
import { getCompanyProfile } from "@/lib/db/company";
import { buildDeliveryNoteDetailUi } from "@/lib/documents/build-detail-ui";
import { mapSalesDocumentDetail } from "@/lib/documents/map-document-detail";
import { SalesDocumentDetailClient } from "@/components/sales-document-detail-client";
import { getDeliveryNoteContent } from "../content";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";

export const dynamic = "force-dynamic";

export default async function DeliveryNoteDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);

  const [note, profile] = await Promise.all([
    getDeliveryNoteById(id),
    getCompanyProfile(scope.orgId),
  ]);
  if (!note || note.organization_id !== scope.orgId) notFound();

  const ui = getDeliveryNoteContent(lang);
  const outputLocale = normalizeDocumentOutputLocale(note.output_locale);
  const detail = mapSalesDocumentDetail(
    note as Parameters<typeof mapSalesDocumentDetail>[0],
    note.delivery_note_line_items as Parameters<typeof mapSalesDocumentDetail>[1],
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
      sealUrl: note.show_seal !== false ? await getDocumentSealUrl(profile?.seal_path) : null,
    },
    { documentType: "delivery_note", secondaryDate: (note.delivery_date as string | null) ?? undefined },
  );

  return (
    <SalesDocumentDetailClient
      detail={detail}
      ui={buildDeliveryNoteDetailUi(lang, ui)}
      documentUi={buildDeliveryNoteDetailUi(
        outputLocale,
        getDeliveryNoteContent(outputLocale),
      )}
      shellActiveItem="delivery-notes"
      listHref={`/${lang}/delivery-notes`}
    />
  );
}
