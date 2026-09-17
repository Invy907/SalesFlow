"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { ListPageTabs, ListSearchBar } from "../list-page-shared";
import { pageContainerClass } from "@/components/page-container";
import {
  deleteEstimate,
  toggleEstimateIssueFlag,
  toggleEstimateOrderFlag,
  bulkMarkEstimatesProcessed,
  bulkUnmarkEstimatesProcessed,
  bulkIssueEstimates,
  bulkDuplicateEstimates,
  bulkConvertEstimatesToDeliveryNotes,
  bulkConvertEstimatesToInvoices,
  bulkConvertEstimatesToOrders,
} from "@/lib/actions/estimates";
import { formatSalesDocumentStatus } from "@/lib/document-status";
import { getEstimateContent } from "./content";

export type EstimateListRow = {
  id: string;
  documentNumber: string;
  clientName: string;
  subject: string;
  issueDate: string;
  total: number;
  status: string;
  issued: boolean;
  ordered: boolean;
};

export function EstimatesList({
  rows,
  total,
  page,
  pageSize,
  activeTab,
  query,
  issueFlag,
  orderFlag,
}: {
  rows: EstimateListRow[];
  total: number;
  page: number;
  pageSize: number;
  activeTab: number;
  query: string;
  issueFlag?: boolean;
  orderFlag?: boolean;
}) {
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const isTrashTab = activeTab === 2;
  const isProcessedTab = activeTab === 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: {
    tab?: number;
    q?: string;
    page?: number;
    issueFlag?: boolean | undefined;
    orderFlag?: boolean | undefined;
  }) {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    const q = next.q ?? search;
    const nextIssueFlag = "issueFlag" in next ? next.issueFlag : issueFlag;
    const nextOrderFlag = "orderFlag" in next ? next.orderFlag : orderFlag;
    if (tab > 0) params.set("tab", String(tab));
    if (q) params.set("q", q);
    if (nextIssueFlag !== undefined) params.set("issueFlag", nextIssueFlag ? "1" : "0");
    if (nextOrderFlag !== undefined) params.set("orderFlag", nextOrderFlag ? "1" : "0");
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    router.push(`/${lang}/estimates${qs ? `?${qs}` : ""}`);
  }

  function handleDelete(row: EstimateListRow) {
    if (!window.confirm(`${row.documentNumber}\n${ui.deleteConfirm}`)) return;
    startTransition(async () => {
      const result = await deleteEstimate(row.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function handleToggleIssue(row: EstimateListRow) {
    startTransition(async () => {
      const result = await toggleEstimateIssueFlag(row.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function handleToggleOrder(row: EstimateListRow) {
    startTransition(async () => {
      const result = await toggleEstimateOrderFlag(row.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  const statusLabel = (status: string) =>
    status === "confirmed" ? ui.statusPending : formatSalesDocumentStatus(lang, status);

  function toggleRow(rowId: string, index: number, shiftKey: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (shiftKey && lastClickedIndex !== null) {
        const [from, to] = [lastClickedIndex, index].sort((a, b) => a - b);
        const shouldSelect = !next.has(rowId);
        for (let i = from; i <= to; i += 1) {
          const id = rows[i]?.id;
          if (!id) continue;
          if (shouldSelect) next.add(id);
          else next.delete(id);
        }
      } else if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
    setLastClickedIndex(index);
  }

  function toggleSelectAll() {
    setSelectedIds((current) => (current.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function runBulk(action: (ids: string[]) => Promise<{ ok: boolean; error?: string }>) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await action(ids);
      if (result.ok) {
        clearSelection();
        router.refresh();
      } else {
        setError(result.error ?? "操作に失敗しました");
      }
    });
  }

  function handleMarkProcessed() {
    const ids = [...selectedIds];
    const hasUnissued = rows.some((r) => ids.includes(r.id) && !r.issued);
    if (hasUnissued && !window.confirm(ui.markProcessedConfirm)) return;
    runBulk(bulkMarkEstimatesProcessed);
  }

  return (
    <SalesFlowShell activeItem="estimates">
      <div className={`min-h-[calc(100vh-72px)] ${pageContainerClass()}`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900">
              {ui.tabTitles[activeTab]}
            </h1>
            {!isTrashTab ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/${lang}/estimates/ai-library`}
                  className="inline-flex items-center justify-center rounded border border-violet-200 bg-violet-50 px-5 py-3 text-[15px] font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  {lang === "ko" ? "AI 견적 자료함" : lang === "en" ? "AI estimate library" : "AI見積資料"}
                </Link>
                <Link
                  href={`/${lang}/estimates/new`}
                  className="inline-flex items-center justify-center rounded bg-[#0A4D34] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#083D29]"
                >
                  {ui.createEstimate}
                </Link>
              </div>
            ) : null}
          </div>

          {isTrashTab ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
              {ui.trashNote}
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            {!isTrashTab ? (
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <FilterToggle
                  doneLabel={ui.issueBadge.done}
                  pendingLabel={ui.issueBadge.pending}
                  value={issueFlag}
                  onChange={(next) => navigate({ issueFlag: next, page: 1 })}
                />
                <FilterToggle
                  doneLabel={ui.orderBadge.done}
                  pendingLabel={ui.orderBadge.pending}
                  value={orderFlag}
                  onChange={(next) => navigate({ orderFlag: next, page: 1 })}
                />
              </div>
            ) : null}
            <ListSearchBar
              placeholder={ui.searchPlaceholder}
              searchLabel={ui.searchButton}
              defaultValue={search}
              onSearch={(q) => {
                setSearch(q);
                navigate({ q, page: 1 });
              }}
            />
          </div>

          <ListPageTabs
            tabs={ui.tabs}
            activeIndex={activeTab}
            onTabChange={(index) => navigate({ tab: index, page: 1 })}
          />

          {selectedIds.size > 0 ? (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded border border-[#9DD4BD] bg-[#E8F5EF] px-4 py-3 text-[14px]">
              <span className="font-semibold text-[#062E1F]">
                {ui.selectedCount.replace("{count}", String(selectedIds.size))}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <BulkButton label={ui.bulkIssue} onClick={() => runBulk(bulkIssueEstimates)} disabled={pending} />
                <BulkButton label={ui.bulkDuplicate} onClick={() => runBulk(bulkDuplicateEstimates)} disabled={pending} />
                <BulkButton
                  label={ui.bulkConvertDeliveryNote}
                  onClick={() => runBulk(bulkConvertEstimatesToDeliveryNotes)}
                  disabled={pending}
                />
                <BulkButton
                  label={ui.bulkConvertInvoice}
                  onClick={() => runBulk(bulkConvertEstimatesToInvoices)}
                  disabled={pending}
                />
                <BulkButton
                  label={ui.bulkConvertOrder}
                  onClick={() => runBulk(bulkConvertEstimatesToOrders)}
                  disabled={pending}
                />
                {isProcessedTab ? (
                  <BulkButton
                    label={ui.unmarkProcessed}
                    onClick={() => runBulk(bulkUnmarkEstimatesProcessed)}
                    disabled={pending}
                  />
                ) : (
                  <BulkButton label={ui.markProcessed} onClick={handleMarkProcessed} disabled={pending} primary />
                )}
              </div>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="flex min-h-[720px] items-center justify-center text-[22px] text-slate-300">
              {ui.tabEmpty[activeTab]}
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full min-w-[1000px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={ui.selectAll}
                        checked={selectedIds.size > 0 && selectedIds.size === rows.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    {ui.listHeaders.map((h, colIndex) => (
                      <th
                        key={`${colIndex}-${h}`}
                        className={[
                          "px-4 py-3 font-semibold text-slate-700",
                          colIndex === 4 ? "text-right" : "",
                        ].join(" ")}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={(e) => toggleRow(row.id, index, (e.nativeEvent as MouseEvent).shiftKey)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/${lang}/estimates/${row.id}`}
                          className="font-medium text-[#0A4D34] hover:underline"
                        >
                          {row.documentNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{row.clientName || "—"}</td>
                      <td className="px-4 py-4 text-slate-600">{row.subject || "—"}</td>
                      <td className="px-4 py-4 text-slate-600">{row.issueDate}</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-700">
                        {row.total.toLocaleString("ja-JP")} 円
                      </td>
                      <td className="px-4 py-4 text-slate-600">{statusLabel(row.status)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          active={row.issued}
                          activeLabel={ui.issueBadge.done}
                          inactiveLabel={ui.issueBadge.pending}
                          onClick={() => handleToggleIssue(row)}
                          disabled={pending}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          active={row.ordered}
                          activeLabel={ui.orderBadge.done}
                          inactiveLabel={ui.orderBadge.pending}
                          onClick={() => handleToggleOrder(row)}
                          disabled={pending}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-3 text-[14px]">
                          <Link
                            href={`/${lang}/estimates/${row.id}/edit`}
                            className="text-[#0A4D34] hover:underline"
                          >
                            {ui.editAction}
                          </Link>
                          {!isTrashTab ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              disabled={pending}
                              className="text-red-600 hover:underline disabled:opacity-60"
                            >
                              削除
                            </button>
                          ) : null}
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

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
  onClick,
  disabled,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full px-3 py-1 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        active ? "bg-[#E8F5EF] text-[#062E1F] ring-1 ring-[#9DD4BD] hover:bg-[#C5E6D8]" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-200",
      ].join(" ")}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

/** 미설정→완료만→미완료만→미설정 순으로 순환하는 필터 토글. */
function FilterToggle({
  doneLabel,
  pendingLabel,
  value,
  onChange,
}: {
  doneLabel: string;
  pendingLabel: string;
  value: boolean | undefined;
  onChange: (next: boolean | undefined) => void;
}) {
  const cycle = () => {
    if (value === undefined) onChange(true);
    else if (value === true) onChange(false);
    else onChange(undefined);
  };
  const text = value === undefined ? `${doneLabel} / ${pendingLabel}` : value ? doneLabel : pendingLabel;
  return (
    <button
      type="button"
      onClick={cycle}
      className={[
        "rounded border px-3 py-1.5 font-medium transition",
        value === undefined ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-50" : "border-[#0A4D34] bg-[#E8F5EF] text-[#0A4D34]",
      ].join(" ")}
    >
      {text}
    </button>
  );
}

function BulkButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded px-4 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        primary
          ? "bg-[#0A4D34] text-white hover:bg-[#083D29]"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
