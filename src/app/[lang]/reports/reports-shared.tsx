"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { appHrefs } from "@/lib/app-hrefs";
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
    <Link href={appHrefs.support} className="inline-flex items-center gap-1 text-[#14a7bb] hover:underline">
      ({label})
      <ExternalLinkIcon />
    </Link>
  );
}

export function ReportsInfoIcon({
  hint,
  align = "end",
}: {
  hint?: string;
  align?: "start" | "end";
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const showTooltip = useCallback(() => {
    const el = anchorRef.current;
    if (!el || !hint) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    const maxWidth = Math.min(320, window.innerWidth - margin * 2);
    let left = align === "end" ? rect.right - maxWidth : rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - maxWidth - margin));
    setTooltip({ top: rect.bottom + 6, left, width: maxWidth });
  }, [align, hint]);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  if (!hint) return null;

  return (
    <>
      <span
        ref={anchorRef}
        tabIndex={0}
        className="ml-1 inline-flex align-middle"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <span
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold leading-none text-white outline-none focus-visible:ring-2 focus-visible:ring-[#14a7bb]"
          aria-label={hint}
        >
          ?
        </span>
      </span>
      {tooltip ? (
        <span
          role="tooltip"
          style={{ top: tooltip.top, left: tooltip.left, width: tooltip.width }}
          className="pointer-events-none fixed z-[300] whitespace-normal rounded border border-slate-200 bg-white px-3 py-2 text-left text-[12px] font-normal leading-snug text-slate-700 shadow-lg"
        >
          {hint}
        </span>
      ) : null}
    </>
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
