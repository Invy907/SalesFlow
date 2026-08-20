"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { ListPageTabs } from "../list-page-shared";
import { getDeliveryNoteContent } from "./content";

export type DeliveryNoteListRow = {
  id: string;
  documentNumber: string;
  clientName: string;
  subject: string;
  issueDate: string;
  deliveryDate: string;
  total: number;
  status: string;
};

const yen = (v: number) => `¥${Math.round(v).toLocaleString("ja-JP")}`;

export function DeliveryNotesList({
  rows,
  total,
  page,
  pageSize,
  activeTab,
  query,
}: {
  rows: DeliveryNoteListRow[];
  total: number;
  page: number;
  pageSize: number;
  activeTab: number;
  query: string;
}) {
  const { lang } = useLanguage();
  const ui = getDeliveryNoteContent(lang);
  const router = useRouter();
  const [search, setSearch] = useState(query);

  const isTrashTab = activeTab === 2;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { tab?: number; q?: string; page?: number }) {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    const q = next.q ?? search;
    if (tab > 0) params.set("tab", String(tab));
    if (q) params.set("q", q);
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    router.push(`/${lang}/delivery-notes${qs ? `?${qs}` : ""}`);
  }

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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate({ q: search.trim(), page: 1 });
                  }}
                />
                <button type="button" className="border-l border-slate-300 px-4 text-sm text-slate-600">
                  {ui.searchDetail}
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate({ q: search.trim(), page: 1 })}
                className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {ui.searchButton}
              </button>
            </div>

            <ListPageTabs
              tabs={ui.tabs}
              activeIndex={activeTab}
              onTabChange={(index) => navigate({ tab: index, page: 1 })}
              align="end"
              size="lg"
            />
          </div>

          {rows.length === 0 ? (
            <div className="flex min-h-[720px] items-center justify-center text-[22px] text-slate-300">
              {ui.tabEmpty[activeTab]}
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full min-w-[900px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                    {ui.listHeaders.map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold text-slate-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-4 font-medium text-slate-800">{row.documentNumber}</td>
                      <td className="px-4 py-4 text-slate-700">{row.clientName || ui.noClient}</td>
                      <td className="px-4 py-4 text-slate-700">{row.subject || "—"}</td>
                      <td className="px-4 py-4 tabular-nums text-slate-600">{row.issueDate}</td>
                      <td className="px-4 py-4 tabular-nums text-slate-600">
                        {row.deliveryDate || "—"}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-900">
                        {yen(row.total)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {ui.statusLabels[row.status as keyof typeof ui.statusLabels] ?? row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 text-[14px]">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => navigate({ page: page - 1 })}
                className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => navigate({ page: page + 1 })}
                className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </SalesFlowShell>
  );
}
