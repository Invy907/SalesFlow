import { requireActiveOrg } from "@/lib/guards";
import { getClientOptions } from "@/lib/db/clients";
import { getEstimateById } from "@/lib/db/estimates";
import { getItems } from "@/lib/db/items";
import { normalizeClientHonorific } from "@/lib/documents/client-honorific";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";
import { TAX_CATEGORY_TO_LABEL, type TaxCategory } from "@/lib/tax";
import type { ItemOption, LineItemRow } from "../../documents/new-document-shared";
import { NewDeliveryNoteClient, type DeliveryNoteFormInitial } from "./new-delivery-note-client";

function toItemOptions(items: Array<Record<string, unknown>>): ItemOption[] {
  return items.map((it) => ({
    id: it.id as string,
    name: (it.name as string) ?? "",
    unit: (it.unit as string | null) ?? null,
    unitPrice: Number(it.unit_price ?? 0),
    taxCategory: (it.tax_category as string) ?? "follow_company",
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

  const recipient = (source.recipient_snapshot ?? {}) as Record<string, string>;
  const lines: LineItemRow[] = (
    (source.estimate_line_items ?? []) as Array<Record<string, unknown>>
  ).map((line) => ({
    itemId: (line.item_id as string | null) ?? null,
    name: (line.name_snapshot as string) ?? "",
    qty: line.qty === null || line.qty === undefined ? "" : String(line.qty),
    unit: (line.unit_snapshot as string) ?? "",
    price:
      line.unit_price_snapshot === null || line.unit_price_snapshot === undefined
        ? ""
        : String(line.unit_price_snapshot),
    tax: TAX_CATEGORY_TO_LABEL[line.tax_category as TaxCategory] ?? "10%",
  }));

  return {
    clientId: (source.client_id as string | null) ?? null,
    clientName: (source.clients?.name as string) ?? recipient.clientName ?? "",
    subject: (source.subject as string) ?? "",
    clientHonorific: normalizeClientHonorific(source.client_honorific),
    showSeal: source.show_seal !== false,
    outputLocale: normalizeDocumentOutputLocale(source.output_locale),
    templateMessage: (source.template_message as string) ?? "",
    remarks: (source.remarks as string) ?? "",
    recipient,
    lines,
  };
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

  const [clients, initial, itemList] = await Promise.all([
    getClientOptions(scope.orgId),
    fromEstimate ? buildFromEstimateInitial(scope.orgId, fromEstimate) : Promise.resolve(null),
    getItems(scope.orgId, { pageSize: 500 }),
  ]);

  const prefilledClient = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const resolvedInitial =
    initial ?? (prefilledClient ? { clientId: prefilledClient.id, clientName: prefilledClient.name } : undefined);

  return (
    <NewDeliveryNoteClient
      clients={clients}
      initial={resolvedInitial}
      items={toItemOptions(itemList.items)}
    />
  );
}
