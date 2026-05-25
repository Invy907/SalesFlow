"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { getReportsContent, getReportsTabHref, type ReportsTabKey } from "./content";

export function ReportsSubNav({ active }: { active: ReportsTabKey }) {
  const { lang } = useLanguage();
  const ui = getReportsContent(lang);
  const tabs: ReportsTabKey[] = ["main", "receivables", "collections"];

  return (
    <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-6">
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Link
            key={tab}
            href={getReportsTabHref(lang, tab)}
            className={[
              "rounded px-5 py-2.5 text-[15px] font-semibold transition",
              isActive
                ? "bg-[#14a7bb] text-white"
                : "border border-[#14a7bb] text-[#14a7bb] hover:bg-cyan-50",
            ].join(" ")}
          >
            {ui.tabs[tab]}
          </Link>
        );
      })}
    </div>
  );
}

export function ReportsLearnMoreLink({ label }: { label: string }) {
  return (
    <a href="#" className="inline-flex items-center gap-1 text-[#14a7bb] hover:underline">
      ({label})
      <ExternalLinkIcon />
    </a>
  );
}

export function ReportsInfoIcon() {
  return (
    <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white">
      ?
    </span>
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
