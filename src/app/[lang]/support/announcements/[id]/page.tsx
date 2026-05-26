"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  getAnnouncementById,
  getAnnouncementsContent,
  getAnnouncementsHref,
} from "../content";

export default function AnnouncementDetailPage() {
  const { lang } = useLanguage();
  const params = useParams<{ id: string }>();
  const ui = getAnnouncementsContent(lang);
  const announcement = getAnnouncementById(lang, params.id);

  return (
    <SalesFlowShell activeItem="support">
      <div className="mx-auto w-full max-w-[860px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <Link
          href={getAnnouncementsHref(lang)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-cyan-600"
        >
          ← {ui.backToList}
        </Link>

        {!announcement ? (
          <div className="mt-8 rounded border border-slate-200 bg-white px-6 py-10 text-center">
            <h1 className="text-[24px] font-bold text-slate-900">{ui.notFoundTitle}</h1>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">{ui.notFoundBody}</p>
            <Link
              href={getAnnouncementsHref(lang)}
              className="mt-6 inline-flex rounded bg-[#14a7bb] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]"
            >
              {ui.backToList}
            </Link>
          </div>
        ) : (
          <article className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
              <span className="rounded bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-[#14a7bb] ring-1 ring-cyan-100">
                {announcement.category}
              </span>
              <span>{announcement.date}</span>
            </div>

            <h1 className="mt-4 text-[30px] font-bold tracking-tight text-slate-900">
              {announcement.title}
            </h1>
            <p className="mt-4 text-[16px] leading-8 text-slate-700">{announcement.summary}</p>

            <div className="mt-8 space-y-5 rounded border border-slate-200 bg-white px-6 py-6">
              {announcement.body.map((paragraph) => (
                <p key={paragraph} className="text-[15px] leading-7 text-slate-600">
                  {paragraph}
                </p>
              ))}
            </div>

            {announcement.relatedHref && announcement.relatedLabel ? (
              <div className="mt-8">
                <Link
                  href={announcement.relatedHref}
                  className="inline-flex items-center gap-2 rounded bg-[#14a7bb] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]"
                >
                  {announcement.relatedLabel}
                </Link>
              </div>
            ) : null}
          </article>
        )}
      </div>
    </SalesFlowShell>
  );
}
