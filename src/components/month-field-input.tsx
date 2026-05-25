"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage, type AppLocale } from "@/contexts/language-context";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const localeMap: Record<AppLocale, string> = {
  ja: "ja-JP",
  ko: "ko-KR",
  en: "en-US",
};

const monthPickerCopy = {
  ja: { header: "年月を選択" },
  ko: { header: "연월 선택" },
  en: { header: "Select month" },
} as const;

function parseMonthValue(value: string) {
  const normalized = value.replace("/", "-");
  const [year, month] = normalized.split("-").map(Number);
  if (!year || !month) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

function formatMonthValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}`;
}

function formatYearLabel(date: Date, lang: AppLocale) {
  return new Intl.DateTimeFormat(localeMap[lang], {
    year: "numeric",
  }).format(date);
}

function getMonthLabels(lang: AppLocale) {
  return Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(localeMap[lang], { month: "short" }).format(new Date(2024, index, 1)),
  );
}

export function MonthFieldInput({ value, onChange, className = "field w-[120px] bg-white" }: Props) {
  const { lang } = useLanguage();
  const ui = monthPickerCopy[lang] ?? monthPickerCopy.ja;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);
  const selectedDate = useMemo(() => parseMonthValue(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (selectedDate ?? today).getFullYear());
  const monthLabels = useMemo(() => getMonthLabels(lang), [lang]);

  useEffect(() => {
    if (!isOpen) {
      setViewYear((selectedDate ?? today).getFullYear());
    }
  }, [isOpen, selectedDate, today]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectMonth = (monthIndex: number) => {
    onChange(formatMonthValue(new Date(viewYear, monthIndex, 1)));
    setIsOpen(false);
  };

  const pickerPanel = isOpen ? (
    <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
      <div className="border-b border-slate-100 bg-[#f8fafc] px-4 py-3">
        <p className="text-xs font-medium tracking-wide text-slate-500">{ui.header}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setViewYear((year) => year - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800"
            aria-label="Previous year"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
              <path d="M14.7 5.3a1 1 0 0 1 0 1.4L9.41 12l5.3 5.3a1 1 0 1 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.41 0Z" />
            </svg>
          </button>
          <p className="text-lg font-semibold text-slate-900">
            {formatYearLabel(new Date(viewYear, 0, 1), lang)}
          </p>
          <button
            type="button"
            onClick={() => setViewYear((year) => year + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800"
            aria-label="Next year"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
              <path d="M9.3 18.7a1 1 0 0 1 0-1.4l5.29-5.3-5.3-5.3a1 1 0 0 1 1.42-1.4l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.41 0Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4">
        {monthLabels.map((label, index) => {
          const isSelected =
            selectedDate?.getFullYear() === viewYear && selectedDate.getMonth() === index;
          const isCurrentMonth =
            today.getFullYear() === viewYear && today.getMonth() === index;

          return (
            <button
              key={label}
              type="button"
              onClick={() => selectMonth(index)}
              className={[
                "rounded-lg px-2 py-2.5 text-sm font-medium transition",
                isSelected
                  ? "bg-[#14a7bb] text-white shadow-sm"
                  : "text-slate-700 hover:bg-cyan-50 hover:text-cyan-700",
                isCurrentMonth && !isSelected ? "ring-1 ring-cyan-300" : "",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={[
          className,
          "cursor-pointer text-left transition",
          isOpen ? "border-cyan-400 shadow-[0_0_0_3px_rgba(34,184,207,0.14)]" : "",
        ].join(" ")}
      >
        {value}
      </button>
      {pickerPanel}
    </div>
  );
}
