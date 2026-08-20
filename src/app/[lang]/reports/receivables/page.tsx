import { requireActiveOrg } from "@/lib/guards";
import { currentMonthKey, getReceivablesReport } from "@/lib/db/reports";
import { ReceivablesClient } from "./receivables-client";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function ReportsReceivablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const requested = (sp.month ?? "").replace("/", "-");
  const month = MONTH_RE.test(requested) ? requested : currentMonthKey();

  const report = await getReceivablesReport(scope.orgId, month);

  return <ReceivablesClient report={report} />;
}
