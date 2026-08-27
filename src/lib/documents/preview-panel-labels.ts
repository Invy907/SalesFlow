import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    title: "プレビュー",
    note: "入力した内容がそのまま反映されます",
    show: "プレビューを表示",
    hide: "プレビューを閉じる",
    fit: "全体表示",
    actual: "実寸",
    close: "閉じる",
  },
  ko: {
    title: "미리보기",
    note: "입력한 내용이 그대로 반영됩니다",
    show: "미리보기 표시",
    hide: "미리보기 닫기",
    fit: "전체 보기",
    actual: "실제 크기",
    close: "닫기",
  },
  en: {
    title: "Preview",
    note: "Reflects what you type, as it will be saved",
    show: "Show preview",
    hide: "Hide preview",
    fit: "Fit",
    actual: "Actual size",
    close: "Close",
  },
} as const;

export function getDocumentPreviewPanelLabels(locale: string) {
  const lang = (locale === "ko" || locale === "en" ? locale : "ja") as AppLocale;
  return labels[lang];
}
