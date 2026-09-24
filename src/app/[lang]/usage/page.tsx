import Link from "next/link";
import { notFound } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { requireActiveOrg } from "@/lib/guards";
import { isAppLocale } from "@/lib/locale";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getUsageContent } from "./content";

export const dynamic = "force-dynamic";

export default async function UsagePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isAppLocale(lang)) notFound();
  const scope = await requireActiveOrg(lang);
  const ui = getUsageContent(lang);
  const now = new Date();
  const monthParts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(monthParts.find((part) => part.type === "year")?.value);
  const month = Number(monthParts.find((part) => part.type === "month")?.value);
  // JST midnight is 15:00 UTC on the preceding date, including year boundaries.
  const start = new Date(Date.UTC(year, month - 1, 1, -9)).toISOString();
  const end = new Date(Date.UTC(year, month, 1, -9)).toISOString();
  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase.from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", scope.orgId)
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) throw new Error(error.message);
  if (count === null) throw new Error("Invoice usage count was not returned");
  const numberLocale = lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : "en-US";
  const monthLabel = new Intl.DateTimeFormat(numberLocale, { timeZone: "Asia/Tokyo", year: "numeric", month: "long" }).format(now);

  return (
    <SalesFlowShell activeItem="history">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{ui.intro}</p>

        <section className="mt-10 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#dbe8f3] px-5 py-3.5">
            <h2 className="text-[18px] font-semibold text-slate-800">{ui.currentMonth}</h2>
            <span className="text-sm text-slate-600">{monthLabel}</span>
          </div>
          <div className="px-5 py-5">
            <h3 className="border-b border-slate-200 pb-3 text-[15px] font-semibold text-slate-800">{ui.invoiceSection}</h3>
            <dl className="mt-4 w-full max-w-[260px] overflow-hidden rounded border border-slate-200">
              <dt className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm text-slate-600">{ui.createdCount}</dt>
              <dd className="flex flex-wrap items-baseline justify-center gap-2 px-3 py-5">
                <span className="min-w-0 max-w-full break-all text-[32px] font-bold tabular-nums text-slate-900">{count.toLocaleString(numberLocale)}</span>
                <span className="text-sm text-slate-600">{ui.countUnit}</span>
              </dd>
            </dl>
            <p className="mt-4 text-sm leading-6 text-slate-500">{ui.countDefinition}</p>
            <Link href={`/${lang}/invoices`} className="mt-4 inline-block text-sm font-medium text-[#0A4D34] hover:underline">{ui.invoiceList} →</Link>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="bg-[#dbe8f3] px-5 py-3.5">
            <h2 className="text-[18px] font-semibold text-slate-800">{ui.billingSection}</h2>
          </div>
          <div className="space-y-3 px-5 py-5 text-[15px] leading-7 text-slate-600">
            <p>{ui.billingUnavailable}</p>
            <p>{ui.serviceUsageUnavailable}</p>
          </div>
        </section>
      </div>
    </SalesFlowShell>
  );
}
