"use client";

import type { AppLocaleCode } from "@/lib/locale";
import {
  DOCUMENT_OUTPUT_LOCALES,
  type DocumentOutputLocale,
} from "@/lib/documents/output-locale";

const COPY = {
  ko: {
    title: "출력 언어",
    description: "미리보기와 저장 후 인쇄·PDF·공유 문서에 적용됩니다.",
  },
  ja: {
    title: "出力言語",
    description: "プレビューと保存後の印刷・PDF・共有文書に適用されます。",
  },
  en: {
    title: "Output language",
    description: "Used for previews and saved print, PDF, and shared documents.",
  },
} satisfies Record<AppLocaleCode, { title: string; description: string }>;

const OPTION_LABELS: Record<DocumentOutputLocale, string> = {
  ko: "한국어",
  ja: "日本語",
  en: "English",
};

export function OutputLanguageSelector({
  uiLocale,
  value,
  onChange,
}: {
  uiLocale: AppLocaleCode;
  value: DocumentOutputLocale;
  onChange: (locale: DocumentOutputLocale) => void;
}) {
  const copy = COPY[uiLocale];

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <legend className="sr-only">{copy.title}</legend>
      <div className="text-[16px] font-semibold text-slate-800">{copy.title}</div>
      <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={copy.title}>
        {DOCUMENT_OUTPUT_LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={value === locale}
            onClick={() => onChange(locale)}
            className={[
              "rounded-md border px-4 py-2.5 text-sm font-semibold transition",
              value === locale
                ? "border-cyan-600 bg-cyan-600 text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-700",
            ].join(" ")}
          >
            {OPTION_LABELS[locale]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
