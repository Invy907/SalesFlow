import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    title: "サポート",
    intro:
      "SalesFlowの使い方について、ガイドとよくある質問をご案内します。",
    announcementsSection: "お知らせ",
    announcementsDescription: "新機能・改善・メンテナンス情報を確認できます。",
    announcementsLink: "お知らせ一覧を見る",
    guidesSection: "ガイド",
    guides: [
      {
        key: "invoice-guide",
        title: "請求書の作り方ガイド",
        description: "新規作成画面と同じタブ構成で、各項目の入力ポイントを解説します。",
      },
      {
        key: "order-form-guide",
        title: "受注フォームの使い方ガイド",
        description: "オンライン受注フォームでできることや使い方をご紹介します。",
      },
    ],
    faqSection: "よくある質問",
    faqItems: [
      {
        question: "見積書・請求書はどのように作成しますか？",
        answer:
          "サイドバーの「見積書」「請求書」から新規作成できます。取引先・品目を登録しておくと、よりスムーズに作成できます。",
      },
      {
        question: "請求書の一括作成はできますか？",
        answer:
          "「請求書」メニューから「CSVアップロード」を選択すると、CSVファイルから一括で請求書を作成できます。",
      },
      {
        question: "プランや料金について知りたいです。",
        answer:
          "「ご利用履歴」で当月に作成した請求書の件数を確認できます。契約プラン、無料枠、請求金額はまだ連携されておらず、画面からのプラン変更はできません。",
      },
    ],
    contactSection: "お問い合わせ",
    contactIntro:
      "お問い合わせ窓口はまだ設定されていません。この画面から問い合わせを送信することはできません。ご利用中の組織の管理者に、連絡先をご確認ください。",
    helpCenterLink: "ヘルプセンターを見る",
  },
  ko: {
    title: "지원",
    intro:
      "SalesFlow 사용 방법을 가이드와 자주 묻는 질문으로 안내합니다.",
    announcementsSection: "공지사항",
    announcementsDescription: "신기능, 개선, 점검 안내를 확인할 수 있습니다.",
    announcementsLink: "공지사항 전체 보기",
    guidesSection: "가이드",
    guides: [
      {
        key: "invoice-guide",
        title: "청구서 작성 가이드",
        description: "신규 작성 화면과 같은 탭 구성으로 각 항목 입력 포인트를 안내합니다.",
      },
      {
        key: "order-form-guide",
        title: "수주 폼 이용 가이드",
        description: "온라인 수주 폼으로 할 수 있는 것과 사용법을 소개합니다.",
      },
    ],
    faqSection: "자주 묻는 질문",
    faqItems: [
      {
        question: "견적서·청구서는 어떻게 작성하나요?",
        answer:
          "사이드바의 「견적서」「청구서」에서 신규 작성할 수 있습니다. 거래처·품목을 미리 등록해 두면 더 빠르게 작성할 수 있습니다.",
      },
      {
        question: "청구서 일괄 작성이 가능한가요?",
        answer:
          "「청구서」 메뉴에서 「CSV 업로드」를 선택하면 CSV 파일로 청구서를 일괄 생성할 수 있습니다.",
      },
      {
        question: "플랜과 요금에 대해 알고 싶습니다.",
        answer:
          "「이용 내역」에서 이번 달에 작성한 청구서 건수를 확인할 수 있습니다. 계약 플랜, 무료 한도, 청구 금액은 아직 연동되지 않았으며 화면에서 플랜을 변경할 수 없습니다.",
      },
    ],
    contactSection: "문의",
    contactIntro:
      "문의 채널이 아직 설정되지 않았습니다. 이 화면에서는 문의를 전송할 수 없습니다. 이용 중인 조직의 관리자에게 연락처를 확인해 주세요.",
    helpCenterLink: "헬프 센터 보기",
  },
  en: {
    title: "Support",
    intro:
      "Find guides and answers to common questions about using SalesFlow.",
    announcementsSection: "Announcements",
    announcementsDescription: "Read about new features, improvements, and maintenance.",
    announcementsLink: "View all announcements",
    guidesSection: "Guides",
    guides: [
      {
        key: "invoice-guide",
        title: "How to Create an Invoice",
        description: "Follow the same tabs as the new invoice form with tips for each field.",
      },
      {
        key: "order-form-guide",
        title: "How to Use Order Forms",
        description: "See what the online order form can do and how to use it.",
      },
    ],
    faqSection: "Frequently Asked Questions",
    faqItems: [
      {
        question: "How do I create estimates and invoices?",
        answer:
          'Use "Estimates" or "Invoices" in the sidebar to create new documents. Registering clients and items in advance makes the process faster.',
      },
      {
        question: "Can I create invoices in bulk?",
        answer:
          'Select "CSV Upload" under "Invoices" to generate multiple invoices from a CSV file.',
      },
      {
        question: "Where can I learn about plans and pricing?",
        answer:
          'See the number of invoices created this month on the "Usage History" page. Plan details, free allowances, and billing amounts are not connected yet, and plan changes are not available in the app.',
      },
    ],
    contactSection: "Contact Us",
    contactIntro:
      "A support contact channel has not been configured yet. You cannot send an inquiry from this page. Ask your organization’s administrator for contact details.",
    helpCenterLink: "Visit help center",
  },
} as const;

export function getSupportContent(lang: AppLocale) {
  return labels[lang];
}

export function getSupportHref(
  _lang: AppLocale,
  page: "top" | "invoice-guide" | "order-form-guide" | "announcements" = "top",
) {
  if (page === "invoice-guide") return "/support/invoice-guide";
  if (page === "order-form-guide") return "/support/order-form-guide";
  if (page === "announcements") return "/support/announcements";
  return "/support";
}
