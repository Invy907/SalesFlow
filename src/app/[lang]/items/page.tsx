import { requireActiveOrg } from "@/lib/guards";
import { getItems } from "@/lib/db/items";
import { ItemsTable, type ItemRow } from "./items-table";

export const dynamic = "force-dynamic";

export default async function ItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const query = sp.q?.trim() || undefined;

  const { items, total } = await getItems(scope.orgId, { query, page, pageSize: 30 });

  const rows: ItemRow[] = items.map((i) => ({
    id: i.id as string,
    name: (i.name as string) ?? "",
    unit: (i.unit as string) ?? "",
    unitPrice: Number(i.unit_price ?? 0),
    taxCategory: (i.tax_category as string) ?? "follow_company",
    withholdingExempt: Boolean(i.withholding_exempt),
  }));

  return (
    <ItemsTable rows={rows} total={total} page={page} pageSize={30} query={query ?? ""} />
  );
}
