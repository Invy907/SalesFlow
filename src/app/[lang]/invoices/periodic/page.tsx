import { requireActiveOrg } from "@/lib/guards";
import { getPeriodicSchedules } from "@/lib/db/periodic-invoices";
import { dateFromRunAt } from "@/lib/periodic/schedule-math";
import { PeriodicList, type PeriodicListRow } from "./periodic-list";

export const dynamic = "force-dynamic";

/** 0 list / 1 trash */
const TAB_TRASHED = [false, true] as const;

export default async function InvoicesPeriodicPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const tab = Math.min(1, Math.max(0, Number(sp.tab ?? "0") || 0));
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const query = sp.q?.trim() || undefined;

  const { schedules, total } = await getPeriodicSchedules(scope.orgId, {
    trashed: TAB_TRASHED[tab],
    query,
    page,
    pageSize: 30,
  });

  const rows: PeriodicListRow[] = schedules.map((s) => ({
    id: s.id,
    clientName: s.clients?.name ?? "",
    subject: s.subject ?? "",
    cycle: s.cycle,
    dayMode: s.day_mode,
    dayValue: s.day_value,
    nextRunDate: s.next_run_at ? dateFromRunAt(s.next_run_at) : null,
    isPaused: s.is_paused,
    emailEnabled: s.email_enabled,
    lastError: s.last_error,
  }));

  return (
    <PeriodicList
      rows={rows}
      total={total}
      page={page}
      pageSize={30}
      activeTab={tab}
      query={query ?? ""}
    />
  );
}
