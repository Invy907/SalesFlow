import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getReceiptById } from "@/lib/db/receipts";
import { getClientOptions } from "@/lib/db/clients";
import { getItems } from "@/lib/db/items";
import { buildSimpleDocumentFormInitial } from "@/lib/documents/simple-document-form";
import { getSimpleDocumentDefaults } from "../../../documents/form-defaults";
import { NewReceiptClient } from "../../new/new-receipt-client";

export const dynamic = "force-dynamic";

export default async function EditReceiptPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);
  const document = await getReceiptById(id).catch(() => null);
  if (!document || document.organization_id !== scope.orgId) notFound();
  const [clients, itemList, defaults] = await Promise.all([
    getClientOptions(scope.orgId),
    getItems(scope.orgId, { pageSize: 500 }),
    getSimpleDocumentDefaults(scope.orgId, "receipt"),
  ]);
  const initial = buildSimpleDocumentFormInitial(document, document.receipt_line_items, "transaction_date");
  return <NewReceiptClient
    key={id}
    documentId={id}
    initial={initial}
    defaults={defaults}
    clients={clients}
    items={itemList.items.map((item) => ({ id: item.id, name: item.name, unit: item.unit, unitPrice: Number(item.unit_price), taxCategory: item.tax_category, withholdingExempt: Boolean(item.withholding_exempt) }))}
  />;
}
