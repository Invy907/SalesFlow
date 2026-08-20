import { requireActiveOrg } from "@/lib/guards";
import { getReceipts } from "@/lib/db/receipts";
import { ReceiptsList, type ReceiptListRow } from "./receipts-list";

export const dynamic = "force-dynamic";

const TAB_FILTERS = [
  { statusIn: ["draft", "issued", "sent"], trashed: false },
  { statusIn: ["confirmed"], trashed: false },
  { statusIn: undefined, trashed: true },
] as const;

export default async function ReceiptsPage({
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

  const { receipts, total } = await getReceipts(scope.orgId, {
    statusIn: filter.statusIn ? [...filter.statusIn] : undefined,
    trashed: filter.trashed,
    query,
    page,
    pageSize: 30,
  });

  const rows: ReceiptListRow[] = receipts.map((r) => ({
    id: r.id as string,
    documentNumber: (r.document_number as string) ?? "",
    clientName: ((r.clients as { name?: string } | null)?.name as string) ?? "",
    subject: (r.subject as string) ?? "",
    issueDate: (r.issue_date as string) ?? "",
    transactionDate: (r.transaction_date as string) ?? "",
    total: Number(r.total ?? 0),
    status: (r.status as string) ?? "draft",
  }));

  return (
    <ReceiptsList
      rows={rows}
      total={total}
      page={page}
      pageSize={30}
      activeTab={tab}
      query={query ?? ""}
    />
  );
}
