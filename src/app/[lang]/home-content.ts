import type { AppLocale } from "@/contexts/language-context";
import type { AnnouncementId } from "./support/announcements/content";
import type { DocKind } from "@/lib/db/dashboard";

export type TaskTone = "amber" | "cyan" | "slate";

export type TaskGroupKey = "duesoon" | "unsent" | "confirm";

export type HomeTaskGroupLabel = {
  key: TaskGroupKey;
  label: string;
  tone: TaskTone;
};

export type KpiTone = "neutral" | "warn" | "info";

export type KpiKey = "billed" | "unpaid" | "pending" | "duesoon";

export type HomeKpiLabel = {
  label: string;
  tone: KpiTone;
  href: string;
};

export type QuickCreateKey =
  | "estimates"
  | "delivery-notes"
  | "invoices"
  | "receipts";

export type QuickCreateItem = {
  key: QuickCreateKey;
  label: string;
  description: string;
  href: string;
  badge?: string;
};

export type HomeNotice = {
  id: AnnouncementId;
  title: string;
  date: string;
  category: string;
};

/** 숫자·일수는 서버에서 오고, 문구는 이 템플릿들로 조립한다. */
export type HomeRelativeLabels = {
  today: string;
  tomorrow: string;
  /** {days} */
  inDays: string;
  /** {days} */
  overdueDays: string;
  /** {days} */
  draftForDays: string;
  draftToday: string;
  justNow: string;
  /** {minutes} */
  minutesAgo: string;
  /** {hours} */
  hoursAgo: string;
  yesterday: string;
  /** {days} */
  daysAgo: string;
};

export type HomeContent = {
  greeting: {
    morning: string;
    afternoon: string;
    evening: string;
    suffix: string;
  };
  userName: string;
  todayLabel: string;
  newButton: string;
  newMenuTitle: string;
  newMenuItems: { label: string; href: string }[];
  searchPlaceholder: string;
  kpiLabels: Record<KpiKey, HomeKpiLabel>;
  kpiSub: {
    /** {delta} — 부호 포함 퍼센트 */
    deltaVsLastMonth: string;
    noBaseline: string;
    /** {count} */
    count: string;
    /** {draft} / {awaiting} */
    draftAwaiting: string;
    /** {overdue} */
    overdueIncluded: string;
    noOverdue: string;
  };
  tasks: {
    title: string;
    subtitle: string;
    seeAll: string;
    open: string;
    empty: string;
    groupLabels: HomeTaskGroupLabel[];
  };
  quickCreate: {
    title: string;
    subtitle: string;
    items: QuickCreateItem[];
    shortcuts: {
      label: string;
      href: string;
    }[];
  };
  recent: {
    title: string;
    seeAll: string;
    empty: string;
  };
  docLabels: Record<DocKind, string>;
  statusLabels: Record<string, string>;
  relative: HomeRelativeLabels;
  notices: {
    title: string;
    seeAll: string;
    items: HomeNotice[];
  };
};

const ja: HomeContent = {
  greeting: {
    morning: "おはようございます",
    afternoon: "こんにちは",
    evening: "こんばんは",
    suffix: "さん",
  },
  userName: "",
  todayLabel: "今日",
  newButton: "新規作成",
  newMenuTitle: "作成する書類",
  newMenuItems: [
    { label: "見積書", href: "/estimates/new" },
    { label: "納品書", href: "/delivery-notes/new" },
    { label: "請求書", href: "/invoices/new" },
    { label: "領収書", href: "/receipts/new" },
  ],
  searchPlaceholder: "取引先・書類番号・件名で検索",
  kpiLabels: {
    billed: { label: "今月の請求額", tone: "neutral", href: "/invoices" },
    unpaid: { label: "未入金", tone: "warn", href: "/invoices" },
    pending: { label: "未処理", tone: "info", href: "/invoices" },
    duesoon: { label: "期限7日以内", tone: "warn", href: "/invoices" },
  },
  kpiSub: {
    deltaVsLastMonth: "先月比 {delta}",
    noBaseline: "先月の実績なし",
    count: "{count}件",
    draftAwaiting: "下書き {draft} / 確認待ち {awaiting}",
    overdueIncluded: "うち期限超過 {overdue}件",
    noOverdue: "期限超過なし",
  },
  tasks: {
    title: "今日のタスク",
    subtitle: "優先度の高い案件をまとめました",
    seeAll: "すべて見る",
    open: "開く",
    empty: "対応が必要なタスクはありません",
    groupLabels: [
      { key: "duesoon", label: "支払い期限が近い", tone: "amber" },
      { key: "unsent", label: "未送付の書類", tone: "cyan" },
      { key: "confirm", label: "入金確認待ち", tone: "slate" },
    ],
  },
  quickCreate: {
    title: "新しく書類を作る",
    subtitle: "テンプレートからすぐに始められます",
    items: [
      {
        key: "estimates",
        label: "見積書",
        description: "案件の見積もりを発行",
        href: "/estimates/new",
      },
      {
        key: "delivery-notes",
        label: "納品書",
        description: "見積データから変換",
        href: "/delivery-notes/new",
      },
      {
        key: "invoices",
        label: "請求書",
        description: "税率と期限を自動整理",
        href: "/invoices/new",
        badge: "よく使う",
      },
      {
        key: "receipts",
        label: "領収書",
        description: "入金後すぐに発行",
        href: "/receipts/new",
      },
    ],
    shortcuts: [
      { label: "取引先を追加", href: "/clients" },
      { label: "品目を追加", href: "/items/new" },
      { label: "請求書の作り方", href: "/support/invoice-guide" },
    ],
  },
  recent: {
    title: "最近の活動",
    seeAll: "履歴を見る",
    empty: "まだ活動履歴がありません",
  },
  docLabels: {
    estimate: "見積書",
    delivery_note: "納品書",
    invoice: "請求書",
    receipt: "領収書",
  },
  statusLabels: {
    draft: "下書き",
    issued: "発行",
    sent: "送付済み",
    confirmed: "入金確認済み",
    overdue: "期限超過",
    trashed: "ゴミ箱",
  },
  relative: {
    today: "今日",
    tomorrow: "明日",
    inDays: "{days}日後",
    overdueDays: "期限超過 {days}日",
    draftForDays: "下書きのまま {days}日",
    draftToday: "今日の下書き",
    justNow: "たった今",
    minutesAgo: "{minutes}分前",
    hoursAgo: "{hours}時間前",
    yesterday: "昨日",
    daysAgo: "{days}日前",
  },
  notices: {
    title: "お知らせ",
    seeAll: "もっと見る",
    items: [
      {
        id: "invoice-guide-added",
        title: "請求書の作り方ガイドを追加しました",
        date: "2026.05.25",
        category: "新機能",
      },
      {
        id: "invoice-email-ui-update",
        title: "請求書メール送付画面のUIを更新しました",
        date: "2026.05.20",
        category: "アップデート",
      },
      {
        id: "invoice-tax-display",
        title: "インボイス制度向けの税率表示を改善",
        date: "2026.05.12",
        category: "法対応",
      },
    ],
  },
};

const ko: HomeContent = {
  greeting: {
    morning: "좋은 아침입니다",
    afternoon: "안녕하세요",
    evening: "수고하셨습니다",
    suffix: "님",
  },
  userName: "",
  todayLabel: "오늘",
  newButton: "새로 만들기",
  newMenuTitle: "문서 종류",
  newMenuItems: [
    { label: "견적서", href: "/estimates/new" },
    { label: "납품서", href: "/delivery-notes/new" },
    { label: "청구서", href: "/invoices/new" },
    { label: "영수증", href: "/receipts/new" },
  ],
  searchPlaceholder: "거래처·문서번호·건명으로 검색",
  kpiLabels: {
    billed: { label: "이번 달 청구액", tone: "neutral", href: "/invoices" },
    unpaid: { label: "미입금", tone: "warn", href: "/invoices" },
    pending: { label: "미처리", tone: "info", href: "/invoices" },
    duesoon: { label: "기한 7일 이내", tone: "warn", href: "/invoices" },
  },
  kpiSub: {
    deltaVsLastMonth: "전월 대비 {delta}",
    noBaseline: "전월 실적 없음",
    count: "{count}건",
    draftAwaiting: "초안 {draft} / 확인 대기 {awaiting}",
    overdueIncluded: "기한 초과 {overdue}건 포함",
    noOverdue: "기한 초과 없음",
  },
  tasks: {
    title: "오늘의 작업",
    subtitle: "우선순위 높은 건을 모았어요",
    seeAll: "전체 보기",
    open: "열기",
    empty: "처리할 작업이 없습니다",
    groupLabels: [
      { key: "duesoon", label: "결제 기한 임박", tone: "amber" },
      { key: "unsent", label: "미발송 문서", tone: "cyan" },
      { key: "confirm", label: "입금 확인 대기", tone: "slate" },
    ],
  },
  quickCreate: {
    title: "새 문서 만들기",
    subtitle: "템플릿에서 바로 시작할 수 있습니다",
    items: [
      {
        key: "estimates",
        label: "견적서",
        description: "건별 견적 발행",
        href: "/estimates/new",
      },
      {
        key: "delivery-notes",
        label: "납품서",
        description: "견적 데이터에서 변환",
        href: "/delivery-notes/new",
      },
      {
        key: "invoices",
        label: "청구서",
        description: "세율·기한 자동 정리",
        href: "/invoices/new",
        badge: "자주 사용",
      },
      {
        key: "receipts",
        label: "영수증",
        description: "입금 후 바로 발행",
        href: "/receipts/new",
      },
    ],
    shortcuts: [
      { label: "거래처 추가", href: "/clients" },
      { label: "품목 추가", href: "/items/new" },
      { label: "청구서 작성 가이드", href: "/support/invoice-guide" },
    ],
  },
  recent: {
    title: "최근 활동",
    seeAll: "이력 보기",
    empty: "아직 활동 이력이 없습니다",
  },
  docLabels: {
    estimate: "견적서",
    delivery_note: "납품서",
    invoice: "청구서",
    receipt: "영수증",
  },
  statusLabels: {
    draft: "초안",
    issued: "발행",
    sent: "발송 완료",
    confirmed: "입금 확인",
    overdue: "기한 초과",
    trashed: "휴지통",
  },
  relative: {
    today: "오늘",
    tomorrow: "내일",
    inDays: "{days}일 후",
    overdueDays: "기한 초과 {days}일",
    draftForDays: "초안 {days}일째",
    draftToday: "오늘 만든 초안",
    justNow: "방금",
    minutesAgo: "{minutes}분 전",
    hoursAgo: "{hours}시간 전",
    yesterday: "어제",
    daysAgo: "{days}일 전",
  },
  notices: {
    title: "공지사항",
    seeAll: "더 보기",
    items: [
      {
        id: "invoice-guide-added",
        title: "청구서 작성 가이드를 추가했습니다",
        date: "2026.05.25",
        category: "신기능",
      },
      {
        id: "invoice-email-ui-update",
        title: "청구서 메일 발송 화면 UI를 업데이트했습니다",
        date: "2026.05.20",
        category: "업데이트",
      },
      {
        id: "invoice-tax-display",
        title: "일본 인보이스 제도용 세율 표시를 개선했습니다",
        date: "2026.05.12",
        category: "법규 대응",
      },
    ],
  },
};

const en: HomeContent = {
  greeting: {
    morning: "Good morning",
    afternoon: "Hi",
    evening: "Good evening",
    suffix: "",
  },
  userName: "",
  todayLabel: "Today",
  newButton: "New",
  newMenuTitle: "Create document",
  newMenuItems: [
    { label: "Estimate", href: "/estimates/new" },
    { label: "Delivery note", href: "/delivery-notes/new" },
    { label: "Invoice", href: "/invoices/new" },
    { label: "Receipt", href: "/receipts/new" },
  ],
  searchPlaceholder: "Search by client, document number, or subject",
  kpiLabels: {
    billed: { label: "Billed this month", tone: "neutral", href: "/invoices" },
    unpaid: { label: "Awaiting payment", tone: "warn", href: "/invoices" },
    pending: { label: "Pending", tone: "info", href: "/invoices" },
    duesoon: { label: "Due within 7 days", tone: "warn", href: "/invoices" },
  },
  kpiSub: {
    deltaVsLastMonth: "{delta} vs last month",
    noBaseline: "No billing last month",
    count: "{count} invoices",
    draftAwaiting: "{draft} drafts / {awaiting} to confirm",
    overdueIncluded: "{overdue} overdue",
    noOverdue: "None overdue",
  },
  tasks: {
    title: "Today's tasks",
    subtitle: "Prioritized items that need your attention",
    seeAll: "View all",
    open: "Open",
    empty: "Nothing waiting for you",
    groupLabels: [
      { key: "duesoon", label: "Payment due soon", tone: "amber" },
      { key: "unsent", label: "Unsent documents", tone: "cyan" },
      { key: "confirm", label: "Awaiting payment confirmation", tone: "slate" },
    ],
  },
  quickCreate: {
    title: "Create a new document",
    subtitle: "Start from a template in seconds",
    items: [
      {
        key: "estimates",
        label: "Estimate",
        description: "Send a quote for new work",
        href: "/estimates/new",
      },
      {
        key: "delivery-notes",
        label: "Delivery note",
        description: "Convert from estimate data",
        href: "/delivery-notes/new",
      },
      {
        key: "invoices",
        label: "Invoice",
        description: "Auto-sort tax rates and due dates",
        href: "/invoices/new",
        badge: "Most used",
      },
      {
        key: "receipts",
        label: "Receipt",
        description: "Issue immediately after payment",
        href: "/receipts/new",
      },
    ],
    shortcuts: [
      { label: "Add client", href: "/clients" },
      { label: "Add item", href: "/items/new" },
      { label: "How to create an invoice", href: "/support/invoice-guide" },
    ],
  },
  recent: {
    title: "Recent activity",
    seeAll: "View history",
    empty: "No activity yet",
  },
  docLabels: {
    estimate: "Estimate",
    delivery_note: "Delivery note",
    invoice: "Invoice",
    receipt: "Receipt",
  },
  statusLabels: {
    draft: "Draft",
    issued: "Issued",
    sent: "Sent",
    confirmed: "Paid",
    overdue: "Overdue",
    trashed: "Trashed",
  },
  relative: {
    today: "today",
    tomorrow: "tomorrow",
    inDays: "in {days} days",
    overdueDays: "{days} days overdue",
    draftForDays: "draft for {days} days",
    draftToday: "drafted today",
    justNow: "just now",
    minutesAgo: "{minutes} min ago",
    hoursAgo: "{hours} hours ago",
    yesterday: "Yesterday",
    daysAgo: "{days} days ago",
  },
  notices: {
    title: "Announcements",
    seeAll: "See more",
    items: [
      {
        id: "invoice-guide-added",
        title: "Added the invoice creation guide",
        date: "2026.05.25",
        category: "New feature",
      },
      {
        id: "invoice-email-ui-update",
        title: "Updated the invoice email sending UI",
        date: "2026.05.20",
        category: "Update",
      },
      {
        id: "invoice-tax-display",
        title: "Improved tax display for Japan invoice compliance",
        date: "2026.05.12",
        category: "Compliance",
      },
    ],
  },
};

const labels: Record<AppLocale, HomeContent> = { ja, ko, en };

export function getHomeContent(lang: AppLocale): HomeContent {
  return labels[lang];
}

export function formatToday(lang: AppLocale, date: Date): string {
  try {
    return new Intl.DateTimeFormat(
      lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      },
    ).format(date);
  } catch {
    return date.toDateString();
  }
}

export function pickGreeting(content: HomeContent, hour: number): string {
  if (hour < 11) return content.greeting.morning;
  if (hour < 18) return content.greeting.afternoon;
  return content.greeting.evening;
}

/** "{days}日後" 같은 템플릿에 값을 채운다. */
export function fillTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}

/** 기한까지 남은 일수 → 배지 문구 */
export function formatDueLabel(relative: HomeRelativeLabels, dayDiff: number) {
  if (dayDiff < 0) return fillTemplate(relative.overdueDays, { days: Math.abs(dayDiff) });
  if (dayDiff === 0) return relative.today;
  if (dayDiff === 1) return relative.tomorrow;
  return fillTemplate(relative.inDays, { days: dayDiff });
}

/** 초안으로 머문 일수 → 배지 문구 */
export function formatDraftAgeLabel(relative: HomeRelativeLabels, days: number) {
  if (days <= 0) return relative.draftToday;
  return fillTemplate(relative.draftForDays, { days });
}

/** 경과 분 → "10分前" 같은 문구 */
export function formatMinutesAgo(relative: HomeRelativeLabels, minutesAgo: number) {
  if (minutesAgo < 1) return relative.justNow;
  if (minutesAgo < 60) return fillTemplate(relative.minutesAgo, { minutes: minutesAgo });
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return fillTemplate(relative.hoursAgo, { hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return relative.yesterday;
  return fillTemplate(relative.daysAgo, { days });
}
