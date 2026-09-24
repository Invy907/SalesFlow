import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    title: "ご利用履歴",
    intro: "現在の組織で作成した請求書の件数を確認できます。",
    currentMonth: "当月の利用実績",
    invoiceSection: "請求書",
    createdCount: "作成通数",
    countUnit: "通",
    countDefinition: "日本時間の当月に作成された請求書を集計しています。ごみ箱内の請求書も含みます。請求日ではなく作成日時を基準にしています。",
    invoiceList: "請求書一覧を見る",
    billingSection: "契約・請求情報",
    billingUnavailable: "契約プラン、無料枠、請求金額はまだ連携されていないため、この画面では確認・変更できません。上記の作成通数は課金額を表すものではありません。",
    serviceUsageUnavailable: "郵送・FAX・回収保証の利用明細も未連携です。利用の有無や料金はこの画面では確認できません。",
  },
  ko: {
    title: "이용 내역",
    intro: "현재 조직에서 작성한 청구서 건수를 확인할 수 있습니다.",
    currentMonth: "당월 이용 실적",
    invoiceSection: "청구서",
    createdCount: "작성 건수",
    countUnit: "건",
    countDefinition: "일본 시간 기준 이번 달에 생성한 청구서를 집계합니다. 휴지통의 청구서도 포함하며, 청구일이 아닌 생성 시각을 기준으로 합니다.",
    invoiceList: "청구서 목록 보기",
    billingSection: "계약·청구 정보",
    billingUnavailable: "계약 플랜, 무료 한도, 청구 금액은 아직 연동되지 않아 이 화면에서 확인하거나 변경할 수 없습니다. 위 작성 건수는 과금액을 뜻하지 않습니다.",
    serviceUsageUnavailable: "우편·FAX·회수 보증의 이용 내역도 연동되지 않았습니다. 이 화면에서는 이용 여부나 요금을 확인할 수 없습니다.",
  },
  en: {
    title: "Usage History",
    intro: "View the number of invoices created by your current organization.",
    currentMonth: "Current Month Usage",
    invoiceSection: "Invoices",
    createdCount: "Documents Created",
    countUnit: "docs",
    countDefinition: "Counts invoices created during the current month in Japan time, including those in the trash. The creation timestamp is used, rather than the invoice date.",
    invoiceList: "View invoices",
    billingSection: "Plan and Billing Information",
    billingUnavailable: "Plan details, free allowances, and billing amounts are not connected yet, so they cannot be viewed or changed here. The document count above does not represent a billing amount.",
    serviceUsageUnavailable: "Usage records for mailing, FAX, and collection guarantees are also not connected. This page cannot confirm whether these services were used or any charges apply.",
  },
} as const;

export function getUsageContent(lang: AppLocale) {
  return labels[lang];
}
