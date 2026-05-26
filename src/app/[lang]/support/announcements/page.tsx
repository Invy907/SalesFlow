"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSupportHref } from "../content";
import {
  getAnnouncementsContent,
  getAnnouncementsHref,
} from "./content";

export default function AnnouncementsPage() {
  const { lang } = useLanguage();
  const ui = getAnnouncementsContent(lang);

  return (
    <SalesFlowShell activeItem="support">
      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <Link
          href={getSupportHref(lang, "top")}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-cyan-600"
        >
          ← {ui.backToSupport}
        </Link>

        <h1 className="mt-4 text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
        <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">{ui.intro}</p>

        <ul className="mt-8 divide-y divide-slate-200 overflow-hidden rounded border border-slate-200 bg-white">
          {ui.items.map((item) => (
            <li key={item.id}>
              <Link
                href={getAnnouncementsHref(lang, item.id)}
                className="block px-5 py-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                  <span className="rounded bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-[#14a7bb] ring-1 ring-cyan-100">
                    {item.category}
                  </span>
                  <span>{item.date}</span>
                </div>
                <h2 className="mt-2 text-[17px] font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">{item.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SalesFlowShell>
  );
}
