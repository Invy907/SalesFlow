"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { ListPageTabs } from "../../list-page-shared";
import { appHrefs } from "@/lib/app-hrefs";
import {
  deletePeriodicSchedule,
  pausePeriodicSchedule,
  restorePeriodicSchedule,
} from "@/lib/actions/periodic-invoices";
import { getInvoiceContent } from "../content";
import { InvoiceSubNav } from "../invoice-sub-nav";

export type PeriodicListRow = {
  id: string;
  clientName: string;
  subject: string;
  cycle: "monthly" | "yearly" | "weekly";
  dayMode: "day" | "last";
  dayValue: number | null;
  /** YYYY-MM-DD (JST). null 이면 더 이상 실행되지 않는다. */
  nextRunDate: string | null;
  isPaused: boolean;
  emailEnabled: boolean;
  lastError: string | null;
};

export function PeriodicList({
  rows,
  total,
  page,
  pageSize,
  activeTab,
  query,
}: {
  rows: PeriodicListRow[];
  total: number;
  page: number;
  pageSize: number;
  activeTab: number;
  query: string;
}) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isTrashTab = activeTab === 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { tab?: number; q?: string; page?: number }) {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    const q = next.q ?? search;
    if (tab > 0) params.set("tab", String(tab));
    if (q) params.set("q", q);
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    router.push(`/invoices/periodic${params.toString() ? `?${params}` : ""}`);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error ?? "");
    });
  }

  function cycleLabel(row: PeriodicListRow) {
    if (row.cycle === "weekly") return ui.cycleWeekly;
    const base = row.cycle === "yearly" ? ui.cycleYearly : ui.cycleMonthly;
    if (row.dayMode === "last") return `${base} · ${ui.lastDay}`;
    return row.dayValue ? `${base} · ${row.dayValue}${ui.daySuffix}` : base;
  }

  function statusLabel(row: PeriodicListRow) {
    if (row.isPaused) return ui.periodicStatusPaused;
    if (!row.nextRunDate) return ui.periodicStatusEnded;
    return ui.periodicStatusActive;
  }

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="periodic" />

      <div className="mx-auto min-h-[calc(100vh-130px)] w-full max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5">
          {/* 생성 버튼은 InvoiceSubNav 가 이미 렌더링한다. 여기서 또 두면 같은 버튼이 두 개가 된다. */}
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
            {ui.periodicTitle}
          </h1>

          <p className="text-[15px] text-slate-600">
            {ui.periodicDesc}{" "}
            <Link href={appHrefs.supportInvoiceGuide} className="text-cyan-600 underline">
              {ui.periodicDescLink}
            </Link>
          </p>

          <div className="flex items-center gap-3">
            <div className="flex w-full max-w-[480px] rounded border border-slate-300 bg-white">
              <input
                className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                placeholder={ui.periodicSearch}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate({ q: search.trim(), page: 1 });
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => navigate({ q: search.trim(), page: 1 })}
              className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {ui.searchButton}
            </button>
          </div>

          <ListPageTabs
            tabs={ui.periodicTabs}
            activeIndex={activeTab}
            onTabChange={(index) => navigate({ tab: index, page: 1 })}
            align="start"
            size="md"
          />

          {error ? <p className="text-[14px] text-red-600">{error}</p> : null}

          {rows.length === 0 ? (
            <div className="flex min-h-[480px] items-center justify-center text-[22px] text-slate-300">
              {ui.periodicEmpty}
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full min-w-[900px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                    {ui.periodicListHeaders.map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold text-slate-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-4 font-medium">
                        {isTrashTab ? (
                          <span className="text-slate-700">{row.clientName || "—"}</span>
                        ) : (
                          <Link
                            href={`/invoices/periodic/${row.id}/edit`}
                            className="text-[#14a7bb] hover:underline"
                          >
                            {row.clientName || "—"}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{row.subject || "—"}</td>
                      <td className="px-4 py-4 text-slate-700">{cycleLabel(row)}</td>
                      <td className="px-4 py-4 tabular-nums text-slate-600">
                        {row.nextRunDate ?? ui.periodicNextRunNone}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "rounded px-2 py-1 text-[13px] font-semibold",
                            row.isPaused
                              ? "bg-amber-50 text-amber-700"
                              : row.nextRunDate
                                ? "bg-cyan-50 text-cyan-700"
                                : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {statusLabel(row)}
                        </span>
                        {row.lastError ? (
                          <p className="mt-1 text-[12px] text-red-600">
                            {ui.periodicLastErrorLabel}: {row.lastError}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-3 text-[14px]">
                          {isTrashTab ? (
                            <button
                              type="button"
                              onClick={() => run(() => restorePeriodicSchedule(row.id))}
                              disabled={pending}
                              className="text-cyan-700 hover:underline disabled:opacity-60"
                            >
                              {ui.periodicRestoreAction}
                            </button>
                          ) : (
                            <>
                              <Link
                                href={`/invoices/periodic/${row.id}/edit`}
                                className="text-slate-700 hover:underline"
                              >
                                {ui.periodicEditAction}
                              </Link>
                              <button
                                type="button"
                                onClick={() =>
                                  run(() => pausePeriodicSchedule(row.id, !row.isPaused))
                                }
                                disabled={pending}
                                className="text-slate-700 hover:underline disabled:opacity-60"
                              >
                                {row.isPaused ? ui.periodicResumeAction : ui.periodicPauseAction}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!window.confirm(ui.periodicDeleteConfirm)) return;
                                  run(() => deletePeriodicSchedule(row.id));
                                }}
                                disabled={pending}
                                className="text-red-600 hover:underline disabled:opacity-60"
                              >
                                {ui.periodicDeleteAction}
                              </button>
                            </>
                          )}
                        </div>
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
