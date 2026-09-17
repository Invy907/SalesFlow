import { requireActiveOrg } from "@/lib/guards";
import { getClientOptions } from "@/lib/db/clients";
import { getItems } from "@/lib/db/items";
import type { ItemOption } from "../../documents/new-document-shared";
import { NewReceiptClient } from "./new-receipt-client";

export const dynamic = "force-dynamic";

function toItemOptions(items: Array<Record<string, unknown>>): ItemOption[] {
  return items.map((it) => ({
    id: it.id as string,
    name: (it.name as string) ?? "",
    unit: (it.unit as string | null) ?? null,
    unitPrice: Number(it.unit_price ?? 0),
    taxCategory: (it.tax_category as string) ?? "follow_company",
  }));
}

export default async function NewReceiptPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const [clients, itemList] = await Promise.all([
    getClientOptions(scope.orgId),
    getItems(scope.orgId, { pageSize: 500 }),
  ]);
  return <NewReceiptClient clients={clients} items={toItemOptions(itemList.items)} />;
}
