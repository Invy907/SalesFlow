"use client";

import { useState } from "react";
import { MonthFieldInput } from "@/components/month-field-input";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getReportsContent } from "./content";
import { ReportsSubNav } from "./reports-shared";

export default function ReportsPage() {
  const { lang } = useLanguage();
  const ui = getReportsContent(lang);
  const main = ui.main;
  const [periodFrom, setPeriodFrom] = useState<string>(main.periodFrom);
  const [periodTo, setPeriodTo] = useState<string>(main.periodTo);
  const legends = [
    { key: "previous", label: main.legendPrevious, color: "bg-slate-400" },
    { key: "unpaid", label: main.legendUnpaid, color: "bg-[#f59b45]" },
    { key: "paid", label: main.legendPaid, color: "bg-[#14a7bb]" },
  ] as const;

  return (
    <SalesFlowShell activeItem="reports">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ReportsSubNav active="main" />
        <h1 className="mt-8 text-[30px] font-bold tracking-tight text-slate-900">{main.title}</h1>

        <div className="mt-6 rounded border border-slate-200 bg-[#f8fafc] px-5 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-slate-600">{main.client}</span>
              <select className="field min-w-[180px] bg-white">
                <option>{main.allClients}</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-slate-600">&nbsp;</span>
                <MonthFieldInput value={periodFrom} onChange={setPeriodFrom} />
              </label>
              <span className="pb-3 text-slate-500">～</span>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-slate-600">&nbsp;</span>
                <MonthFieldInput value={periodTo} onChange={setPeriodTo} />
              </label>
            </div>
            <button
              type="button"
              className="rounded bg-[#14a7bb] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#1096a8]"
            >
              {main.filter}
            </button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <h2 className="text-[16px] font-semibold text-slate-800">{main.chartTitle}</h2>
            <div className="flex flex-wrap gap-4 text-[13px] text-slate-600">
              {legends.map((item) => (
                <span key={item.key} className="inline-flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-sm ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative h-[280px] px-4 py-6 sm:px-8">
            <div className="absolute inset-x-8 top-6 bottom-12 border-l border-b border-slate-200">
              {[5, 4, 3, 2, 1, 0].map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 w-full border-t border-slate-100"
                  style={{ bottom: `${(tick / 5) * 100}%` }}
                >
                  <span className="absolute -left-6 -top-2 text-[11px] text-slate-400">{tick}</span>
                </div>
              ))}
              <div className="absolute -bottom-8 left-0 flex w-full justify-between text-[11px] text-slate-400">
                {ui.monthLabels.map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc]">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{main.summaryMonth}</th>
                  {ui.monthLabels.map((month) => (
                    <th key={month} className="px-3 py-3 text-right font-semibold text-slate-700">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {legends.map((item) => (
                  <tr key={item.key} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                    </td>
                    {ui.monthLabels.map((month) => (
                      <td key={`${item.key}-${month}`} className="px-3 py-3 text-right text-slate-500">
                        {ui.sampleZero}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-[16px] font-semibold text-slate-800">{main.topClientsTitle}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc]">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{main.topClientsClient}</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">{main.topClientsTotal}</th>
                  {ui.monthLabels.map((month) => (
                    <th key={month} className="px-3 py-3 text-right font-semibold text-slate-700">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-300">
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SalesFlowShell>
  );
}
