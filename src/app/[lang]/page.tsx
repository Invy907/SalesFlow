"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  formatToday,
  getHomeContent,
  pickGreeting,
  type HomeKpi,
  type HomeTaskGroup,
  type QuickCreateKey,
} from "./home-content";
import { getAnnouncementsHref } from "./support/announcements/content";

const toneStyles = {
  amber: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  cyan: {
    dot: "bg-[#14a7bb]",
    pill: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  },
  slate: {
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
  },
} as const;

const kpiToneStyles: Record<HomeKpi["tone"], string> = {
  neutral: "text-slate-900",
  warn: "text-amber-700",
  info: "text-[#14a7bb]",
};

export default function Home() {
  const { lang } = useLanguage();
  const ui = getHomeContent(lang);

  const [today, setToday] = useState<string>("");
  const [greeting, setGreeting] = useState<string>(ui.greeting.afternoon);

  useEffect(() => {
    const now = new Date();
    setToday(formatToday(lang, now));
    setGreeting(pickGreeting(ui, now.getHours()));
  }, [lang, ui]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalTaskCount = useMemo(
    () => ui.tasks.groups.reduce((acc, g) => acc + g.items.length, 0),
    [ui.tasks.groups],
  );

  return (
    <SalesFlowShell activeItem="home">
      <div className="bg-[#f4f7fb]">
        <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {ui.todayLabel} · {today || "—"}
              </p>
              <h1 className="mt-1 text-[28px] font-bold tracking-tight text-slate-900">
                {greeting},{" "}
                <span className="text-[#14a7bb]">{ui.userName}</span>
                {ui.greeting.suffix}
              </h1>
            </div>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded bg-[#14a7bb] px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#1096a8]"
              >
                <PlusIcon />
                {ui.newButton}
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-[52px] z-20 w-[240px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500">
                    {ui.newMenuTitle}
                  </div>
                  {ui.newMenuItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 text-[14px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#14a7bb]"
                    >
                      <span>{item.label}</span>
                      <span aria-hidden="true" className="text-slate-300">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ui.kpis.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} />
            ))}
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-[18px] font-semibold text-slate-900">
                    {ui.tasks.title}
                    <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-600">
                      {totalTaskCount}
                    </span>
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500">{ui.tasks.subtitle}</p>
                </div>
                <Link
                  href="/invoices"
                  className="text-sm font-semibold text-[#14a7bb] transition hover:text-[#1096a8]"
                >
                  {ui.tasks.seeAll} →
                </Link>
              </div>

              {totalTaskCount === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-400">
                  {ui.tasks.empty}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ui.tasks.groups.map((group) => (
                    <TaskGroup key={group.key} group={group} openLabel={ui.tasks.open} />
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-[18px] font-semibold text-slate-900">
                    {ui.quickCreate.title}
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {ui.quickCreate.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-px bg-slate-100">
                  {ui.quickCreate.items.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="group relative flex flex-col gap-2 bg-white px-4 py-5 transition hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-[#14a7bb] transition group-hover:bg-[#14a7bb] group-hover:text-white">
                        <QuickCreateIcon name={item.key} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-slate-900">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[12px] leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-slate-200 px-5 py-3">
                  <ul className="flex flex-wrap gap-x-4 gap-y-2">
                    {ui.quickCreate.shortcuts.map((s) => (
                      <li key={s.label}>
                        <Link
                          href={s.href}
                          className="text-[13px] text-[#14a7bb] transition hover:underline"
                        >
                          + {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </aside>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-[18px] font-semibold text-slate-900">
                  {ui.recent.title}
                </h2>
                <Link
                  href="/usage"
                  className="text-sm font-semibold text-[#14a7bb] transition hover:text-[#1096a8]"
                >
                  {ui.recent.seeAll} →
                </Link>
              </div>

              <ul className="divide-y divide-slate-100">
                {ui.recent.items.map((item) => (
                  <li key={item.doc} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <DocBadgeIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-slate-900">
                        {item.doc}
                      </p>
                      <p className="truncate text-[13px] text-slate-500">
                        {item.client}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold text-slate-900">
                        {item.amount}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        {item.status} · {item.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-[18px] font-semibold text-slate-900">
                  {ui.notices.title}
                </h2>
                <Link
                  href={getAnnouncementsHref(lang)}
                  className="text-sm font-semibold text-[#14a7bb] transition hover:text-[#1096a8]"
                >
                  {ui.notices.seeAll} →
                </Link>
              </div>

              <ul className="divide-y divide-slate-100">
                {ui.notices.items.map((notice) => (
                  <li key={notice.id}>
                    <Link
                      href={getAnnouncementsHref(lang, notice.id)}
                      className="block px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 text-[12px] text-slate-500">
                        <span className="rounded bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-[#14a7bb] ring-1 ring-cyan-100">
                          {notice.category}
                        </span>
                        <span>{notice.date}</span>
                      </div>
                      <p className="mt-2 text-[14px] leading-6 text-slate-700">
                        {notice.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}

function KpiCard({ kpi }: { kpi: HomeKpi }) {
  return (
    <Link
      href={kpi.href}
      className="group block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-[#14a7bb]/40 hover:shadow-sm"
    >
      <p className="text-[12px] font-medium tracking-wide text-slate-500 uppercase">
        {kpi.label}
      </p>
      <p
        className={[
          "mt-3 text-[26px] font-bold leading-none tracking-tight",
          kpiToneStyles[kpi.tone],
        ].join(" ")}
      >
        {kpi.value}
      </p>
      <p className="mt-2 text-[13px] text-slate-500">{kpi.sub}</p>
    </Link>
  );
}

function TaskGroup({ group, openLabel }: { group: HomeTaskGroup; openLabel: string }) {
  const tone = toneStyles[group.tone];

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden="true" />
        <h3 className="text-[13px] font-semibold text-slate-700">{group.label}</h3>
        <span className="text-[12px] text-slate-400">· {group.items.length}</span>
      </div>

      <ul className="space-y-2">
        {group.items.map((item) => (
          <li key={`${group.key}-${item.doc}-${item.client}`}>
            <Link
              href={item.href}
              className="flex items-center gap-4 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition hover:border-slate-200 hover:bg-white"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-slate-900">
                  {item.client}
                </p>
                <p className="truncate text-[12px] text-slate-500">{item.doc}</p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold text-slate-900">{item.amount}</p>
                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone.pill}`}
                >
                  {item.due}
                </span>
              </div>
              <span
                className="hidden shrink-0 text-[12px] font-semibold text-[#14a7bb] sm:inline"
                aria-hidden="true"
              >
                {openLabel} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickCreateIcon({ name }: { name: QuickCreateKey }) {
  switch (name) {
    case "estimates":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
          <path d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" strokeWidth="1.7" />
          <path d="M13 4v5h5" strokeWidth="1.7" />
          <path d="M9 13h6M9 16h4" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "delivery-notes":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
          <path d="M3 7h11v9H3z" strokeWidth="1.7" />
          <path d="M14 10h4l3 3v3h-7z" strokeWidth="1.7" />
          <circle cx="7.5" cy="18" r="1.5" strokeWidth="1.7" />
          <circle cx="17" cy="18" r="1.5" strokeWidth="1.7" />
        </svg>
      );
    case "invoices":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" strokeWidth="1.7" />
          <path d="M9 8h6M9 12h6M9 16h4" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "receipts":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
          <path d="M5 4h14v17l-2-1.5L15 21l-3-1.5L9 21l-2-1.5L5 21V4Z" strokeWidth="1.7" />
          <path d="M9 9h6M9 13h6" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}

function DocBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current">
      <path d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" strokeWidth="1.7" />
      <path d="M13 4v5h5" strokeWidth="1.7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M9 4a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4Z" />
    </svg>
  );
}
