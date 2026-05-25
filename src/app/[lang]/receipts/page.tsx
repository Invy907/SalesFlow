"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getReceiptContent } from "./content";

export default function ReceiptsPage() {
  const { lang } = useLanguage();
  const ui = getReceiptContent(lang);

  return (
    <SalesFlowShell activeItem="receipts">
      <div className="mx-auto min-h-[calc(100vh-72px)] max-w-[1260px] px-8 py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900">
              {ui.listTitle}
            </h1>
            <Link
              href="/ja/receipts/new"
              className="inline-flex items-center justify-center rounded bg-[#f59b45] px-6 py-4 text-lg font-semibold text-white transition hover:bg-[#ef8d32]"
            >
              {ui.createReceipt}
            </Link>
          </div>

          <div className="flex flex-col items-start gap-4 border-b border-slate-200 pb-4">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              <div className="flex w-full max-w-[720px] rounded border border-slate-300 bg-white">
                <input
                  className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder={ui.searchPlaceholder}
                />
                <button className="border-l border-slate-300 px-4 text-sm text-slate-600">
                  {ui.searchDetail}
                </button>
              </div>
              <button className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                {ui.searchButton}
              </button>
            </div>

            <div className="flex w-full justify-end gap-10 text-xl text-slate-500">
              {ui.tabs.map((tab, index) => (
                <button
                  key={tab}
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

          <div className="flex min-h-[720px] items-center justify-center text-[22px] text-slate-300">
            {ui.empty}
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}
