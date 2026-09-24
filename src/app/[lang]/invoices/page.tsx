import { redirect } from "next/navigation";
import { documentRecipientName, parseListInteger } from "@/lib/document-list-state";
import { requireActiveOrg } from "@/lib/guards";
import { getListPageSize } from "@/lib/display-settings.server";
import { getInvoices, getInvoiceOutstandingTotals } from "@/lib/db/invoices";
import { InvoicesList, type InvoiceListRow } from "./invoices-list";

export const dynamic = "force-dynamic";

const TAB_FILTERS = [
  { statusIn: ["draft", "issued", "sent", "overdue"] as const, trashed: false },
  { statusIn: ["confirmed"] as const, trashed: false },
  { statusIn: undefined, trashed: true },
] as const;

function parseFlag(value: string | undefined): boolean | undefined {
  if (value === "1") return true;
  if (value === "0") return false;
  return undefined;
}

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string; q?: string; page?: string; issueFlag?: string; paymentFlag?: string }>;
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
  const paymentFlag = tab === 2 ? undefined : parseFlag(sp.paymentFlag);

  const { invoices, total } = await getInvoices(scope.orgId, {
    statusIn: filter.statusIn ? [...filter.statusIn] : undefined,
    trashed: filter.trashed,
    issueFlag,
    paymentFlag,
    query,
    page,
    pageSize,
  });

  const { unpaidTotal, overdueTotal } = tab === 0
    ? await getInvoiceOutstandingTotals(scope.orgId)
    : { unpaidTotal: 0, overdueTotal: 0 };

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page > lastPage) {
    const params = new URLSearchParams();
    if (tab) params.set("tab", String(tab));
    if (query) params.set("q", query);
    if (issueFlag !== undefined) params.set("issueFlag", issueFlag ? "1" : "0");
    if (paymentFlag !== undefined) params.set("paymentFlag", paymentFlag ? "1" : "0");
    if (lastPage > 1) params.set("page", String(lastPage));
    redirect(`/${lang}/invoices${params.size ? `?${params}` : ""}`);
  }

  const rows: InvoiceListRow[] = invoices.map((inv) => ({
    id: inv.id as string,
    documentNumber: (inv.document_number as string) ?? "",
    clientName: documentRecipientName(inv.recipient_snapshot, (inv.clients as { name?: string } | null)?.name),
    subject: (inv.subject as string) ?? "",
    issueDate: (inv.issue_date as string) ?? "",
    paymentDue: (inv.payment_due as string) ?? "",
    total: Number(inv.total ?? 0),
    paidAmount: Number(inv.paid_amount ?? 0),
    status: (inv.status as string) ?? "draft",
    issued: Boolean(inv.issued_marked_at),
    paid: Boolean(inv.payment_marked_at),
  }));

  return (
    <InvoicesList
      key={JSON.stringify([tab, page, query, issueFlag, paymentFlag])}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      activeTab={tab}
      query={query ?? ""}
      issueFlag={issueFlag}
      paymentFlag={paymentFlag}
      unpaidTotal={unpaidTotal}
      overdueTotal={overdueTotal}
    />
  );
}
