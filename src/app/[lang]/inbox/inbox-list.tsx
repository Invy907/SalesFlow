"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import type { AppLocale } from "@/contexts/language-context";
import { appHrefs } from "@/lib/app-hrefs";
import {
  disconnectGmail,
  markAllInboxRead,
  syncGmailNow,
} from "@/lib/actions/inbox";
import { getGmailConnectUrl } from "@/lib/gmail/connect-url";
import type { GmailConnectionSummary } from "@/lib/db/gmail-connections";
import { SettingsEmailAlert } from "../settings/settings-shared";
import { getInboxContent } from "./content";

export type InboxMessageRow = {
  id: string;
  kind: string;
  subject: string;
  createdAt: string;
  isRead: boolean;
};

const intlLocales: Record<AppLocale, string> = { ja: "ja-JP", ko: "ko-KR", en: "en-US" };

function formatReceivedAt(lang: AppLocale, iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(intlLocales[lang], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

const kindStyles: Record<string, string> = {
  received_document: "bg-cyan-50 text-[#14a7bb] ring-cyan-100",
  system: "bg-slate-100 text-slate-600 ring-slate-200",
  announcement: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function InboxList({
  rows,
  total,
  page,
  pageSize,
  unreadOnly,
  gmailConnection,
  initialToast,
}: {
  rows: InboxMessageRow[];
  total: number;
  page: number;
  pageSize: number;
  unreadOnly: boolean;
  gmailConnection: GmailConnectionSummary | null;
  initialToast: string | null;
}) {
  const { lang } = useLanguage();
  const ui = getInboxContent(lang);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!initialToast) return;
    if (initialToast === "connected") {
      setToast(ui.gmail.connectedToast);
    } else {
      setToast(initialToast);
    }
    router.replace(`/${lang}/inbox${unreadOnly ? "?unread=1" : ""}`, { scroll: false });
  }, [initialToast, lang, router, ui.gmail.connectedToast, unreadOnly]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(next: { page?: number; unread?: boolean }) {
    const params = new URLSearchParams();
    const unread = next.unread ?? unreadOnly;
    if (unread) params.set("unread", "1");
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    router.push(`/${lang}/inbox${qs ? `?${qs}` : ""}`);
  }

  function handleConnect() {
    window.location.href = getGmailConnectUrl(lang);
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncGmailNow();
      setToast(result.ok ? ui.gmail.syncedToast : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectGmail();
      setToast(result.ok ? ui.gmail.disconnectedToast : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllInboxRead();
      if (!result.ok) {
        setToast(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <SalesFlowShell activeItem="inbox">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        {!gmailConnection ? (
          <SettingsEmailAlert
            title={ui.emailAlert.title}
            body={ui.emailAlert.body}
            buttonLabel={ui.emailAlert.button}
            onButtonClick={handleConnect}
          />
        ) : (
          <div className="mb-6 rounded border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[14px] font-semibold text-slate-800">
                  {ui.gmail.connected}: {gmailConnection.googleEmail}
                </p>
                {gmailConnection.lastSyncAt ? (
                  <p className="mt-1 text-[13px] text-slate-500">
                    {ui.gmail.lastSync}: {formatReceivedAt(lang, gmailConnection.lastSyncAt)}
                  </p>
                ) : null}
                {gmailConnection.lastSyncError ? (
                  <p className="mt-1 text-[13px] text-red-600">
                    {ui.gmail.syncError}: {gmailConnection.lastSyncError}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={pending}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {pending ? ui.gmail.syncing : ui.gmail.syncNow}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={pending}
                  className="rounded border border-red-200 bg-white px-4 py-2 text-[14px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {ui.gmail.disconnect}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
          <Link
            href={appHrefs.support}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#14a7bb] hover:underline"
          >
            <HelpCircleIcon />
            {ui.helpLink}
            <ExternalLinkIcon />
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {[
            { label: ui.all, active: !unreadOnly, unread: false },
            { label: ui.unreadOnly, active: unreadOnly, unread: true },
          ].map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => navigate({ unread: filter.unread, page: 1 })}
              className={[
                "rounded px-4 py-2 text-[14px] font-semibold transition",
                filter.active
                  ? "bg-[#14a7bb] text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
          {rows.some((r) => !r.isRead) ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={pending}
              className="ml-auto rounded border border-slate-300 px-4 py-2 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {ui.markAllRead}
            </button>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="mt-20 flex min-h-[420px] items-center justify-center text-[20px] text-slate-300">
            {ui.empty}
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-[15px]">
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
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/${lang}/inbox/${row.id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex rounded px-2 py-0.5 text-[12px] font-semibold ring-1",
                          kindStyles[row.kind] ?? kindStyles.system,
                        ].join(" ")}
                      >
                        {ui.kindLabels[row.kind as keyof typeof ui.kindLabels] ?? row.kind}
                      </span>
                    </td>
                    <td
                      className={[
                        "px-4 py-4",
                        row.isRead ? "text-slate-600" : "font-semibold text-slate-900",
                      ].join(" ")}
                    >
                      {row.subject || ui.noSubject}
                    </td>
                    <td className="px-4 py-4 tabular-nums text-slate-600">
                      {formatReceivedAt(lang, row.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "text-[13px]",
                          row.isRead ? "text-slate-400" : "font-semibold text-[#14a7bb]",
                        ].join(" ")}
                      >
                        {row.isRead ? ui.read : ui.unread}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-3 text-[14px]">
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

      {toast ? (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/90 px-6 py-3 text-[15px] text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </SalesFlowShell>
  );
}

function HelpCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-1 3a1 1 0 0 0 0 2h1v3a1 1 0 1 0 2 0v-4a1 1 0 0 0-1-1H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
      <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
      <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
    </svg>
  );
}
