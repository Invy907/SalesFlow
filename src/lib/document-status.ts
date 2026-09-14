type SalesLocale = "ja" | "ko" | "en";

const STATUS_LABELS: Record<SalesLocale, Record<string, string>> = {
  ja: {
    draft: "未発行",
    issued: "発行済",
    sent: "送付済み",
    confirmed: "処理済",
    overdue: "期限超過",
    trashed: "ごみ箱",
  },
  ko: {
    draft: "미발행",
    issued: "발행 완료",
    sent: "발송 완료",
    confirmed: "처리 완료",
    overdue: "기한 초과",
    trashed: "휴지통",
  },
  en: {
    draft: "Not issued",
    issued: "Issued",
    sent: "Sent",
    confirmed: "Processed",
    overdue: "Overdue",
    trashed: "Trash",
  },
};

export function formatSalesDocumentStatus(locale: SalesLocale, status: string): string {
  return STATUS_LABELS[locale][status] ?? status;
}
