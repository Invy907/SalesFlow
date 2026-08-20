import { requireActiveOrg } from "@/lib/guards";
import { getClients } from "@/lib/db/clients";
import { defaultReportPeriod, getMonthlyReport } from "@/lib/db/reports";
import { ReportsMainClient } from "./reports-main-client";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

function normalizeMonth(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const normalized = value.replace("/", "-");
  return MONTH_RE.test(normalized) ? normalized : fallback;
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ from?: string; to?: string; clientId?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const fallback = defaultReportPeriod();

  const from = normalizeMonth(sp.from, fallback.from);
  const toCandidate = normalizeMonth(sp.to, fallback.to);
  const to = toCandidate < from ? from : toCandidate;
  const clientId = sp.clientId || undefined;

  const [report, { clients }] = await Promise.all([
    getMonthlyReport(scope.orgId, { from, to, clientId }),
    getClients(scope.orgId, { pageSize: 200 }),
  ]);

  return (
    <ReportsMainClient
      report={report}
      clients={clients.map((c) => ({ id: c.id as string, name: (c.name as string) ?? "" }))}
      from={from}
      to={to}
      clientId={clientId ?? ""}
    />
  );
}
