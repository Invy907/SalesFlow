import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    title: "サポート",
    intro:
      "SalesFlowの使い方やお困りごとについて、よくある質問やお問い合わせ方法をご案内します。",
    guidesSection: "ガイド",
    guides: [
      {
        key: "invoice-guide",
        title: "請求書の作り方ガイド",
        description: "新規作成画面と同じタブ構成で、各項目の入力ポイントを解説します。",
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
          "「ご利用履歴」ページから現在の利用状況を確認できます。プラン変更や請求に関する詳細は、下記のお問い合わせフォームからご連絡ください。",
      },
    ],
    contactSection: "お問い合わせ",
    contactIntro:
      "上記で解決しない場合は、以下のフォームからお問い合わせください。通常2営業日以内にご返信いたします。",
    contactButton: "お問い合わせフォームを開く",
    helpCenterLink: "ヘルプセンターを見る",
  },
  ko: {
    title: "지원",
    intro:
      "SalesFlow 사용 방법이나 문의 사항에 대해 자주 묻는 질문과 문의 방법을 안내합니다.",
    guidesSection: "가이드",
    guides: [
      {
        key: "invoice-guide",
        title: "청구서 작성 가이드",
        description: "신규 작성 화면과 같은 탭 구성으로 각 항목 입력 포인트를 안내합니다.",
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
          "「이용 내역」 페이지에서 현재 이용 현황을 확인할 수 있습니다. 플랜 변경이나 청구 관련 문의는 아래 문의 양식을 이용해 주세요.",
      },
    ],
    contactSection: "문의",
    contactIntro:
      "위 내용으로 해결되지 않는 경우 아래 양식을 통해 문의해 주세요. 보통 2영업일 이내에 답변드립니다.",
    contactButton: "문의 양식 열기",
    helpCenterLink: "헬프 센터 보기",
  },
  en: {
    title: "Support",
    intro:
      "Find answers to common questions and learn how to contact us about SalesFlow.",
    guidesSection: "Guides",
    guides: [
      {
        key: "invoice-guide",
        title: "How to Create an Invoice",
        description: "Follow the same tabs as the new invoice form with tips for each field.",
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
          'Check your current usage on the "Usage History" page. For plan changes or billing questions, please use the contact form below.',
      },
    ],
    contactSection: "Contact Us",
    contactIntro:
      "If your question is not answered above, please reach out via the form below. We typically respond within two business days.",
    contactButton: "Open contact form",
    helpCenterLink: "Visit help center",
  },
} as const;

export function getSupportContent(lang: AppLocale) {
  return labels[lang];
}

export function getSupportHref(
  _lang: AppLocale,
  page: "top" | "invoice-guide" = "top",
) {
  if (page === "invoice-guide") return "/support/invoice-guide";
  return "/support";
}
