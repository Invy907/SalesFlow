import { requireActiveOrg } from "@/lib/guards";
import { currentMonthKey, getCollectionsReport } from "@/lib/db/reports";
import { CollectionsClient } from "./collections-client";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function ReportsCollectionsPage({
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

  const report = await getCollectionsReport(scope.orgId, month);

  return <CollectionsClient report={report} />;
}
