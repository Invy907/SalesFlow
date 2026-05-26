"use client";

import Link from "next/link";
import { useState } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { ListPageTabs } from "../list-page-shared";
import { getDeliveryNoteContent } from "./content";

export default function DeliveryNotesPage() {
  const { lang } = useLanguage();
  const ui = getDeliveryNoteContent(lang);
  const [activeTab, setActiveTab] = useState(0);
  const isTrashTab = activeTab === 2;

  return (
    <SalesFlowShell activeItem="delivery-notes">
      <div className="mx-auto min-h-[calc(100vh-72px)] w-full max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900">
              {ui.tabTitles[activeTab]}
            </h1>
            {!isTrashTab ? (
              <Link
                href="/delivery-notes/new"
                className="inline-flex items-center justify-center rounded bg-[#f59b45] px-6 py-4 text-lg font-semibold text-white transition hover:bg-[#ef8d32]"
              >
                {ui.createDeliveryNote}
              </Link>
            ) : null}
          </div>

          {isTrashTab ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
              {ui.trashNote}
            </p>
          ) : null}

          <div className="flex flex-col items-start gap-4 border-b border-slate-200 pb-4">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
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

            <ListPageTabs
              tabs={ui.tabs}
              activeIndex={activeTab}
              onTabChange={setActiveTab}
              align="end"
              size="lg"
            />
          </div>

          <div className="flex min-h-[720px] items-center justify-center text-[22px] text-slate-300">
            {ui.tabEmpty[activeTab]}
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}
