"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonthFieldInput } from "@/components/month-field-input";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  formatReportMonthLabel,
  fromMonthField,
  getReportsContent,
  toMonthField,
} from "./content";
import { ReportsSubNav } from "./reports-shared";
import type { MonthlyReport } from "@/lib/db/reports";

type ClientOption = { id: string; name: string };

const thousands = (v: number) => Math.round(v / 1000).toLocaleString("ja-JP");
const yen = (v: number) => `¥${Math.round(v).toLocaleString("ja-JP")}`;

const SERIES = [
  { key: "previous", bar: "bg-slate-400", dot: "bg-slate-400" },
  { key: "unpaid", bar: "bg-[#f59b45]", dot: "bg-[#f59b45]" },
  { key: "paid", bar: "bg-[#14a7bb]", dot: "bg-[#14a7bb]" },
] as const;

export function ReportsMainClient({
  report,
  clients,
  from,
  to,
  clientId,
}: {
  report: MonthlyReport;
  clients: ClientOption[];
  from: string;
  to: string;
  clientId: string;
}) {
  const { lang } = useLanguage();
  const ui = getReportsContent(lang);
  const main = ui.main;
  const router = useRouter();

  const [periodFrom, setPeriodFrom] = useState(toMonthField(from));
  const [periodTo, setPeriodTo] = useState(toMonthField(to));
  const [client, setClient] = useState(clientId);

  const legends = [
    { key: "previous", label: main.legendPrevious, color: SERIES[0].bar },
    { key: "unpaid", label: main.legendUnpaid, color: SERIES[1].bar },
    { key: "paid", label: main.legendPaid, color: SERIES[2].bar },
  ] as const;

  const values: Record<(typeof SERIES)[number]["key"], number[]> = {
    previous: report.previous,
    unpaid: report.unpaid,
    paid: report.paid,
  };

  const monthLabels = report.months.map((m, i) => formatReportMonthLabel(lang, m, i === 0));
  const maxValue = Math.max(1, ...report.previous, ...report.unpaid, ...report.paid);
  const axisMax = Math.max(1, Math.ceil(maxValue / 5000) * 5000);
  const hasData = report.previous.concat(report.unpaid, report.paid).some((v) => v > 0);

  function applyFilter() {
    const params = new URLSearchParams();
    params.set("from", fromMonthField(periodFrom));
    params.set("to", fromMonthField(periodTo));
    if (client) params.set("clientId", client);
    router.push(`/reports?${params}`);
  }

  return (
    <SalesFlowShell activeItem="reports">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ReportsSubNav active="main" />
        <h1 className="mt-8 text-[30px] font-bold tracking-tight text-slate-900">{main.title}</h1>

        <div className="mt-6 rounded border border-slate-200 bg-[#f8fafc] px-5 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-slate-600">{main.client}</span>
              <select
                className="field min-w-[180px] bg-white"
                value={client}
                onChange={(e) => setClient(e.target.value)}
              >
                <option value="">{main.allClients}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || main.noClient}
                  </option>
                ))}
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
              onClick={applyFilter}
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
            <div className="absolute inset-x-8 bottom-12 top-6 border-b border-l border-slate-200">
              {[5, 4, 3, 2, 1, 0].map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 w-full border-t border-slate-100"
                  style={{ bottom: `${(tick / 5) * 100}%` }}
                >
                  <span className="absolute -left-8 -top-2 w-7 text-right text-[11px] text-slate-400">
                    {thousands((axisMax / 5) * tick)}
                  </span>
                </div>
              ))}

              <div className="absolute inset-0 flex items-end">
                {report.months.map((month, i) => (
                  <div key={month} className="flex h-full flex-1 items-end justify-center gap-[2px] px-[2px]">
                    {SERIES.map((series) => {
                      const value = values[series.key][i] ?? 0;
                      return (
                        <div
                          key={series.key}
                          className={`w-[26%] max-w-[14px] rounded-t ${series.bar}`}
                          style={{ height: `${Math.min(100, (value / axisMax) * 100)}%` }}
                          title={`${monthLabels[i]} · ${yen(value)}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="absolute -bottom-8 left-0 flex w-full text-[11px] text-slate-400">
                {monthLabels.map((label, i) => (
                  <span key={`${report.months[i]}-label`} className="flex-1 text-center">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc]">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    {main.summaryMonth}
                  </th>
                  {monthLabels.map((label, i) => (
                    <th
                      key={`${report.months[i]}-head`}
                      className="px-3 py-3 text-right font-semibold text-slate-700"
                    >
                      {label}
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
                    {report.months.map((month, i) => (
                      <td
                        key={`${item.key}-${month}`}
                        className="px-3 py-3 text-right tabular-nums text-slate-600"
                      >
                        {thousands(values[item.key][i] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!hasData ? (
            <p className="border-t border-slate-200 px-5 py-6 text-center text-[14px] text-slate-400">
              {main.empty}
            </p>
          ) : null}
        </section>

        <section className="mt-8 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-[16px] font-semibold text-slate-800">{main.topClientsTitle}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc]">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    {main.topClientsClient}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">
                    {main.topClientsTotal}
                  </th>
                  {monthLabels.map((label, i) => (
                    <th
                      key={`${report.months[i]}-top`}
                      className="px-3 py-3 text-right font-semibold text-slate-700"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.topClients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={report.months.length + 2}
                      className="px-4 py-12 text-center text-slate-300"
                    >
                      {main.empty}
                    </td>
                  </tr>
                ) : (
                  report.topClients.map((row) => (
                    <tr key={row.clientId} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 text-slate-700">
                        {row.clientName || main.noClient}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {thousands(row.total)}
                      </td>
                      {row.byMonth.map((value, i) => (
                        <td
                          key={`${row.clientId}-${report.months[i]}`}
                          className="px-3 py-3 text-right tabular-nums text-slate-600"
                        >
                          {thousands(value)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SalesFlowShell>
  );
}
