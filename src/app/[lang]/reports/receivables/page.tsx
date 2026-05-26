"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getReportsContent } from "../content";
import { ReportsInfoIcon, ReportsLearnMoreLink, ReportsSubNav } from "../reports-shared";

export default function ReportsReceivablesPage() {
  const { lang } = useLanguage();
  const ui = getReportsContent(lang);
  const page = ui.receivables;

  return (
    <SalesFlowShell activeItem="reports">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ReportsSubNav active="receivables" />

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{page.title}</h1>
            <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-slate-600">
              {page.intro}
              <ReportsLearnMoreLink label={page.learnMore} />
            </p>
          </div>

          <div className="flex items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-slate-600">
                {page.aggregationMonth}
              </span>
              <div className="flex items-center gap-2">
                <input className="field w-[140px] bg-white" defaultValue={page.sampleMonth} readOnly />
                <CalendarIcon />
              </div>
            </label>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-4 py-3 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {page.apply}
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc]">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{page.headers[0]}</th>
                  {page.headers.slice(1).map((header) => (
                    <th key={header} className="px-4 py-3 text-right font-semibold text-slate-700">
                      {header}
                      <ReportsInfoIcon />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 bg-white font-semibold">
                  <td className="px-4 py-4 text-slate-900">{page.total}</td>
                  {page.headers.slice(1).map((header) => (
                    <td key={header} className="px-4 py-4 text-right text-slate-900">
                      {ui.sampleZero}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-slate-400">
      <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.75A2.25 2.25 0 0 1 18 6.25v9.5A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75v-9.5A2.25 2.25 0 0 1 4.25 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1.5 4.5v9c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-9H4.25Z" />
    </svg>
  );
}
