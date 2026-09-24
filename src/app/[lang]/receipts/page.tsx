import { redirect } from "next/navigation";
import { documentRecipientName, parseListInteger } from "@/lib/document-list-state";
import { requireActiveOrg } from "@/lib/guards";
import { getListPageSize } from "@/lib/display-settings.server";
import { getReceipts } from "@/lib/db/receipts";
import { ReceiptsList, type ReceiptListRow } from "./receipts-list";

export const dynamic = "force-dynamic";

const TAB_FILTERS = [
  { statusIn: ["draft", "issued", "sent"], trashed: false },
  { statusIn: ["confirmed"], trashed: false },
  { statusIn: undefined, trashed: true },
] as const;

function parseFlag(value: string | undefined): boolean | undefined {
  if (value === "1") return true;
  if (value === "0") return false;
  return undefined;
}

export default async function ReceiptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string; q?: string; page?: string; issueFlag?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const pageSize = await getListPageSize(scope.orgId);
  const sp = await searchParams;
  const tab = parseListInteger(sp.tab, 0, 2);
  const page = parseListInteger(sp.page, 1);
  const query = sp.q?.trim() || undefined;
  const filter = TAB_FILTERS[tab];
  const issueFlag = tab === 2 ? undefined : parseFlag(sp.issueFlag);

  const { receipts, total } = await getReceipts(scope.orgId, {
    statusIn: filter.statusIn ? [...filter.statusIn] : undefined,
    trashed: filter.trashed,
    issueFlag,
    query,
    page,
    pageSize,
  });

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page > lastPage) {
    const params = new URLSearchParams();
    if (tab) params.set("tab", String(tab));
    if (query) params.set("q", query);
    if (issueFlag !== undefined) params.set("issueFlag", issueFlag ? "1" : "0");
    if (lastPage > 1) params.set("page", String(lastPage));
    redirect(`/${lang}/receipts${params.size ? `?${params}` : ""}`);
  }

  const rows: ReceiptListRow[] = receipts.map((r) => ({
    id: r.id as string,
    documentNumber: (r.document_number as string) ?? "",
    clientName: documentRecipientName(r.recipient_snapshot, (r.clients as { name?: string } | null)?.name),
    subject: (r.subject as string) ?? "",
    issueDate: (r.issue_date as string) ?? "",
    transactionDate: (r.transaction_date as string) ?? "",
    total: Number(r.total ?? 0),
    status: (r.status as string) ?? "draft",
    issued: Boolean(r.issued_marked_at),
  }));

  return (
    <ReceiptsList
      key={JSON.stringify([tab, page, query, issueFlag])}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      activeTab={tab}
      query={query ?? ""}
      issueFlag={issueFlag}
    />
  );
}
