"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ModalDialog } from "@/components/modal-dialog";
import { appHrefs } from "@/lib/app-hrefs";

export function ListPageTabs({
  tabs,
  activeIndex = 0,
  onTabChange,
  align = "start",
  size = "md",
}: {
  tabs: readonly string[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  align?: "start" | "end";
  size?: "md" | "lg";
}) {
  return (
    <div
      className={[
        "-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0",
        align === "end" ? "w-full" : "",
      ].join(" ")}
    >
      <div
        className={[
          "flex min-w-max gap-4 border-b border-slate-200 sm:gap-8",
          size === "lg" ? "text-lg sm:text-xl" : "text-base sm:text-[17px]",
          align === "end" ? "w-full justify-end" : "",
        ].join(" ")}
      >
      {tabs.map((tab, index) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange?.(index)}
          aria-current={index === activeIndex ? "page" : undefined}
          className={[
            "shrink-0 whitespace-nowrap border-b-[3px] px-1 pb-3 transition",
            index === activeIndex
              ? "border-[#1A7A57] font-medium text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700",
            onTabChange ? "cursor-pointer" : "cursor-default",
          ].join(" ")}
        >
          {tab}
        </button>
      ))}
      </div>
    </div>
  );
}

export type SubNavTab = {
  key: string;
  label: string;
  href: string;
  disabled?: boolean;
};

/** 설정/청구서/수주관리/레포트 서브탭 공용 밴드 — 연한 그레이 배경 + 필 모양 활성 탭. */
export function SubNavBand({
  tabs,
  activeKey,
  extra,
}: {
  tabs: SubNavTab[];
  activeKey: string;
  extra?: ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 bg-slate-100">
      <div className="mx-auto flex w-full min-w-0 max-w-[1260px] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6 lg:px-8">
        <div className="-mx-4 flex min-w-0 gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-1 sm:px-0">
          {tabs.map((tab) => {
            const isActive = tab.key === activeKey;
            const className = [
              "shrink-0 whitespace-nowrap rounded px-4 py-2.5 text-[15px] font-medium transition",
              isActive
                ? "bg-[#0A4D34] text-white shadow-sm"
                : tab.disabled
                  ? "text-slate-400 hover:bg-white/50"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
            ].join(" ");

            if (tab.disabled) {
              return (
                <span key={tab.key} className={className} aria-disabled="true">
                  {tab.label}
                </span>
              );
            }

            return (
              <Link key={tab.key} href={tab.href} className={className} aria-current={isActive ? "page" : undefined}>
                {tab.label}
              </Link>
            );
          })}
        </div>
        {extra ? <div className="shrink-0 sm:ml-auto">{extra}</div> : null}
      </div>
    </div>
  );
}

export function ListPrimaryButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full shrink-0 items-center justify-center rounded bg-[#0A4D34] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#083D29] sm:w-auto"
    >
      {label}
    </button>
  );
}

export function ListSearchBar({
  placeholder,
  searchLabel,
  defaultValue,
  onSearch,
}: {
  placeholder: string;
  searchLabel: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <form
      className="flex w-full max-w-full rounded border border-slate-300 bg-white sm:max-w-[520px]"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.(value.trim());
      }}
    >
      <input
        type="search"
        aria-label={placeholder}
        className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#1A7A57]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="shrink-0 whitespace-nowrap border-l border-slate-300 px-5 text-[15px] font-medium text-slate-700"
      >
        {searchLabel}
      </button>
    </form>
  );
}

export function CsvDownloadLink({
  label,
  onDownload,
}: {
  label: string;
  onDownload?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={!onDownload}
      className="inline-flex items-center gap-1 text-[14px] text-[#0A4D34] hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
    >
      <DownloadIcon />
      {label}
      <ChevronDownIcon />
    </button>
  );
}

export function LearnMoreLink({ label, href = appHrefs.supportInvoiceGuide }: { label: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[#0A4D34] hover:underline">
      ({label})
      <ExternalLinkIcon />
    </Link>
  );
}

/** CSV 일괄 등록 화면(품목·거래처)의 섹션 카드. */
export function BulkSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="bg-[#dbe8f3] px-5 py-3">
        <h2 className="text-[18px] font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function BulkInfoTable({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-[14px]">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
              <td className="w-[240px] whitespace-pre-line bg-[#f8fafc] px-4 py-4 align-top font-medium text-slate-700">
                {row.label}
              </td>
              <td className="px-4 py-4 text-slate-700">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RequiredBadge({ label }: { label: string }) {
  return (
    <span className="inline-block shrink-0 whitespace-nowrap rounded bg-[#0A4D34] px-2 py-0.5 text-xs font-bold text-white">{label}</span>
  );
}

export function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <ModalDialog label={title} onClose={onClose} className="max-w-[760px]">
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full min-w-0 max-w-[760px] flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="min-w-0 text-[20px] font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-4 py-4 sm:px-6">
          {footer}
        </div>
      </div>
    </ModalDialog>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current">
      <path d="M10 2a1 1 0 0 1 1 1v7.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L9 10.59V3a1 1 0 0 1 1-1Z" />
      <path d="M3 14a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H3Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current">
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current">
      <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
      <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
    </svg>
  );
}
