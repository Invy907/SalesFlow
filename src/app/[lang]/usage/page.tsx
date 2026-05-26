"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getUsageContent } from "./content";

export default function UsagePage() {
  const { lang } = useLanguage();
  const ui = getUsageContent(lang);

  return (
    <SalesFlowShell activeItem="history">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{ui.intro}</p>
        <a
          href="#"
          className="mt-5 inline-flex items-center gap-2 rounded bg-[#14a7bb] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]"
        >
          {ui.inquireBilling}
          <ExternalLinkIcon />
        </a>

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex items-center justify-between bg-[#dbe8f3] px-5 py-3.5">
              <h2 className="text-[18px] font-semibold text-slate-800">{ui.currentMonth}</h2>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-[15px] font-medium text-[#14a7bb] hover:underline"
              >
                {ui.planUpgrade}
                <ExternalLinkIcon />
              </a>
            </div>

            <div className="px-5 py-5">
              <h3 className="border-b border-slate-200 pb-3 text-[15px] font-semibold text-slate-800">
                {ui.invoiceSection}
              </h3>
              <div className="mt-4 flex flex-wrap gap-4">
                <UsageStatCard label={ui.createdCount} value={ui.sampleCreated} unit={ui.countUnit} />
                <UsageStatCard label={ui.freeAllowance} value={ui.sampleFree} unit={ui.countUnit} />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="bg-[#dbe8f3] px-5 py-3">
              <h2 className="text-[18px] font-semibold text-slate-800">{ui.mailingSection}</h2>
            </div>

            <div className="px-6 py-4">
              <MonthNavLink label={ui.previousMonth} />
            </div>

            <div className="overflow-x-auto px-6">
              <table className="w-full min-w-[640px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc]">
                    {ui.tableHeaders.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left font-semibold text-slate-700"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center text-slate-400">
                      {ui.emptyBilling}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4">
              <MonthNavLink label={ui.previousMonth} />
            </div>

            <a
              href="#"
              className="flex items-center justify-center gap-2 bg-[#14a7bb] px-6 py-4 text-[16px] font-semibold text-white transition hover:bg-[#1096a8]"
            >
              {ui.planUpgrade}
              <ExternalLinkIcon />
            </a>
          </section>
        </div>
      </div>
    </SalesFlowShell>
  );
}

function UsageStatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="w-[188px] shrink-0 overflow-hidden rounded-sm border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[#dbe8f3] px-3 py-2.5 text-center text-[13px] font-medium text-slate-600">
        {label}
      </div>
      <div className="flex items-baseline justify-center gap-1 bg-white px-3 py-4">
        <span className="text-[28px] font-bold leading-none tracking-tight text-slate-900">{value}</span>
        <span className="text-[14px] font-medium text-slate-600">{unit}</span>
      </div>
    </div>
  );
}

function MonthNavLink({ label }: { label: string }) {
  return (
    <a href="#" className="text-[14px] text-[#14a7bb] hover:underline">
      &lt; {label}
    </a>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
      <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
    </svg>
  );
}
