"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { CsvDownloadLink, LearnMoreLink, ListSearchBar } from "../list-page-shared";
import { deleteItem } from "@/lib/actions/items";
import { TAX_CATEGORY_TO_LABEL } from "@/lib/tax";
import type { TaxCategory } from "@/lib/tax";
import { getItemsContent, getItemsHref } from "./content";
import { ItemsNavTabs } from "./items-shared";

export type ItemRow = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  taxCategory: string;
  withholdingExempt: boolean;
};

export function ItemsTable({
  rows,
  total,
  page,
  pageSize,
  query,
}: {
  rows: ItemRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}) {
  const { lang } = useLanguage();
  const ui = getItemsContent(lang);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { q?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    if (q) params.set("q", q);
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    router.push(`/${lang}/items${qs ? `?${qs}` : ""}`);
  }

  function handleDelete(row: ItemRow) {
    if (!window.confirm(`${row.name}\n${ui.deleteConfirm}`)) return;
    startTransition(async () => {
      const result = await deleteItem(row.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function handleCsv() {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [ui.csvHeaders.map(escape).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.name,
          r.unit,
          String(r.unitPrice),
          TAX_CATEGORY_TO_LABEL[r.taxCategory as TaxCategory] ?? "",
        ]
          .map(escape)
          .join(","),
      );
    }
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "items.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SalesFlowShell activeItem="items">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <ItemsNavTabs active="list" />
          <Link
            href={getItemsHref(lang, "new")}
            className="inline-flex shrink-0 items-center justify-center rounded bg-[#f59b45] px-6 py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#ef8d32]"
          >
            {ui.createItem}
          </Link>
        </div>

        <h1 className="mt-8 text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
        <p className="mt-3 max-w-[900px] text-[15px] leading-7 text-slate-600">
          {ui.intro}
          <LearnMoreLink label={ui.learnMore} />
        </p>

        {error ? <p className="mt-4 text-[14px] text-red-600">{error}</p> : null}

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <ListSearchBar
            placeholder={ui.searchPlaceholder}
            searchLabel={ui.search}
            defaultValue={query}
            onSearch={(q) => navigate({ q, page: 1 })}
          />
          <CsvDownloadLink label={ui.csvDownload} onDownload={rows.length ? handleCsv : undefined} />
        </div>

        {rows.length === 0 ? (
          <div className="mt-16 flex min-h-[480px] items-center justify-center text-[20px] text-slate-300">
            {ui.empty}
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700">品番・品名</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">単位</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">単価</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">税率</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4">
                      <Link
                        href={`/${lang}/items/${row.id}/edit`}
                        className="font-medium text-[#14a7bb] hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{row.unit || "—"}</td>
                    <td className="px-4 py-4 text-slate-700 tabular-nums">
                      {row.unitPrice.toLocaleString("ja-JP")} 円
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {TAX_CATEGORY_TO_LABEL[row.taxCategory as TaxCategory] ?? row.taxCategory}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        disabled={pending}
                        className="text-red-600 hover:underline disabled:opacity-60"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-3 text-[14px]">
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
    </SalesFlowShell>
  );
}
