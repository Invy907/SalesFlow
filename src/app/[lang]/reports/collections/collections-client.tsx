"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonthFieldInput } from "@/components/month-field-input";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { fromMonthField, getReportsContent, toMonthField } from "../content";
import { ReportsInfoIcon, ReportsLearnMoreLink, ReportsSubNav } from "../reports-shared";
import type { CollectionsReport } from "@/lib/db/reports";

const yen = (v: number) => `¥${Math.round(v).toLocaleString("ja-JP")}`;

export function CollectionsClient({ report }: { report: CollectionsReport }) {
  const { lang } = useLanguage();
  const ui = getReportsContent(lang);
  const page = ui.collections;
  const router = useRouter();
  const [month, setMonth] = useState(toMonthField(report.month));

  const columns = (row: {
    prevUncollected: number;
    thisMonth: number;
    nextMonth: number;
    afterNext: number;
  }) => [row.prevUncollected, row.thisMonth, row.nextMonth, row.afterNext];

  return (
    <SalesFlowShell activeItem="reports">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ReportsSubNav active="collections" />

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
              <MonthFieldInput value={month} onChange={setMonth} className="field w-[140px] bg-white" />
            </label>
            <button
              type="button"
              onClick={() =>
                router.push(`/reports/collections?month=${fromMonthField(month)}`)
              }
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
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    {page.headers[0]}
                  </th>
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
                  {columns(report.totals).map((value, i) => (
                    <td
                      key={page.headers[i + 1]}
                      className="px-4 py-4 text-right tabular-nums text-slate-900"
                    >
                      {yen(value)}
                    </td>
                  ))}
                </tr>

                {report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={page.headers.length} className="px-4 py-12 text-center text-slate-300">
                      {page.empty}
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row) => (
                    <tr key={row.clientId} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-4 text-slate-700">{row.clientName || page.noClient}</td>
                      {columns(row).map((value, i) => (
                        <td
                          key={`${row.clientId}-${i}`}
                          className="px-4 py-4 text-right tabular-nums text-slate-600"
                        >
                          {yen(value)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}
