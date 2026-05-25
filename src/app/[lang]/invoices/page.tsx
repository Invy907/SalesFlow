"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getInvoiceContent } from "./content";
import { InvoiceSubNav } from "./invoice-sub-nav";

export default function InvoicesPage() {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="invoices" />

      <div className="mx-auto min-h-[calc(100vh-130px)] max-w-[1260px] px-8 py-8">
        <div className="flex flex-col gap-5">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">{ui.listTitle}</h1>

          <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-5 py-3 text-[14px]">
            <div className="flex flex-wrap items-center gap-6 text-slate-700">
              <span className="font-semibold">{ui.unpaidTitle}</span>
              <span className="text-slate-400">{ui.unpaidPeriod}</span>
              <span>
                <span className="font-semibold text-red-500">{ui.overdueLabel}:</span>{" "}
                <span className="text-red-500">{ui.unpaidZero}</span>
              </span>
              <span>
                <span className="font-semibold">{ui.unpaidTotalLabel}:</span> {ui.unpaidZero}
              </span>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-600">
              {ui.unpaidClose}
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex w-full max-w-[720px] rounded border border-slate-300 bg-white">
              <input
                className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                placeholder={ui.searchPlaceholder}
              />
              <button type="button" className="border-l border-slate-300 px-4 text-sm text-slate-600">
                {ui.searchDetail}
              </button>
            </div>
            <button
              type="button"
              className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              {ui.searchButton}
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200">
            <div className="flex gap-8 text-[18px] text-slate-500">
              {ui.tabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={[
                    "border-b-[3px] px-1 pb-3",
                    index === 0
                      ? "border-cyan-500 font-medium text-slate-900"
                      : "border-transparent",
                  ].join(" ")}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-[560px] items-center justify-center text-[22px] text-slate-300">
            {ui.empty}
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}
