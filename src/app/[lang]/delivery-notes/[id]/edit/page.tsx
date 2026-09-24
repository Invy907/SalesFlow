import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getDeliveryNoteById } from "@/lib/db/delivery-notes";
import { getClientOptions } from "@/lib/db/clients";
import { getItems } from "@/lib/db/items";
import { buildSimpleDocumentFormInitial } from "@/lib/documents/simple-document-form";
import { getSimpleDocumentDefaults } from "../../../documents/form-defaults";
import { NewDeliveryNoteClient } from "../../new/new-delivery-note-client";

export const dynamic = "force-dynamic";

export default async function EditDeliveryNotePage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);
  const document = await getDeliveryNoteById(id).catch(() => null);
  if (!document || document.organization_id !== scope.orgId) notFound();
  const [clients, itemList, defaults] = await Promise.all([
    getClientOptions(scope.orgId),
    getItems(scope.orgId, { pageSize: 500 }),
    getSimpleDocumentDefaults(scope.orgId, "delivery_note"),
  ]);
  const initial = buildSimpleDocumentFormInitial(document, document.delivery_note_line_items, "delivery_date");
  return <NewDeliveryNoteClient
    key={id}
    documentId={id}
    initial={initial}
    defaults={defaults}
    clients={clients}
    items={itemList.items.map((item) => ({ id: item.id, name: item.name, unit: item.unit, unitPrice: Number(item.unit_price), taxCategory: item.tax_category, withholdingExempt: Boolean(item.withholding_exempt) }))}
  />;
}
