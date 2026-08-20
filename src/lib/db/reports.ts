import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 리포트 3탭 집계. 활성 org 전체 문서 기준.
 *
 * 월 키는 "YYYY-MM" 형식으로 주고받고, 내부에서만 "YYYY-MM-01" 경계로 바꿔 쓴다.
 */

export type MonthlyReport = {
  months: string[];
  /** 전년 동월 청구액 */
  previous: number[];
  /** 당월 청구 중 미입금분 */
  unpaid: number[];
  /** 당월 청구 중 입금분 */
  paid: number[];
  topClients: {
    clientId: string;
    clientName: string;
    total: number;
    byMonth: number[];
  }[];
};

export type ReceivablesReport = {
  month: string;
  rows: {
    clientId: string;
    clientName: string;
    openingBalance: number;
    billed: number;
    collected: number;
    closingBalance: number;
  }[];
  totals: { openingBalance: number; billed: number; collected: number; closingBalance: number };
};

export type CollectionsReport = {
  month: string;
  rows: {
    clientId: string;
    clientName: string;
    prevUncollected: number;
    thisMonth: number;
    nextMonth: number;
    afterNext: number;
  }[];
  totals: { prevUncollected: number; thisMonth: number; nextMonth: number; afterNext: number };
};

const NO_CLIENT = "__none__";

/** "YYYY-MM" → 그 달 1일 "YYYY-MM-01" */
function monthStart(month: string) {
  return `${month}-01`;
}

/** "YYYY-MM" 에 offset 개월을 더한 "YYYY-MM" */
export function shiftMonth(month: string, offset: number) {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + offset;
  const year = Math.floor(total / 12);
  const monthIndex = total - year * 12;
  return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** from..to(포함) 월 키 배열. 최대 36개월로 잘라 과도한 스캔을 막는다. */
export function monthRange(from: string, to: string) {
  const months: string[] = [];
  let cursor = from;
  for (let i = 0; i < 36 && cursor <= to; i += 1) {
    months.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return months.length ? months : [from];
}

/** 오늘 기준 최근 12개월 (from, to) */
export function defaultReportPeriod(now = new Date()) {
  const to = currentMonthKey(now);
  return { from: shiftMonth(to, -11), to };
}

type ClientRef = { name?: string | null } | { name?: string | null }[] | null;

function clientName(ref: ClientRef): string {
  if (!ref) return "";
  const row = Array.isArray(ref) ? ref[0] : ref;
  return row?.name ?? "";
}

function monthOf(dateKey: string) {
  return dateKey.slice(0, 7);
}

export async function getMonthlyReport(
  orgId: string,
  opts: { from: string; to: string; clientId?: string },
): Promise<MonthlyReport> {
  const supabase = await getSupabaseServerClient();
  const months = monthRange(opts.from, opts.to);
  const rangeStart = monthStart(shiftMonth(months[0], -12));
  const rangeEnd = monthStart(shiftMonth(months[months.length - 1], 1));

  let q = supabase
    .from("invoices")
    .select("id, client_id, issue_date, total, paid_amount, clients(name)")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .gte("issue_date", rangeStart)
    .lt("issue_date", rangeEnd)
    .limit(5000);

  if (opts.clientId) q = q.eq("client_id", opts.clientId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const index = new Map(months.map((m, i) => [m, i]));
  const previous = months.map(() => 0);
  const unpaid = months.map(() => 0);
  const paid = months.map(() => 0);
  const byClient = new Map<string, { name: string; total: number; byMonth: number[] }>();

  for (const row of data ?? []) {
    const issue = row.issue_date ? String(row.issue_date) : null;
    if (!issue) continue;
    const month = monthOf(issue);
    const total = Number(row.total ?? 0);
    const paidAmount = Math.min(total, Number(row.paid_amount ?? 0));

    const at = index.get(month);
    if (at !== undefined) {
      paid[at] += paidAmount;
      unpaid[at] += total - paidAmount;

      const key = (row.client_id as string | null) ?? NO_CLIENT;
      let entry = byClient.get(key);
      if (!entry) {
        entry = { name: clientName(row.clients as ClientRef), total: 0, byMonth: months.map(() => 0) };
        byClient.set(key, entry);
      }
      entry.total += total;
      entry.byMonth[at] += total;
      continue;
    }

    const shifted = index.get(shiftMonth(month, 12));
    if (shifted !== undefined) previous[shifted] += total;
  }

  const topClients = [...byClient.entries()]
    .map(([clientId, v]) => ({
      clientId,
      clientName: v.name,
      total: v.total,
      byMonth: v.byMonth,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  return { months, previous, unpaid, paid, topClients };
}

/** 청구/입금 원장을 거래처별로 모으는 공통 로더 */
async function loadLedger(orgId: string, before: string) {
  const supabase = await getSupabaseServerClient();

  const [invoices, payments] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, client_id, issue_date, payment_due, total, paid_amount, clients(name)")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .lt("issue_date", before)
      .limit(5000),
    supabase
      .from("payments")
      .select("id, client_id, paid_at, amount")
      .eq("organization_id", orgId)
      .lt("paid_at", before)
      .limit(5000),
  ]);

  if (invoices.error) throw new Error(invoices.error.message);
  if (payments.error) throw new Error(payments.error.message);

  return { invoices: invoices.data ?? [], payments: payments.data ?? [] };
}

export async function getReceivablesReport(
  orgId: string,
  month: string,
): Promise<ReceivablesReport> {
  const start = monthStart(month);
  const end = monthStart(shiftMonth(month, 1));
  const { invoices, payments } = await loadLedger(orgId, end);

  type Row = ReceivablesReport["rows"][number];
  const rows = new Map<string, Row>();

  const ensure = (clientId: string | null, name: string): Row => {
    const key = clientId ?? NO_CLIENT;
    let row = rows.get(key);
    if (!row) {
      row = {
        clientId: key,
        clientName: name,
        openingBalance: 0,
        billed: 0,
        collected: 0,
        closingBalance: 0,
      };
      rows.set(key, row);
    }
    if (!row.clientName && name) row.clientName = name;
    return row;
  };

  for (const inv of invoices) {
    const issue = inv.issue_date ? String(inv.issue_date) : null;
    if (!issue) continue;
    const row = ensure(inv.client_id as string | null, clientName(inv.clients as ClientRef));
    const total = Number(inv.total ?? 0);
    if (issue < start) row.openingBalance += total;
    else row.billed += total;
  }

  for (const pay of payments) {
    const paidAt = pay.paid_at ? String(pay.paid_at) : null;
    if (!paidAt) continue;
    const row = ensure(pay.client_id as string | null, "");
    const amount = Number(pay.amount ?? 0);
    if (paidAt < start) row.openingBalance -= amount;
    else row.collected += amount;
  }

  const list = [...rows.values()]
    .map((row) => ({
      ...row,
      closingBalance: row.openingBalance + row.billed - row.collected,
    }))
    .filter((row) => row.openingBalance || row.billed || row.collected || row.closingBalance)
    .sort((a, b) => b.closingBalance - a.closingBalance);

  const totals = list.reduce(
    (acc, row) => ({
      openingBalance: acc.openingBalance + row.openingBalance,
      billed: acc.billed + row.billed,
      collected: acc.collected + row.collected,
      closingBalance: acc.closingBalance + row.closingBalance,
    }),
    { openingBalance: 0, billed: 0, collected: 0, closingBalance: 0 },
  );

  return { month, rows: list, totals };
}

export async function getCollectionsReport(
  orgId: string,
  month: string,
): Promise<CollectionsReport> {
  const supabase = await getSupabaseServerClient();
  const start = monthStart(month);
  const nextStart = monthStart(shiftMonth(month, 1));
  const afterNextStart = monthStart(shiftMonth(month, 2));

  const { data, error } = await supabase
    .from("invoices")
    .select("id, client_id, payment_due, total, paid_amount, clients(name)")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .limit(5000);

  if (error) throw new Error(error.message);

  type Row = CollectionsReport["rows"][number];
  const rows = new Map<string, Row>();

  for (const inv of data ?? []) {
    const remaining = Number(inv.total ?? 0) - Number(inv.paid_amount ?? 0);
    if (remaining <= 0) continue;

    const key = (inv.client_id as string | null) ?? NO_CLIENT;
    let row = rows.get(key);
    if (!row) {
      row = {
        clientId: key,
        clientName: clientName(inv.clients as ClientRef),
        prevUncollected: 0,
        thisMonth: 0,
        nextMonth: 0,
        afterNext: 0,
      };
      rows.set(key, row);
    }

    const due = inv.payment_due ? String(inv.payment_due) : null;
    if (!due) row.afterNext += remaining;
    else if (due < start) row.prevUncollected += remaining;
    else if (due < nextStart) row.thisMonth += remaining;
    else if (due < afterNextStart) row.nextMonth += remaining;
    else row.afterNext += remaining;
  }

  const list = [...rows.values()].sort(
    (a, b) =>
      b.prevUncollected + b.thisMonth + b.nextMonth + b.afterNext -
      (a.prevUncollected + a.thisMonth + a.nextMonth + a.afterNext),
  );

  const totals = list.reduce(
    (acc, row) => ({
      prevUncollected: acc.prevUncollected + row.prevUncollected,
      thisMonth: acc.thisMonth + row.thisMonth,
      nextMonth: acc.nextMonth + row.nextMonth,
      afterNext: acc.afterNext + row.afterNext,
    }),
    { prevUncollected: 0, thisMonth: 0, nextMonth: 0, afterNext: 0 },
  );

  return { month, rows: list, totals };
}
