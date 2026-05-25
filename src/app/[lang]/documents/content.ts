import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    fileChoose: "参照 選択",
    fileNoFile: "選択されたファイルはありません",
  },
  ko: {
    fileChoose: "찾아보기",
    fileNoFile: "선택된 파일 없음",
  },
  en: {
    fileChoose: "Browse",
    fileNoFile: "No file selected",
  },
} as const;

export function getDocumentSharedContent(lang: AppLocale) {
  return labels[lang];
}
