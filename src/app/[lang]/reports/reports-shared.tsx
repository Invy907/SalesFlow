"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { appHrefs } from "@/lib/app-hrefs";
import { SubNavBand } from "../list-page-shared";
import { getReportsContent, getReportsTabHref, type ReportsTabKey } from "./content";

export function ReportsSubNav({ active }: { active: ReportsTabKey }) {
  const { lang } = useLanguage();
  const ui = getReportsContent(lang);
  const tabKeys: ReportsTabKey[] = ["main", "receivables", "collections"];

  const tabs = tabKeys.map((key) => ({
    key,
    label: ui.tabs[key],
    href: getReportsTabHref(lang, key),
  }));

  return <SubNavBand tabs={tabs} activeKey={active} />;
}

export function ReportsLearnMoreLink({ label }: { label: string }) {
  return (
    <Link href={appHrefs.support} className="inline-flex items-center gap-1 text-[#0A4D34] hover:underline">
      ({label})
      <ExternalLinkIcon />
    </Link>
  );
}

export function ReportsInfoIcon({ hint }: { hint?: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setAnchorRect(el.getBoundingClientRect());
  }, []);

  const hideTooltip = useCallback(() => {
    setAnchorRect(null);
    setPlacement(null);
  }, []);

  /* 말풍선을 실제로 그린 뒤 폭을 재서 아이콘 중앙에 맞춘다. 미리 최대폭으로
     계산하면 짧은 문구일 때 아이콘에서 멀리 떨어져 보인다. */
  useLayoutEffect(() => {
    const tip = tooltipRef.current;
    if (!anchorRect || !tip) return;
    const margin = 12;
    const width = tip.offsetWidth;
    const centered = anchorRect.left + anchorRect.width / 2 - width / 2;
    const left = Math.max(
      margin,
      Math.min(centered, window.innerWidth - width - margin),
    );
    setPlacement({ top: anchorRect.bottom + 8, left });
  }, [anchorRect]);

  if (!hint) return null;

  const tooltipNode =
    anchorRect &&
    createPortal(
      <span
        ref={tooltipRef}
        role="tooltip"
        style={{
          position: "fixed",
          top: placement?.top ?? anchorRect.bottom + 8,
          left: placement?.left ?? 0,
          maxWidth: Math.min(320, window.innerWidth - 24),
          visibility: placement ? "visible" : "hidden",
        }}
        className="pointer-events-none z-[9999] w-max whitespace-normal break-words rounded border border-slate-200 bg-white px-3 py-2 text-left text-[12px] font-normal leading-snug text-slate-700 shadow-lg"
      >
        {hint}
      </span>,
      document.body,
    );

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
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold leading-none text-white outline-none focus-visible:ring-2 focus-visible:ring-[#0A4D34]"
          aria-label={hint}
        >
          ?
        </span>
      </span>
      {tooltipNode}
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
