import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    title: "ご利用履歴",
    intro:
      "サービスの利用履歴を確認できます。実際の請求金額はこちらのボタンからご参照ください。",
    inquireBilling: "請求金額を照会する",
    currentMonth: "当月の利用実績",
    planUpgrade: "プランアップグレード",
    invoiceSection: "請求書",
    createdCount: "作成通数",
    freeAllowance: "無料分",
    countUnit: "通",
    mailingSection: "郵送・FAX・回収保証",
    previousMonth: "前月のご利用履歴",
    tableHeaders: ["年月日", "種別", "通数", "ご利用金額"],
    emptyBilling: "課金対象となるご利用はありません。",
    sampleCreated: "1",
    sampleFree: "10",
  },
  ko: {
    title: "이용 내역",
    intro:
      "서비스 이용 내역을 확인할 수 있습니다. 실제 청구 금액은 아래 버튼에서 확인해 주세요.",
    inquireBilling: "청구 금액 조회",
    currentMonth: "당월 이용 실적",
    planUpgrade: "플랜 업그레이드",
    invoiceSection: "청구서",
    createdCount: "작성 건수",
    freeAllowance: "무료 분",
    countUnit: "건",
    mailingSection: "우편·FAX·회수 보증",
    previousMonth: "전월 이용 내역",
    tableHeaders: ["연월일", "종별", "건수", "이용 금액"],
    emptyBilling: "과금 대상 이용 내역이 없습니다.",
    sampleCreated: "1",
    sampleFree: "10",
  },
  en: {
    title: "Usage History",
    intro:
      "Review your service usage history. Use the button below to check your actual billing amount.",
    inquireBilling: "Inquire about billing amount",
    currentMonth: "Current Month Usage",
    planUpgrade: "Upgrade Plan",
    invoiceSection: "Invoices",
    createdCount: "Documents Created",
    freeAllowance: "Free Allowance",
    countUnit: "docs",
    mailingSection: "Mailing, FAX, Collection Guarantee",
    previousMonth: "Previous month's usage history",
    tableHeaders: ["Date", "Type", "Count", "Amount"],
    emptyBilling: "There is no usage subject to billing.",
    sampleCreated: "1",
    sampleFree: "10",
  },
} as const;

export function getUsageContent(lang: AppLocale) {
  return labels[lang];
}
