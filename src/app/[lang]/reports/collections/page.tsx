"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getReportsContent } from "../content";
import { ReportsInfoIcon, ReportsLearnMoreLink, ReportsSubNav } from "../reports-shared";

export default function ReportsCollectionsPage() {
  const { lang } = useLanguage();
  const ui = getReportsContent(lang);
  const page = ui.collections;

  return (
    <SalesFlowShell activeItem="reports">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ReportsSubNav active="collections" />

        <div className="mt-8">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{page.title}</h1>
          <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-slate-600">
            {page.intro}
            <ReportsLearnMoreLink label={page.learnMore} />
          </p>
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
                <tr className="border-b border-slate-200 bg-[#f8fafc] font-semibold">
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
