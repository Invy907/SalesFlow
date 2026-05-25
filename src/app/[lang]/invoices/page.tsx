"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getInvoiceContent } from "./content";
import { InvoiceMainInner } from "./invoice-main-inner";
import { InvoiceSubNav } from "./invoice-sub-nav";

export default function InvoicesPage() {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="invoices" />

      <InvoiceMainInner>
        <div className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{ui.listTitle}</h1>
              <button type="button" className="mt-1 text-[12px] text-[#14a7bb] hover:underline">
                {ui.unpaidGraphLink}
              </button>
            </div>

            <div className="flex shrink-0 items-center">
              <div className="flex h-[34px] w-[330px] items-stretch overflow-hidden rounded border border-slate-300 bg-white">
                <input
                  className="min-w-0 flex-1 px-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder={ui.searchPlaceholder}
                />
                <button
                  type="button"
                  className="border-l border-slate-300 px-3 text-[12px] text-slate-600 hover:bg-slate-50"
                >
                  {ui.searchDetail}
                </button>
              </div>
              <button
                type="button"
                className="ml-2 h-[34px] rounded border border-slate-300 px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {ui.searchButton}
              </button>
            </div>
          </div>

          <div className="mt-5 border-b border-slate-200">
            <div className="flex justify-end gap-6 text-[14px]">
              {ui.tabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={[
                    "border-b-2 pb-2 transition",
                    index === 0
                      ? "border-[#14a7bb] font-medium text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-700",
                  ].join(" ")}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 text-[12px] text-slate-600">
            <div className="flex items-center gap-3">
              <span>{ui.displayCount}</span>
              <select className="h-[28px] rounded border border-slate-300 bg-white px-2 text-[12px]">
                <option>20{ui.displayCountUnit}</option>
                <option>50{ui.displayCountUnit}</option>
                <option>100{ui.displayCountUnit}</option>
              </select>
              <span>
                0{ui.displayCountUnit}
                {ui.pagination} 0-0{ui.displayCountUnit}
              </span>
            </div>
            <button type="button" className="text-[#14a7bb] hover:underline">
              {ui.csvDownload}
            </button>
          </div>

          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc] text-left text-slate-700">
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-cyan-600" aria-label="Select all" />
                  </th>
                  {ui.tableHeaders.map((header) => (
                    <th key={header} className="px-3 py-2.5 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={ui.tableHeaders.length + 1} className="py-14 text-center text-[18px] text-slate-300">
                    {ui.empty}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </InvoiceMainInner>
    </SalesFlowShell>
  );
}
