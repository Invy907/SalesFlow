import type { AppLocale } from "@/contexts/language-context";

export type ReportsTabKey = "main" | "receivables" | "collections";

const labels = {
  ja: {
    tabs: {
      main: "レポート",
      receivables: "売掛残高一覧表",
      collections: "回収予定一覧表",
    },
    main: {
      title: "レポート",
      client: "取引先",
      allClients: "すべて",
      filter: "この条件で絞り込む",
      chartTitle: "請求金額 [千円]",
      legendPrevious: "前年",
      legendUnpaid: "期間内未入金",
      legendPaid: "期間内入金済",
      summaryMonth: "年月",
      topClientsTitle: "取引先（送り先）別請求金額上位20社",
      topClientsClient: "取引先",
      topClientsTotal: "合計",
      empty: "対象期間の請求データがありません",
      noClient: "取引先未設定",
    },
    receivables: {
      title: "売掛残高一覧表",
      intro: "月ごとの売掛残高を確認できます。",
      learnMore: "さらに詳しく",
      aggregationMonth: "集計月",
      apply: "適用",
      headers: ["取引先名", "前月末残高", "当月請求金額", "当月回収金額", "当月末残高"],
      total: "合計",
      empty: "対象月の売掛データがありません",
      noClient: "取引先未設定",
    },
    collections: {
      title: "回収予定一覧表",
      intro: "取引先ごとの回収予定を確認できます。",
      learnMore: "さらに詳しく",
      aggregationMonth: "基準月",
      apply: "適用",
      headers: ["取引先名", "前月末時点未回収", "当月予定", "翌月予定", "翌々月以降"],
      total: "合計",
      empty: "未回収の請求書がありません",
      noClient: "取引先未設定",
    },
  },
  ko: {
    tabs: {
      main: "리포트",
      receivables: "매출채권 잔액 목록",
      collections: "회수 예정 목록",
    },
    main: {
      title: "리포트",
      client: "거래처",
      allClients: "전체",
      filter: "이 조건으로 필터",
      chartTitle: "청구 금액 [천엔]",
      legendPrevious: "전년",
      legendUnpaid: "기간 내 미입금",
      legendPaid: "기간 내 입금 완료",
      summaryMonth: "연월",
      topClientsTitle: "거래처(배송지)별 청구 금액 상위 20곳",
      topClientsClient: "거래처",
      topClientsTotal: "합계",
      empty: "해당 기간의 청구 데이터가 없습니다",
      noClient: "거래처 미지정",
    },
    receivables: {
      title: "매출채권 잔액 목록",
      intro: "월별 매출채권 잔액을 확인할 수 있습니다.",
      learnMore: "자세히 보기",
      aggregationMonth: "집계월",
      apply: "적용",
      headers: ["거래처명", "전월말 잔액", "당월 청구 금액", "당월 회수 금액", "당월말 잔액"],
      total: "합계",
      empty: "해당 월의 매출채권 데이터가 없습니다",
      noClient: "거래처 미지정",
    },
    collections: {
      title: "회수 예정 목록",
      intro: "거래처별 회수 예정을 확인할 수 있습니다.",
      learnMore: "자세히 보기",
      aggregationMonth: "기준월",
      apply: "적용",
      headers: ["거래처명", "전월말 시점 미회수", "당월 예정", "익월 예정", "익익월 이후"],
      total: "합계",
      empty: "미회수 청구서가 없습니다",
      noClient: "거래처 미지정",
    },
  },
  en: {
    tabs: {
      main: "Reports",
      receivables: "Accounts Receivable Balance",
      collections: "Collection Schedule",
    },
    main: {
      title: "Reports",
      client: "Client",
      allClients: "All",
      filter: "Filter with these conditions",
      chartTitle: "Billing Amount [Thousand Yen]",
      legendPrevious: "Previous Year",
      legendUnpaid: "Unpaid in Period",
      legendPaid: "Paid in Period",
      summaryMonth: "Month",
      topClientsTitle: "Top 20 Clients by Billing Amount",
      topClientsClient: "Client",
      topClientsTotal: "Total",
      empty: "No billing data for the selected period",
      noClient: "No client",
    },
    receivables: {
      title: "Accounts Receivable Balance List",
      intro: "Review accounts receivable balances by month.",
      learnMore: "Learn more",
      aggregationMonth: "Aggregation Month",
      apply: "Apply",
      headers: [
        "Client Name",
        "Balance at Previous Month End",
        "Billing This Month",
        "Collection This Month",
        "Balance at Month End",
      ],
      total: "Total",
      empty: "No receivable data for the selected month",
      noClient: "No client",
    },
    collections: {
      title: "Collection Schedule List",
      intro: "Review collection schedules by client.",
      learnMore: "Learn more",
      aggregationMonth: "Base Month",
      apply: "Apply",
      headers: [
        "Client Name",
        "Uncollected at Previous Month End",
        "This Month",
        "Next Month",
        "After Next Month",
      ],
      total: "Total",
      empty: "No uncollected invoices",
      noClient: "No client",
    },
  },
} as const;

export function getReportsContent(lang: AppLocale) {
  return labels[lang];
}

export function getReportsTabHref(_lang: AppLocale, tab: ReportsTabKey) {
  const base = "/reports";
  if (tab === "main") return base;
  return `${base}/${tab}`;
}

const intlLocales: Record<AppLocale, string> = { ja: "ja-JP", ko: "ko-KR", en: "en-US" };

/** "YYYY-MM" → locale 월 라벨. 1월이거나 첫 항목이면 연도를 붙인다. */
export function formatReportMonthLabel(lang: AppLocale, month: string, withYear = false) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, 1);
  const locale = intlLocales[lang];
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      ...(withYear || m === 1 ? { year: "numeric" } : {}),
    }).format(date);
  } catch {
    return month;
  }
}

/** "YYYY-MM" ↔ MonthFieldInput 의 "YYYY/MM" */
export function toMonthField(month: string) {
  return month.replace("-", "/");
}

export function fromMonthField(value: string) {
  return value.replace("/", "-");
}
