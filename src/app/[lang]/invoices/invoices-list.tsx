"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { ListPageTabs } from "../list-page-shared";
import { deleteInvoice, getInvoicePreview } from "@/lib/actions/invoices";
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
};

export function InvoicesList({
  rows,
  total,
  page,
  pageSize,
  activeTab,
  query,
  unpaidTotal,
  overdueTotal,
}: {
  rows: InvoiceListRow[];
  total: number;
  page: number;
  pageSize: number;
  activeTab: number;
  query: string;
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

  const isTrashTab = activeTab === 2;
  const isOpenTab = activeTab === 0;
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

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="invoices" />

      <div className="mx-auto min-h-[calc(100vh-130px)] w-full max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              {ui.tabTitles[activeTab]}
            </h1>
            {!isTrashTab ? (
              <Link
                href={`/${lang}/invoices/new`}
                className="inline-flex items-center justify-center rounded bg-[#f59b45] px-6 py-4 text-lg font-semibold text-white transition hover:bg-[#ef8d32]"
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
            align="start"
            size="md"
          />

          {rows.length === 0 ? (
            <div className="flex min-h-[560px] items-center justify-center text-[22px] text-slate-300">
              {ui.tabEmpty[activeTab]}
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full min-w-[800px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                    <th className="px-4 py-3 font-semibold">No.</th>
                    <th className="px-4 py-3 font-semibold">{ui.client}</th>
                    <th className="px-4 py-3 font-semibold">件名</th>
                    <th className="px-4 py-3 font-semibold">発行日</th>
                    <th className="px-4 py-3 font-semibold">支払期限</th>
                    <th className="px-4 py-3 font-semibold">金額</th>
                    <th className="px-4 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-4 font-medium">
                        <Link href={`/${lang}/invoices/${row.id}`} className="text-[#14a7bb] hover:underline">
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
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => togglePreview(row)}
                            className="text-[#14a7bb] hover:underline"
                          >
                            {previewId === row.id ? ui.previewHide : ui.previewShow}
                          </button>
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
                  <Link href={`/${lang}/invoices/${previewId}`} className="text-[#14a7bb] hover:underline">
                    {ui.previewOpenDetail}
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
