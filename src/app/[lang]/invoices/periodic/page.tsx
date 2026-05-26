"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getInvoiceContent } from "../content";
import { InvoiceSubNav } from "../invoice-sub-nav";

export default function InvoicesPeriodicPage() {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="periodic" />

      <div className="mx-auto min-h-[calc(100vh-130px)] w-full max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
            {ui.periodicTitle}
          </h1>

          <p className="text-[15px] text-slate-600">
            {ui.periodicDesc}（
            <a href="#" className="text-cyan-600 underline">
              {ui.periodicDescLink} ↗
            </a>
            ）
          </p>

          <div className="flex items-center gap-3">
            <div className="flex w-full max-w-[480px] rounded border border-slate-300 bg-white">
              <input
                className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                placeholder={ui.periodicSearch}
              />
            </div>
            <button className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
              {ui.searchButton}
            </button>
          </div>

          <div className="flex border-b border-slate-200 text-[18px] text-slate-500">
            {ui.periodicTabs.map((tab, index) => (
              <button
                key={tab}
                className={[
                  "mr-6 border-b-[3px] px-4 pb-3",
                  index === 0
                    ? "border-cyan-500 font-medium text-slate-900"
                    : "border-transparent",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex min-h-[560px] items-center justify-center text-[22px] text-slate-300">
            {ui.periodicEmpty}
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}
