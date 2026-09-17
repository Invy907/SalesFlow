import { requireActiveOrg } from "@/lib/guards";
import { getListPageSize } from "@/lib/display-settings.server";
import { getDeliveryNotes } from "@/lib/db/delivery-notes";
import { DeliveryNotesList, type DeliveryNoteListRow } from "./delivery-notes-list";

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

export default async function DeliveryNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string; q?: string; page?: string; issueFlag?: string; billedFlag?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const pageSize = await getListPageSize(scope.orgId);
  const sp = await searchParams;
  const tab = Math.min(2, Math.max(0, Number(sp.tab ?? "0") || 0));
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const query = sp.q?.trim() || undefined;
  const filter = TAB_FILTERS[tab];
  const issueFlag = parseFlag(sp.issueFlag);
  const billedFlag = parseFlag(sp.billedFlag);

  const { deliveryNotes, total } = await getDeliveryNotes(scope.orgId, {
    statusIn: filter.statusIn ? [...filter.statusIn] : undefined,
    trashed: filter.trashed,
    issueFlag,
    billedFlag,
    query,
    page,
    pageSize,
  });

  const rows: DeliveryNoteListRow[] = deliveryNotes.map((d) => ({
    id: d.id as string,
    documentNumber: (d.document_number as string) ?? "",
    clientName: ((d.clients as { name?: string } | null)?.name as string) ?? "",
    subject: (d.subject as string) ?? "",
    issueDate: (d.issue_date as string) ?? "",
    deliveryDate: (d.delivery_date as string) ?? "",
    total: Number(d.total ?? 0),
    status: (d.status as string) ?? "draft",
    issued: Boolean(d.issued_marked_at),
    billed: Boolean(d.billed_marked_at),
  }));

  return (
    <DeliveryNotesList
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      activeTab={tab}
      query={query ?? ""}
      issueFlag={issueFlag}
      billedFlag={billedFlag}
    />
  );
}
