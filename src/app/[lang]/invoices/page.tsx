import { requireActiveOrg } from "@/lib/guards";
import { getListPageSize } from "@/lib/display-settings.server";
import { getInvoices } from "@/lib/db/invoices";
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
  const tab = Math.min(2, Math.max(0, Number(sp.tab ?? "0") || 0));
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const query = sp.q?.trim() || undefined;
  const filter = TAB_FILTERS[tab];
  const issueFlag = parseFlag(sp.issueFlag);
  const paymentFlag = parseFlag(sp.paymentFlag);

  const { invoices, total } = await getInvoices(scope.orgId, {
    statusIn: filter.statusIn ? [...filter.statusIn] : undefined,
    trashed: filter.trashed,
    issueFlag,
    paymentFlag,
    query,
    page,
    pageSize,
  });

  let unpaidTotal = 0;
  let overdueTotal = 0;
  const today = new Date().toISOString().slice(0, 10);

  if (tab === 0) {
    const { invoices: openInvoices } = await getInvoices(scope.orgId, {
      statusIn: ["draft", "issued", "sent", "overdue"],
      pageSize: 500,
    });
    for (const inv of openInvoices) {
      const remaining = Number(inv.total ?? 0) - Number(inv.paid_amount ?? 0);
      if (remaining <= 0) continue;
      unpaidTotal += remaining;
      if (inv.payment_due && String(inv.payment_due) < today) overdueTotal += remaining;
    }
  }

  const rows: InvoiceListRow[] = invoices.map((inv) => ({
    id: inv.id as string,
    documentNumber: (inv.document_number as string) ?? "",
    clientName: ((inv.clients as { name?: string } | null)?.name as string) ?? "",
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
