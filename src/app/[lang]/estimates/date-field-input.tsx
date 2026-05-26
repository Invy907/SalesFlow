"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage, type AppLocale } from "@/contexts/language-context";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  variant?: "field" | "card";
  inactive?: boolean;
  onActivate?: () => void;
};

const calendarCopy = {
  ja: {
    weekdays: ["\u65e5", "\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f"],
    clear: "\u524a\u9664",
    today: "\u4eca\u65e5",
    header: "CALENDAR",
  },
  ko: {
    weekdays: ["\uc77c", "\uc6d4", "\ud654", "\uc218", "\ubaa9", "\uae08", "\ud1a0"],
    clear: "\uc0ad\uc81c",
    today: "\uc624\ub298",
    header: "CALENDAR",
  },
  en: {
    weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    clear: "Clear",
    today: "Today",
    header: "CALENDAR",
  },
} as const;

const localeMap: Record<AppLocale, string> = {
  ja: "ja-JP",
  ko: "ko-KR",
  en: "en-US",
};

function parseDateValue(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string, lang: AppLocale) {
  const date = parseDateValue(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(localeMap[lang], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatMonthLabel(date: Date, lang: AppLocale) {
  return new Intl.DateTimeFormat(localeMap[lang], {
    year: "numeric",
    month: "long",
  }).format(date);
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const calendarStart = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7ZM5 6a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1H5Z" />
    </svg>
  );
}

export function DateFieldInput({
  value,
  onChange,
  placeholder,
  variant = "field",
  inactive = false,
  onActivate,
}: Props) {
  const { lang } = useLanguage();
  const ui = calendarCopy[lang] ?? calendarCopy.ja;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? today);
  const displayValue = value ? formatDateLabel(value, lang) : placeholder;

  useEffect(() => {
    if (!isOpen) {
      setViewDate(selectedDate ?? today);
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

  const days = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  const selectDate = (date: Date) => {
    onChange(formatDateValue(date));
    setIsOpen(false);
  };

  const moveMonth = (offset: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const calendarPanel = isOpen ? (
    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 mx-auto w-full max-w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:right-auto sm:mx-0">
      <div className="bg-linear-to-r from-slate-950 via-slate-900 to-cyan-700 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/18"
            aria-label="Previous month"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
              <path d="M14.7 5.3a1 1 0 0 1 0 1.4L9.41 12l5.3 5.3a1 1 0 1 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.41 0Z" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-xs tracking-[0.24em] text-cyan-100">{ui.header}</p>
            <p className="mt-1 text-lg font-semibold">{formatMonthLabel(viewDate, lang)}</p>
          </div>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/18"
            aria-label="Next month"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
              <path d="M9.3 18.7a1 1 0 0 1 0-1.4l5.29-5.3-5.3-5.3a1 1 0 0 1 1.42-1.4l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.41 0Z" />
            </svg>
          </button>
        </div>

        <p className="mt-4 text-2xl font-semibold">{displayValue}</p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-[0.16em] text-slate-400">
          {ui.weekdays.map((label, index) => (
            <div key={`${label}-${index}`} className="py-2">
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((date) => {
            const isCurrentMonth = date.getMonth() === viewDate.getMonth();
            const isSelected = selectedDate ? isSameDate(date, selectedDate) : false;
            const isToday = isSameDate(date, today);

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => selectDate(date)}
                className={[
                  "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition",
                  isSelected
                    ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)]"
                    : isCurrentMonth
                      ? "text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
                      : "text-slate-300 hover:bg-slate-50",
                  isToday && !isSelected ? "ring-1 ring-cyan-300" : "",
                ].join(" ")}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {ui.clear}
          </button>
          <button
            type="button"
            onClick={() => selectDate(today)}
            className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            {ui.today}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (variant === "card") {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => {
            onActivate?.();
            setIsOpen((open) => !open);
          }}
          className={[
            "group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition",
            "bg-linear-to-br from-white via-slate-50 to-cyan-50/60",
            "shadow-[0_14px_35px_rgba(15,23,42,0.06)]",
            inactive && !isOpen ? "opacity-60" : "",
            isOpen
              ? "border-cyan-400 shadow-[0_20px_45px_rgba(34,184,207,0.16)]"
              : "border-slate-200 hover:border-cyan-300 hover:shadow-[0_18px_40px_rgba(34,184,207,0.12)]",
          ].join(" ")}
        >
          <div className="min-w-0">
            <p className={value ? "text-[18px] font-semibold text-slate-900" : "text-[16px] text-slate-400"}>
              {displayValue}
            </p>
          </div>

          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition",
              isOpen
                ? "bg-cyan-500 text-white shadow-[0_12px_24px_rgba(6,182,212,0.28)]"
                : "bg-white text-slate-500 ring-1 ring-slate-200 group-hover:bg-cyan-500 group-hover:text-white group-hover:ring-cyan-500",
            ].join(" ")}
          >
            <CalendarIcon className="h-5 w-5" />
          </div>
        </button>
        {calendarPanel}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          onActivate?.();
          setIsOpen((open) => !open);
        }}
        className={[
          "field flex w-full items-center gap-3 text-left text-[16px] transition",
          inactive && !isOpen ? "opacity-60" : "",
          isOpen ? "border-cyan-400 shadow-[0_0_0_3px_rgba(34,184,207,0.14)]" : "",
        ].join(" ")}
      >
        <CalendarIcon className="h-5 w-5 shrink-0 text-slate-400" />
        <span className={value ? "font-medium text-slate-700" : "text-slate-400"}>{displayValue}</span>
      </button>
      {calendarPanel}
    </div>
  );
}
