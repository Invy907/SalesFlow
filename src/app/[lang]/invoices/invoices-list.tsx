"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { ListPageTabs, ListSearchBar } from "../list-page-shared";
import { pageContainerClass } from "@/components/page-container";
import {
  deleteInvoice,
  getInvoicePreview,
  toggleInvoicePaymentFlag,
  bulkMarkInvoicesProcessed,
  bulkUnmarkInvoicesProcessed,
} from "@/lib/actions/invoices";
import { SalesDocumentPreview } from "@/components/sales-document-preview";
import { buildInvoiceDetailUi } from "@/lib/documents/build-detail-ui";
import type { SalesDocumentDetail } from "@/lib/documents/detail-types";
import { getInvoiceContent } from "./content";
import { InvoiceSubNav } from "./invoice-sub-nav";

export type InvoiceListRow = {
  id: string;
  documentNumber: string;
  clientName: string;
  subject: string;
  issueDate: string;
  paymentDue: string;
  total: number;
  paidAmount: number;
  status: string;
  issued: boolean;
  paid: boolean;
};

export function InvoicesList({
  rows,
  total,
  page,
  pageSize,
  activeTab,
  query,
  issueFlag,
  paymentFlag,
  unpaidTotal,
  overdueTotal,
}: {
  rows: InvoiceListRow[];
  total: number;
  page: number;
  pageSize: number;
  activeTab: number;
  query: string;
  issueFlag?: boolean;
  paymentFlag?: boolean;
  unpaidTotal: number;
  overdueTotal: number;
}) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // In-list preview so the document can be checked without leaving the page.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preview, setPreview] = useState<SalesDocumentDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const isTrashTab = activeTab === 2;
  const isOpenTab = activeTab === 0;
  const isProcessedTab = activeTab === 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: {
    tab?: number;
    q?: string;
    page?: number;
    issueFlag?: boolean | undefined;
    paymentFlag?: boolean | undefined;
  }) {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    const q = next.q ?? search;
    const nextIssueFlag = "issueFlag" in next ? next.issueFlag : issueFlag;
    const nextPaymentFlag = "paymentFlag" in next ? next.paymentFlag : paymentFlag;
    if (tab > 0) params.set("tab", String(tab));
    if (q) params.set("q", q);
    if (nextIssueFlag !== undefined) params.set("issueFlag", nextIssueFlag ? "1" : "0");
    if (nextPaymentFlag !== undefined) params.set("paymentFlag", nextPaymentFlag ? "1" : "0");
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    router.push(`/${lang}/invoices${qs ? `?${qs}` : ""}`);
  }

  function togglePreview(row: InvoiceListRow) {
    if (previewId === row.id) {
      setPreviewId(null);
      setPreview(null);
      return;
    }
    setPreviewId(row.id);
    setPreview(null);
    setPreviewLoading(true);
    startTransition(async () => {
      const result = await getInvoicePreview(row.id);
      setPreviewLoading(false);
      if (result.ok) setPreview(result.data);
      else setError(result.error);
    });
  }

  function handleDelete(row: InvoiceListRow) {
    if (!window.confirm(`${row.documentNumber}\n削除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteInvoice(row.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function handleTogglePayment(row: InvoiceListRow) {
    startTransition(async () => {
      const result = await toggleInvoicePaymentFlag(row.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

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
    runBulk(bulkMarkInvoicesProcessed);
  }

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="invoices" />

      <div className={`min-h-[calc(100vh-130px)] ${pageContainerClass()}`}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900">
              {ui.tabTitles[activeTab]}
            </h1>
            {!isTrashTab ? (
              <Link
                href={`/${lang}/invoices/new`}
                className="inline-flex items-center justify-center rounded bg-[#0A4D34] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#083D29]"
              >
                {ui.createInvoice}
              </Link>
            ) : null}
          </div>

          {isOpenTab ? (
            <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-5 py-3 text-[14px]">
              <div className="flex flex-wrap items-center gap-6 text-slate-700">
                <span className="font-semibold">{ui.unpaidTitle}</span>
                <span>
                  <span className="font-semibold text-red-500">{ui.overdueLabel}:</span>{" "}
                  <span className="text-red-500">{overdueTotal.toLocaleString("ja-JP")}円</span>
                </span>
                <span>
                  <span className="font-semibold">{ui.unpaidTotalLabel}:</span>{" "}
                  {unpaidTotal.toLocaleString("ja-JP")}円
                </span>
              </div>
            </div>
          ) : null}

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
                  doneLabel={ui.paymentBadge.done}
                  pendingLabel={ui.paymentBadge.pending}
                  value={paymentFlag}
                  onChange={(next) => navigate({ paymentFlag: next, page: 1 })}
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
            align="start"
            size="md"
          />

          {selectedIds.size > 0 ? (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded border border-[#9DD4BD] bg-[#E8F5EF] px-4 py-3 text-[14px]">
              <span className="font-semibold text-[#062E1F]">
                {ui.selectedCount.replace("{count}", String(selectedIds.size))}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {isProcessedTab ? (
                  <BulkButton
                    label={ui.unmarkProcessed}
                    onClick={() => runBulk(bulkUnmarkInvoicesProcessed)}
                    disabled={pending}
                  />
                ) : (
                  <BulkButton label={ui.markProcessed} onClick={handleMarkProcessed} disabled={pending} primary />
                )}
              </div>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="flex min-h-[560px] items-center justify-center text-[22px] text-slate-300">
              {ui.tabEmpty[activeTab]}
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full min-w-[1220px] border-collapse text-[15px]">
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
                    <th className="px-4 py-3 font-semibold">No.</th>
                    <th className="px-4 py-3 font-semibold">{ui.client}</th>
                    <th className="px-4 py-3 font-semibold">件名</th>
                    <th className="px-4 py-3 font-semibold">発行日</th>
                    <th className="px-4 py-3 font-semibold">支払期限</th>
                    <th className="px-4 py-3 font-semibold">金額</th>
                    <th className="px-4 py-3 font-semibold">入金</th>
                    <th className="px-4 py-3 font-semibold">発行</th>
                    <th className="px-4 py-3 font-semibold">入金状況</th>
                    <th className="px-4 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={(e) => toggleRow(row.id, index, (e.nativeEvent as MouseEvent).shiftKey)}
                        />
                      </td>
                      <td className="px-4 py-4 font-medium">
                        <Link href={`/${lang}/invoices/${row.id}`} className="text-[#0A4D34] hover:underline">
                          {row.documentNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{row.clientName || "—"}</td>
                      <td className="px-4 py-4">{row.subject || "—"}</td>
                      <td className="px-4 py-4">{row.issueDate}</td>
                      <td className="px-4 py-4">{row.paymentDue || "—"}</td>
                      <td className="px-4 py-4 tabular-nums">
                        {row.total.toLocaleString("ja-JP")} 円
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {row.paidAmount.toLocaleString("ja-JP")} 円
                      </td>
                      <td className="px-4 py-4">
                        <StaticBadge active={row.issued} activeLabel={ui.issueBadge.done} inactiveLabel={ui.issueBadge.pending} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          active={row.paid}
                          activeLabel={ui.paymentBadge.done}
                          inactiveLabel={ui.paymentBadge.pending}
                          onClick={() => handleTogglePayment(row)}
                          disabled={pending}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => togglePreview(row)}
                            className="text-[#0A4D34] hover:underline"
                          >
                            {previewId === row.id ? ui.previewHide : ui.previewShow}
                          </button>
                          {!isTrashTab ? (
                            <Link
                              href={`/${lang}/invoices/new?copyFrom=${row.id}`}
                              className="text-slate-700 hover:underline"
                            >
                              {ui.duplicateAction}
                            </Link>
                          ) : null}
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

          {previewId ? (
            <section className="rounded border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-slate-800">{ui.previewTitle}</h2>
                <div className="flex items-center gap-3 text-[14px]">
                  <Link href={`/${lang}/invoices/${previewId}`} className="text-[#0A4D34] hover:underline">
                    {ui.previewOpenDetail}
                  </Link>
                  <Link
                    href={`/${lang}/invoices/new?copyFrom=${previewId}`}
                    className="text-slate-700 hover:underline"
                  >
                    {ui.duplicateAction}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewId(null);
                      setPreview(null);
                    }}
                    className="text-slate-500 hover:underline"
                  >
                    {ui.previewHide}
                  </button>
                </div>
              </div>
              {previewLoading || !preview ? (
                <p className="py-10 text-center text-[15px] text-slate-400">{ui.previewLoading}</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[720px]">
                    <SalesDocumentPreview
                      detail={preview}
                      ui={buildInvoiceDetailUi(preview.outputLocale, getInvoiceContent(preview.outputLocale))}
                    />
                  </div>
                </div>
              )}
            </section>
          ) : null}

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
              <span>{page} / {totalPages}</span>
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

/** 発行バッジ: メール送信/郵送手続き/共有リンク発行からのみ自動で切り替わる表示専用バッジ。 */
function StaticBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-[13px] font-medium",
        active ? "bg-[#E8F5EF] text-[#062E1F] ring-1 ring-[#9DD4BD]" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
      ].join(" ")}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

/** 未設定→完了のみ→未完了のみ→未設定 の順で巡回するフィルタトグル。 */
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
