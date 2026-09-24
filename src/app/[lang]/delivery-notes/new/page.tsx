import { getSimpleDocumentDefaults } from "../../documents/form-defaults";
import { requireActiveOrg } from "@/lib/guards";
import { getClientOptions } from "@/lib/db/clients";
import { getEstimateById } from "@/lib/db/estimates";
import { getItems } from "@/lib/db/items";
import { buildConvertedSimpleDocumentFormInitial } from "@/lib/documents/simple-document-form";
import type { ItemOption } from "../../documents/new-document-shared";
import { NewDeliveryNoteClient, type DeliveryNoteFormInitial } from "./new-delivery-note-client";

function toItemOptions(items: Array<Record<string, unknown>>): ItemOption[] {
  return items.map((it) => ({
    id: it.id as string,
    name: (it.name as string) ?? "",
    unit: (it.unit as string | null) ?? null,
    unitPrice: Number(it.unit_price ?? 0),
    taxCategory: (it.tax_category as string) ?? "follow_company",
    withholdingExempt: Boolean(it.withholding_exempt),
  }));
}

export const dynamic = "force-dynamic";

/** 見積書からの変換(?fromEstimate=<id>). */
async function buildFromEstimateInitial(
  orgId: string,
  estimateId: string,
): Promise<DeliveryNoteFormInitial | null> {
  const source = await getEstimateById(estimateId).catch(() => null);
  if (!source || source.organization_id !== orgId) return null;

  return buildConvertedSimpleDocumentFormInitial(source, source.estimate_line_items ?? []);
}

export default async function NewDeliveryNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ fromEstimate?: string; clientId?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const { fromEstimate, clientId } = await searchParams;

  const [clients, initial, itemList, defaults] = await Promise.all([
    getClientOptions(scope.orgId),
    fromEstimate ? buildFromEstimateInitial(scope.orgId, fromEstimate) : Promise.resolve(null),
    getItems(scope.orgId, { pageSize: 500 }),
    getSimpleDocumentDefaults(scope.orgId, "delivery_note"),
  ]);

  const prefilledClient = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const resolvedInitial =
    initial ?? (prefilledClient ? {
      clientId: prefilledClient.id, clientName: prefilledClient.name,
      recipient: { postalCode: prefilledClient.postalCode ?? "", addressLine1: prefilledClient.addressLine1 ?? "",
        addressLine2: prefilledClient.addressLine2 ?? "", companyName: prefilledClient.name,
        department: prefilledClient.department ?? "", phone: prefilledClient.phone ?? "" },
    } : undefined);

  return (
    <NewDeliveryNoteClient
      key={fromEstimate ?? clientId ?? "new"}
      clients={clients}
      defaults={defaults}
      initial={resolvedInitial}
      items={toItemOptions(itemList.items)}
    />
  );
}
