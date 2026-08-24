import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    exportAction: "出力 ▼",
    exportMenu: {
      download: "PDFダウンロード",
      excel: "Excelダウンロード",
      print: "印刷",
    },
    actions: {
      downloaded: "PDFをダウンロードしました。",
      excelDownloaded: "Excelファイルをダウンロードしました。",
      printing: "印刷ダイアログを開きました。",
    },
  },
  ko: {
    exportAction: "출력 ▼",
    exportMenu: {
      download: "PDF 다운로드",
      excel: "Excel 다운로드",
      print: "인쇄",
    },
    actions: {
      downloaded: "PDF를 다운로드했습니다.",
      excelDownloaded: "Excel 파일을 다운로드했습니다.",
      printing: "인쇄 창을 열었습니다.",
    },
  },
  en: {
    exportAction: "Export ▼",
    exportMenu: {
      download: "Download PDF",
      excel: "Download Excel",
      print: "Print",
    },
    actions: {
      downloaded: "PDF downloaded.",
      excelDownloaded: "Excel file downloaded.",
      printing: "Opened the print dialog.",
    },
  },
} as const;

export function getDocumentExportUiLabels(locale: string) {
  const lang = (locale === "ko" || locale === "en" ? locale : "ja") as AppLocale;
  return labels[lang];
}
