"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  CsvDownloadLink,
  ListPageTabs,
  ListPrimaryButton,
  ListSearchBar,
} from "../list-page-shared";
import { deleteClient, toggleFavorite } from "@/lib/actions/clients";
import { ClientRegistrationModal } from "./client-registration-modal";
import { getClientsContent } from "./content";

export type ClientDestination = {
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  mailingLine1: string;
  mailingLine2: string;
  mailingLine3: string;
  mailingLine4: string;
  honorific: string;
};

export type ClientRow = {
  id: string;
  name: string;
  furigana: string;
  corpNumber: string;
  managementCode: string;
  department: string;
  email: string;
  emailCc: string;
  phone: string;
  fax: string;
  honorific: string;
  memo: string;
  isFavorite: boolean;
  destination: ClientDestination;
};

function toCsv(rows: ClientRow[], headers: readonly string[]) {
  const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const r of rows) {
    lines.push(
      [r.name, r.furigana, r.managementCode, r.department, r.email, r.phone, r.fax]
        .map((v) => escape(v ?? ""))
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function ClientsTable({
  rows,
  total,
  page,
  pageSize,
  query,
  favoritesOnly,
}: {
  rows: ClientRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  favoritesOnly: boolean;
}) {
  const { lang } = useLanguage();
  const ui = getClientsContent(lang);
  const router = useRouter();

  const [editing, setEditing] = useState<ClientRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { q?: string; page?: number; fav?: boolean }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const fav = next.fav ?? favoritesOnly;
    if (q) params.set("q", q);
    if (fav) params.set("fav", "1");
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    router.push(`/${lang}/clients${qs ? `?${qs}` : ""}`);
  }

  function handleFavorite(row: ClientRow) {
    startTransition(async () => {
      const result = await toggleFavorite(row.id, !row.isFavorite);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function handleDelete(row: ClientRow) {
    if (!window.confirm(`${row.name}\n${ui.deleteConfirm}`)) return;
    startTransition(async () => {
      const result = await deleteClient(row.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function handleCsv() {
    const csv = toCsv(rows, ui.csvHeaders);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SalesFlowShell activeItem="clients">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <ListPageTabs tabs={ui.tabs} activeIndex={0} />
          <ListPrimaryButton label={ui.createClient} onClick={() => setEditing("new")} />
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
          <ListSearchBar
            placeholder={ui.searchPlaceholder}
            searchLabel={ui.search}
            defaultValue={query}
            onSearch={(q) => navigate({ q, page: 1 })}
          />
        </div>

        {error ? <p className="mt-4 text-[14px] text-red-600">{error}</p> : null}

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-[14px] text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 accent-cyan-600"
              checked={favoritesOnly}
              onChange={(e) => navigate({ fav: e.target.checked, page: 1 })}
            />
            {ui.favoritesOnly}
          </label>
          <CsvDownloadLink label={ui.csvDownload} onDownload={rows.length ? handleCsv : undefined} />
        </div>

        <div className="mt-6 overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">{ui.tableHeaders[0]}</th>
                <th className="w-12 px-4 py-3">
                  <StarIcon />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">{ui.tableHeaders[1]}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{ui.tableHeaders[2]}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{ui.tableHeaders[3]}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    {ui.empty}
                  </td>
                </tr>
              ) : (
                rows.map((client) => (
                  <tr key={client.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setEditing(client)}
                        className="font-medium text-[#14a7bb] hover:underline"
                      >
                        {client.name}
                        {ui.honorific ? ` ${ui.honorific}` : ""}
                      </button>
                      {client.furigana ? (
                        <span className="ml-2 text-[13px] text-slate-400">{client.furigana}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleFavorite(client)}
                        disabled={pending}
                        aria-pressed={client.isFavorite}
                        aria-label={ui.favorite}
                        className={
                          client.isFavorite
                            ? "text-amber-400"
                            : "text-slate-300 hover:text-amber-400"
                        }
                      >
                        <StarIcon />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{client.managementCode || "—"}</td>
                    <td className="px-4 py-4 text-slate-500">
                      {client.destination.mailingLine1 || client.destination.addressLine1 || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-3 text-[14px]">
                        <button
                          type="button"
                          onClick={() => setEditing(client)}
                          className="text-[#14a7bb] hover:underline"
                        >
                          {ui.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(client)}
                          disabled={pending}
                          className="text-red-600 hover:underline disabled:opacity-60"
                        >
                          {ui.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {editing ? (
        <ClientRegistrationModal
          ui={ui.modal}
          client={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </SalesFlowShell>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
    </svg>
  );
}
