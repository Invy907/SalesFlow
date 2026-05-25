import type { ReactNode } from "react";

export function ListPageTabs({
  tabs,
  activeIndex = 0,
}: {
  tabs: readonly string[];
  activeIndex?: number;
}) {
  return (
    <div className="flex gap-8 border-b border-slate-200 text-[17px]">
      {tabs.map((tab, index) => (
        <span
          key={tab}
          className={[
            "border-b-[3px] px-1 pb-3",
            index === activeIndex
              ? "border-cyan-500 font-medium text-slate-900"
              : "border-transparent text-slate-500",
          ].join(" ")}
        >
          {tab}
        </span>
      ))}
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
      className="inline-flex shrink-0 items-center justify-center rounded bg-[#f59b45] px-6 py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#ef8d32]"
    >
      {label}
    </button>
  );
}

export function ListSearchBar({
  placeholder,
  searchLabel,
}: {
  placeholder: string;
  searchLabel: string;
}) {
  return (
    <div className="flex w-full max-w-[520px] rounded border border-slate-300 bg-white">
      <input
        className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
        placeholder={placeholder}
      />
      <button
        type="button"
        className="border-l border-slate-300 px-5 text-[15px] font-medium text-slate-700"
      >
        {searchLabel}
      </button>
    </div>
  );
}

export function CsvDownloadLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[14px] text-[#14a7bb] hover:underline"
    >
      <DownloadIcon />
      {label}
      <ChevronDownIcon />
    </button>
  );
}

export function LearnMoreLink({ label }: { label: string }) {
  return (
    <a href="#" className="inline-flex items-center gap-1 text-[#14a7bb] hover:underline">
      ({label})
      <ExternalLinkIcon />
    </a>
  );
}

export function RequiredBadge({ label }: { label: string }) {
  return (
    <span className="rounded bg-[#f59b45] px-2 py-0.5 text-xs font-bold text-white">{label}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-[760px] flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[20px] font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        <div className="flex items-center justify-end gap-4 border-t border-slate-200 px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M10 2a1 1 0 0 1 1 1v7.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L9 10.59V3a1 1 0 0 1 1-1Z" />
      <path d="M3 14a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H3Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
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
