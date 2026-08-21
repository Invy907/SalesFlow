"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import type { AppLocale } from "@/contexts/language-context";
import { markInboxRead } from "@/lib/actions/inbox";
import { getInboxContent } from "../content";

export type InboxDetail = {
  id: string;
  kind: string;
  subject: string;
  body: string;
  from: string;
  createdAt: string;
  isRead: boolean;
  attachments: Array<{ id: string; filename: string; mimeType: string; size: number }>;
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

export function InboxDetailClient({ detail }: { detail: InboxDetail }) {
  const { lang } = useLanguage();
  const ui = getInboxContent(lang);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (detail.isRead) return;
    startTransition(async () => {
      await markInboxRead(detail.id);
    });
  }, [detail.id, detail.isRead]);

  return (
    <SalesFlowShell activeItem="inbox">
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 pb-12 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Link
          href={`/${lang}/inbox`}
          className="text-[14px] font-semibold text-cyan-600 hover:text-cyan-700"
        >
          ← {ui.backToList}
        </Link>

        <h1 className="mt-6 text-[28px] font-bold tracking-tight text-slate-900">
          {detail.subject || ui.noSubject}
        </h1>

        <dl className="mt-6 grid gap-3 text-[15px] sm:grid-cols-[120px_1fr]">
          <dt className="text-slate-500">{ui.from}</dt>
          <dd className="text-slate-800">{detail.from || "—"}</dd>
          <dt className="text-slate-500">{ui.receivedAt}</dt>
          <dd className="tabular-nums text-slate-800">
            {formatReceivedAt(lang, detail.createdAt)}
          </dd>
        </dl>

        <div className="mt-8">
          <h2 className="text-[16px] font-semibold text-slate-800">{ui.body}</h2>
          <div className="mt-3 whitespace-pre-wrap rounded border border-slate-200 bg-white px-5 py-4 text-[15px] leading-7 text-slate-700">
            {detail.body || "—"}
          </div>
        </div>

        {detail.attachments.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-[16px] font-semibold text-slate-800">{ui.attachments}</h2>
            <ul className="mt-3 space-y-2">
              {detail.attachments.map((file) => (
                <li key={file.id}>
                  <a
                    href={`/api/gmail/attachments?inboxMessageId=${encodeURIComponent(detail.id)}&attachmentId=${encodeURIComponent(file.id)}`}
                    className="inline-flex items-center gap-2 text-[14px] text-cyan-600 hover:underline"
                  >
                    {file.filename}
                    <span className="text-slate-400">({Math.ceil(file.size / 1024)} KB)</span>
                    <span className="text-slate-500">— {ui.download}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SalesFlowShell>
  );
}
