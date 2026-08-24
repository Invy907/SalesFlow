import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getDeliveryNoteById } from "@/lib/db/delivery-notes";
import { getCompanyProfile } from "@/lib/db/company";
import { buildDeliveryNoteDetailUi } from "@/lib/documents/build-detail-ui";
import { mapSalesDocumentDetail } from "@/lib/documents/map-document-detail";
import { SalesDocumentDetailClient } from "@/components/sales-document-detail-client";
import { getDeliveryNoteContent } from "../content";

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
  const detail = mapSalesDocumentDetail(
    note as Parameters<typeof mapSalesDocumentDetail>[0],
    note.delivery_note_line_items as Parameters<typeof mapSalesDocumentDetail>[1],
    {
      companyName: profile?.company_name_line1 ?? "",
      tel: profile?.tel ?? "",
      email: profile?.email ?? "",
    },
    { secondaryDate: (note.delivery_date as string | null) ?? undefined },
  );

  return (
    <SalesDocumentDetailClient
      detail={detail}
      ui={buildDeliveryNoteDetailUi(lang, ui)}
      shellActiveItem="delivery-notes"
      listHref={`/${lang}/delivery-notes`}
    />
  );
}
