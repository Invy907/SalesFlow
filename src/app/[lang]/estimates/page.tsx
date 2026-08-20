import { requireActiveOrg } from "@/lib/guards";
import { getEstimates } from "@/lib/db/estimates";
import { EstimatesList, type EstimateListRow } from "./estimates-list";

export const dynamic = "force-dynamic";

const TAB_FILTERS = [
  { statusIn: ["draft", "issued", "sent", "overdue"] as const, trashed: false },
  { statusIn: ["confirmed"] as const, trashed: false },
  { statusIn: undefined, trashed: true },
] as const;

export default async function EstimatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const tab = Math.min(2, Math.max(0, Number(sp.tab ?? "0") || 0));
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const query = sp.q?.trim() || undefined;
  const filter = TAB_FILTERS[tab];

  const { estimates, total } = await getEstimates(scope.orgId, {
    statusIn: filter.statusIn ? [...filter.statusIn] : undefined,
    trashed: filter.trashed,
    query,
    page,
    pageSize: 30,
  });

  const rows: EstimateListRow[] = estimates.map((e) => ({
    id: e.id as string,
    documentNumber: (e.document_number as string) ?? "",
    clientName: ((e.clients as { name?: string } | null)?.name as string) ?? "",
    subject: (e.subject as string) ?? "",
    issueDate: (e.issue_date as string) ?? "",
    total: Number(e.total ?? 0),
    status: (e.status as string) ?? "draft",
  }));

  return (
    <EstimatesList
      rows={rows}
      total={total}
      page={page}
      pageSize={30}
      activeTab={tab}
      query={query ?? ""}
    />
  );
}
