import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentStatus } from "./estimates";

/**
 * 홈 대시보드 집계.
 *
 * RLS(auth_org_ids) 기준 활성 org 전체 문서를 집계한다.
 */

export type DocKind = "estimate" | "invoice" | "delivery_note" | "receipt";

/** 문구는 클라이언트가 locale 템플릿으로 조립하므로 숫자·키만 담는다. */
export type TaskItem = {
  id: string;
  docKind: DocKind;
  clientName: string;
  documentNumber: string;
  amount: number;
  href: string;
  /** dueSoon/awaitingPayment: 기한까지 남은 일수(음수면 초과). unsent: 초안으로 머문 일수. */
  dayDiff: number;
};

export type RecentItem = {
  id: string;
  docKind: DocKind;
  clientName: string;
  documentNumber: string;
  amount: number;
  status: string;
  href: string;
  /** 지금으로부터 경과한 분. 클라이언트가 "10분 전" 같은 문구로 변환. */
  minutesAgo: number;
};

export type Dashboard = {
  kpi: {
    billedThisMonth: number;
    billedLastMonth: number;
    unpaidTotal: number;
    unpaidCount: number;
    draftCount: number;
    awaitingCount: number;
    dueSoonCount: number;
    overdueCount: number;
  };
  tasks: {
    dueSoon: TaskItem[];
    unsent: TaskItem[];
    awaitingPayment: TaskItem[];
  };
  recent: RecentItem[];
};

const OPEN_STATUSES: DocumentStatus[] = ["draft", "issued", "sent", "overdue"];
const DAY_MS = 86_400_000;

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** 로컬 자정 기준 일수 차이. 날짜 문자열(YYYY-MM-DD) 비교용. */
function dayDiffFromToday(dateKey: string, todayKey: string) {
  return Math.round((Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / DAY_MS);
}

type ClientRef = { name?: string | null } | { name?: string | null }[] | null;

function clientName(ref: ClientRef): string {
  if (!ref) return "";
  const row = Array.isArray(ref) ? ref[0] : ref;
  return row?.name ?? "";
}

export async function getDashboard(orgId: string): Promise<Dashboard> {
  const supabase = await getSupabaseServerClient();

  const now = new Date();
  const todayKey = toDateKey(now);
  const monthStart = toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
  const nextMonthStart = toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)));
  const lastMonthStart = toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1)));

  const recentSelect = "id, document_number, status, total, updated_at, clients(name)";

  const [
    thisMonth,
    lastMonth,
    open,
    draftEstimates,
    draftDeliveryNotes,
    recentEstimates,
    recentInvoices,
    recentDeliveryNotes,
    recentReceipts,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("total")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("issue_date", monthStart)
      .lt("issue_date", nextMonthStart),
    supabase
      .from("invoices")
      .select("total")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("issue_date", lastMonthStart)
      .lt("issue_date", monthStart),
    supabase
      .from("invoices")
      .select("id, document_number, status, total, paid_amount, payment_due, clients(name)")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .in("status", OPEN_STATUSES)
      .limit(500),
    supabase
      .from("estimates")
      .select("id, document_number, total, issue_date, clients(name)")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .eq("status", "draft")
      .order("issue_date", { ascending: true })
      .limit(20),
    supabase
      .from("delivery_notes")
      .select("id, document_number, total, issue_date, clients(name)")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .eq("status", "draft")
      .order("issue_date", { ascending: true })
      .limit(20),
    supabase
      .from("estimates")
      .select(recentSelect)
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("invoices")
      .select(recentSelect)
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("delivery_notes")
      .select(recentSelect)
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("receipts")
      .select(recentSelect)
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  for (const result of [
    thisMonth,
    lastMonth,
    open,
    draftEstimates,
    draftDeliveryNotes,
    recentEstimates,
    recentInvoices,
    recentDeliveryNotes,
    recentReceipts,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const sumTotal = (rows: { total?: number | null }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0);

  let unpaidTotal = 0;
  let unpaidCount = 0;
  let draftCount = 0;
  let awaitingCount = 0;
  let dueSoonCount = 0;
  let overdueCount = 0;
  const dueSoon: TaskItem[] = [];
  const awaitingPayment: TaskItem[] = [];

  for (const inv of open.data ?? []) {
    const status = String(inv.status ?? "draft");
    if (status === "draft") draftCount += 1;
    if (status === "issued" || status === "sent") awaitingCount += 1;

    const remaining = Number(inv.total ?? 0) - Number(inv.paid_amount ?? 0);
    if (remaining <= 0) continue;
    unpaidTotal += remaining;
    unpaidCount += 1;

    const due = inv.payment_due ? String(inv.payment_due) : null;
    if (!due) continue;

    const diff = dayDiffFromToday(due, todayKey);
    const item: TaskItem = {
      id: String(inv.id),
      docKind: "invoice",
      clientName: clientName(inv.clients as ClientRef),
      documentNumber: String(inv.document_number ?? ""),
      amount: remaining,
      href: "/invoices",
      dayDiff: diff,
    };

    if (diff < 0) {
      overdueCount += 1;
      awaitingPayment.push(item);
    } else if (diff <= 7) {
      dueSoonCount += 1;
      dueSoon.push(item);
    }
  }

  dueSoon.sort((a, b) => a.dayDiff - b.dayDiff);
  awaitingPayment.sort((a, b) => a.dayDiff - b.dayDiff);

  const draftTask = (
    rows: { id: unknown; document_number: unknown; total: unknown; issue_date: unknown; clients: ClientRef }[],
    docKind: DocKind,
    href: string,
  ): TaskItem[] =>
    rows.map((row) => ({
      id: String(row.id),
      docKind,
      clientName: clientName(row.clients),
      documentNumber: String(row.document_number ?? ""),
      amount: Number(row.total ?? 0),
      href: docKind === "estimate" ? `/estimates/${String(row.id)}` : href,
      dayDiff: row.issue_date ? -dayDiffFromToday(String(row.issue_date), todayKey) : 0,
    }));

  const unsent = [
    ...draftTask(
      (draftEstimates.data ?? []) as Parameters<typeof draftTask>[0],
      "estimate",
      "/estimates",
    ),
    ...draftTask(
      (draftDeliveryNotes.data ?? []) as Parameters<typeof draftTask>[0],
      "delivery_note",
      "/delivery-notes",
    ),
  ]
    .sort((a, b) => b.dayDiff - a.dayDiff)
    .slice(0, 8);

  const nowMs = now.getTime();
  const toRecent = (
    rows: {
      id: unknown;
      document_number: unknown;
      status: unknown;
      total: unknown;
      updated_at: unknown;
      clients: ClientRef;
    }[],
    docKind: DocKind,
    href: string,
  ): RecentItem[] =>
    rows.map((row) => ({
      id: String(row.id),
      docKind,
      clientName: clientName(row.clients),
      documentNumber: String(row.document_number ?? ""),
      amount: Number(row.total ?? 0),
      status: String(row.status ?? "draft"),
      href: docKind === "estimate" ? `/estimates/${String(row.id)}` : href,
      minutesAgo: Math.max(0, Math.round((nowMs - Date.parse(String(row.updated_at))) / 60_000)),
    }));

  type RecentRows = Parameters<typeof toRecent>[0];
  const recent = [
    ...toRecent((recentEstimates.data ?? []) as RecentRows, "estimate", "/estimates"),
    ...toRecent((recentInvoices.data ?? []) as RecentRows, "invoice", "/invoices"),
    ...toRecent((recentDeliveryNotes.data ?? []) as RecentRows, "delivery_note", "/delivery-notes"),
    ...toRecent((recentReceipts.data ?? []) as RecentRows, "receipt", "/receipts"),
  ]
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 8);

  return {
    kpi: {
      billedThisMonth: sumTotal(thisMonth.data),
      billedLastMonth: sumTotal(lastMonth.data),
      unpaidTotal,
      unpaidCount,
      draftCount,
      awaitingCount,
      dueSoonCount,
      overdueCount,
    },
    tasks: { dueSoon: dueSoon.slice(0, 8), unsent, awaitingPayment: awaitingPayment.slice(0, 8) },
    recent,
  };
}
