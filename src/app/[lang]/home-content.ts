import type { AppLocale } from "@/contexts/language-context";
import type { AnnouncementId } from "./support/announcements/content";

export type TaskTone = "amber" | "cyan" | "slate";

export type HomeTask = {
  client: string;
  doc: string;
  amount: string;
  due: string;
  href: string;
};

export type HomeTaskGroup = {
  key: string;
  label: string;
  tone: TaskTone;
  items: HomeTask[];
};

export type KpiTone = "neutral" | "warn" | "info";

export type HomeKpi = {
  key: "billed" | "unpaid" | "pending" | "duesoon";
  label: string;
  value: string;
  sub: string;
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

export type HomeRecentItem = {
  doc: string;
  client: string;
  amount: string;
  status: string;
  time: string;
};

export type HomeNotice = {
  id: AnnouncementId;
  title: string;
  date: string;
  category: string;
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
  kpis: HomeKpi[];
  tasks: {
    title: string;
    subtitle: string;
    seeAll: string;
    open: string;
    empty: string;
    groups: HomeTaskGroup[];
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
    items: HomeRecentItem[];
  };
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
  userName: "Inhyuk Lee",
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
  kpis: [
    {
      key: "billed",
      label: "今月の請求額",
      value: "¥1,280,000",
      sub: "先月比 +12%",
      tone: "neutral",
      href: "/invoices",
    },
    {
      key: "unpaid",
      label: "未入金",
      value: "¥824,000",
      sub: "6件",
      tone: "warn",
      href: "/invoices",
    },
    {
      key: "pending",
      label: "未処理",
      value: "9件",
      sub: "下書き 3 / 確認待ち 6",
      tone: "info",
      href: "/invoices",
    },
    {
      key: "duesoon",
      label: "期限7日以内",
      value: "4件",
      sub: "うち期限超過 1件",
      tone: "warn",
      href: "/invoices",
    },
  ],
  tasks: {
    title: "今日のタスク",
    subtitle: "優先度の高い案件をまとめました",
    seeAll: "すべて見る",
    open: "開く",
    empty: "対応が必要なタスクはありません",
    groups: [
      {
        key: "duesoon",
        label: "支払い期限が近い",
        tone: "amber",
        items: [
          {
            client: "Northwind合同会社",
            doc: "請求書 #20260512-003",
            amount: "¥456,000",
            due: "2日後",
            href: "/invoices",
          },
          {
            client: "Aster Studio",
            doc: "請求書 #20260508-001",
            amount: "¥148,000",
            due: "明日",
            href: "/invoices",
          },
        ],
      },
      {
        key: "unsent",
        label: "未送付の書類",
        tone: "cyan",
        items: [
          {
            client: "Kumo Design 株式会社",
            doc: "納品書",
            amount: "¥220,000",
            due: "下書きのまま 3日",
            href: "/delivery-notes",
          },
          {
            client: "Bluebourne Inc.",
            doc: "見積書",
            amount: "¥98,000",
            due: "下書きのまま 1日",
            href: "/estimates",
          },
        ],
      },
      {
        key: "confirm",
        label: "入金確認待ち",
        tone: "slate",
        items: [
          {
            client: "Maple Works",
            doc: "請求書 #20260420-002",
            amount: "¥312,000",
            due: "期限超過 2日",
            href: "/invoices",
          },
        ],
      },
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
    items: [
      {
        doc: "請求書 #20260522-002",
        client: "Raon 株式会社",
        amount: "¥220,000",
        status: "送付済み",
        time: "10分前",
      },
      {
        doc: "見積書 #20260521-001",
        client: "Aster Studio",
        amount: "¥148,000",
        status: "下書き保存",
        time: "1時間前",
      },
      {
        doc: "領収書 #20260520-004",
        client: "Maple Works",
        amount: "¥312,000",
        status: "発行",
        time: "昨日",
      },
    ],
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
  userName: "Inhyuk Lee",
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
  kpis: [
    {
      key: "billed",
      label: "이번 달 청구액",
      value: "¥1,280,000",
      sub: "전월 대비 +12%",
      tone: "neutral",
      href: "/invoices",
    },
    {
      key: "unpaid",
      label: "미입금",
      value: "¥824,000",
      sub: "6건",
      tone: "warn",
      href: "/invoices",
    },
    {
      key: "pending",
      label: "미처리",
      value: "9건",
      sub: "초안 3 / 확인 대기 6",
      tone: "info",
      href: "/invoices",
    },
    {
      key: "duesoon",
      label: "기한 7일 이내",
      value: "4건",
      sub: "기한 초과 1건 포함",
      tone: "warn",
      href: "/invoices",
    },
  ],
  tasks: {
    title: "오늘의 작업",
    subtitle: "우선순위 높은 건을 모았어요",
    seeAll: "전체 보기",
    open: "열기",
    empty: "처리할 작업이 없습니다",
    groups: [
      {
        key: "duesoon",
        label: "결제 기한 임박",
        tone: "amber",
        items: [
          {
            client: "Northwind",
            doc: "청구서 #20260512-003",
            amount: "¥456,000",
            due: "2일 후",
            href: "/invoices",
          },
          {
            client: "Aster Studio",
            doc: "청구서 #20260508-001",
            amount: "¥148,000",
            due: "내일",
            href: "/invoices",
          },
        ],
      },
      {
        key: "unsent",
        label: "미발송 문서",
        tone: "cyan",
        items: [
          {
            client: "Kumo Design",
            doc: "납품서",
            amount: "¥220,000",
            due: "초안 3일째",
            href: "/delivery-notes",
          },
          {
            client: "Bluebourne Inc.",
            doc: "견적서",
            amount: "¥98,000",
            due: "초안 1일째",
            href: "/estimates",
          },
        ],
      },
      {
        key: "confirm",
        label: "입금 확인 대기",
        tone: "slate",
        items: [
          {
            client: "Maple Works",
            doc: "청구서 #20260420-002",
            amount: "¥312,000",
            due: "기한 초과 2일",
            href: "/invoices",
          },
        ],
      },
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
    items: [
      {
        doc: "청구서 #20260522-002",
        client: "Raon 주식회사",
        amount: "¥220,000",
        status: "발송 완료",
        time: "10분 전",
      },
      {
        doc: "견적서 #20260521-001",
        client: "Aster Studio",
        amount: "¥148,000",
        status: "초안 저장",
        time: "1시간 전",
      },
      {
        doc: "영수증 #20260520-004",
        client: "Maple Works",
        amount: "¥312,000",
        status: "발행",
        time: "어제",
      },
    ],
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
  userName: "Inhyuk Lee",
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
  kpis: [
    {
      key: "billed",
      label: "Billed this month",
      value: "¥1,280,000",
      sub: "+12% vs last month",
      tone: "neutral",
      href: "/invoices",
    },
    {
      key: "unpaid",
      label: "Awaiting payment",
      value: "¥824,000",
      sub: "6 invoices",
      tone: "warn",
      href: "/invoices",
    },
    {
      key: "pending",
      label: "Pending",
      value: "9",
      sub: "3 drafts / 6 to confirm",
      tone: "info",
      href: "/invoices",
    },
    {
      key: "duesoon",
      label: "Due within 7 days",
      value: "4",
      sub: "1 overdue",
      tone: "warn",
      href: "/invoices",
    },
  ],
  tasks: {
    title: "Today's tasks",
    subtitle: "Prioritized items that need your attention",
    seeAll: "View all",
    open: "Open",
    empty: "Nothing waiting for you",
    groups: [
      {
        key: "duesoon",
        label: "Payment due soon",
        tone: "amber",
        items: [
          {
            client: "Northwind LLC",
            doc: "Invoice #20260512-003",
            amount: "¥456,000",
            due: "in 2 days",
            href: "/invoices",
          },
          {
            client: "Aster Studio",
            doc: "Invoice #20260508-001",
            amount: "¥148,000",
            due: "tomorrow",
            href: "/invoices",
          },
        ],
      },
      {
        key: "unsent",
        label: "Unsent documents",
        tone: "cyan",
        items: [
          {
            client: "Kumo Design",
            doc: "Delivery note",
            amount: "¥220,000",
            due: "draft for 3 days",
            href: "/delivery-notes",
          },
          {
            client: "Bluebourne Inc.",
            doc: "Estimate",
            amount: "¥98,000",
            due: "draft for 1 day",
            href: "/estimates",
          },
        ],
      },
      {
        key: "confirm",
        label: "Awaiting payment confirmation",
        tone: "slate",
        items: [
          {
            client: "Maple Works",
            doc: "Invoice #20260420-002",
            amount: "¥312,000",
            due: "2 days overdue",
            href: "/invoices",
          },
        ],
      },
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
    items: [
      {
        doc: "Invoice #20260522-002",
        client: "Raon Co., Ltd.",
        amount: "¥220,000",
        status: "Sent",
        time: "10 min ago",
      },
      {
        doc: "Estimate #20260521-001",
        client: "Aster Studio",
        amount: "¥148,000",
        status: "Draft saved",
        time: "1 hour ago",
      },
      {
        doc: "Receipt #20260520-004",
        client: "Maple Works",
        amount: "¥312,000",
        status: "Issued",
        time: "Yesterday",
      },
    ],
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
