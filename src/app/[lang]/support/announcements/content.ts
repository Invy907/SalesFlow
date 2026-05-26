import type { AppLocale } from "@/contexts/language-context";

export type AnnouncementId =
  | "invoice-guide-added"
  | "invoice-email-ui-update"
  | "invoice-tax-display";

export type Announcement = {
  id: AnnouncementId;
  title: string;
  date: string;
  category: string;
  summary: string;
  body: string[];
  relatedHref?: string;
  relatedLabel?: string;
};

export type AnnouncementsContent = {
  title: string;
  intro: string;
  backToSupport: string;
  backToList: string;
  notFoundTitle: string;
  notFoundBody: string;
  items: Announcement[];
};

const labels: Record<AppLocale, AnnouncementsContent> = {
  ja: {
    title: "お知らせ",
    intro: "SalesFlowの新機能、改善、メンテナンス情報を掲載しています。",
    backToSupport: "サポートに戻る",
    backToList: "お知らせ一覧",
    notFoundTitle: "お知らせが見つかりません",
    notFoundBody: "指定されたお知らせは存在しないか、削除された可能性があります。",
    items: [
      {
        id: "invoice-guide-added",
        title: "請求書の作り方ガイドを追加しました",
        date: "2026.05.25",
        category: "新機能",
        summary:
          "新規請求書作成画面と同じタブ構成で、入力のポイントを順番に解説するガイドを公開しました。",
        body: [
          "請求書作成の流れが分かりにくいというお声を受け、サポート内に「請求書の作り方ガイド」を追加しました。",
          "基本情報・品目・送付設定・決済・その他の各タブごとに、入力すべき項目とよくある注意点をまとめています。",
          "初めて請求書を作成する方や、社内で手順を共有したいチームの方にご活用ください。",
        ],
        relatedHref: "/support/invoice-guide",
        relatedLabel: "請求書の作り方ガイドを見る",
      },
      {
        id: "invoice-email-ui-update",
        title: "請求書メール送付画面のUIを更新しました",
        date: "2026.05.20",
        category: "アップデート",
        summary:
          "送付先の確認、件名・本文の編集、添付ファイルの確認がしやすいレイアウトに改善しました。",
        body: [
          "請求書メール送付画面のUIを更新し、送付前の最終確認がしやすくなりました。",
          "送付先メールアドレスとCCの表示を整理し、件名・本文の編集エリアを広げています。",
          "添付されるPDFのプレビューリンクも目立つ位置に配置し、誤送信の防止に役立ちます。",
        ],
      },
      {
        id: "invoice-tax-display",
        title: "インボイス制度向けの税率表示を改善",
        date: "2026.05.12",
        category: "法対応",
        summary:
          "適格請求書に必要な税率区分の表示と、品目行ごとの税額計算の見やすさを改善しました。",
        body: [
          "日本のインボイス制度に対応した書類で、税率区分と税額がより分かりやすく表示されるよう改善しました。",
          "品目行ごとの税額、小計、合計の関係が一覧しやすいレイアウトに調整しています。",
          "既存の請求書テンプレートをご利用の場合も、次回プレビュー・PDF出力時から新しい表示が反映されます。",
        ],
      },
    ],
  },
  ko: {
    title: "공지사항",
    intro: "SalesFlow의 신기능, 개선 사항, 점검 안내를 확인할 수 있습니다.",
    backToSupport: "지원으로 돌아가기",
    backToList: "공지사항 목록",
    notFoundTitle: "공지사항을 찾을 수 없습니다",
    notFoundBody: "요청하신 공지사항이 없거나 삭제되었을 수 있습니다.",
    items: [
      {
        id: "invoice-guide-added",
        title: "청구서 작성 가이드를 추가했습니다",
        date: "2026.05.25",
        category: "신기능",
        summary:
          "신규 청구서 작성 화면과 같은 탭 구성으로 입력 포인트를 순서대로 안내하는 가이드를 공개했습니다.",
        body: [
          "청구서 작성 절차가 어렵다는 의견을 반영해 지원 메뉴에 「청구서 작성 가이드」를 추가했습니다.",
          "기본 정보·품목·발송 설정·결제·기타 탭별로 입력 항목과 자주 하는 실수를 정리했습니다.",
          "처음 청구서를 작성하는 분이나 팀 내 절차 공유에 활용해 보세요.",
        ],
        relatedHref: "/support/invoice-guide",
        relatedLabel: "청구서 작성 가이드 보기",
      },
      {
        id: "invoice-email-ui-update",
        title: "청구서 메일 발송 화면 UI를 업데이트했습니다",
        date: "2026.05.20",
        category: "업데이트",
        summary:
          "수신자 확인, 제목·본문 편집, 첨부 파일 확인이 더 쉬운 레이아웃으로 개선했습니다.",
        body: [
          "청구서 메일 발송 화면 UI를 개선해 발송 전 최종 확인이 수월해졌습니다.",
          "수신·참조 메일 주소 표시를 정리하고, 제목·본문 편집 영역을 넓혔습니다.",
          "첨부 PDF 미리보기 링크도 눈에 잘 띄는 위치로 옮겨 오발송 방지에 도움이 됩니다.",
        ],
      },
      {
        id: "invoice-tax-display",
        title: "일본 인보이스 제도용 세율 표시를 개선했습니다",
        date: "2026.05.12",
        category: "법규 대응",
        summary:
          "적격 청구서에 필요한 세율 구분 표시와 품목별 세액 계산 가독성을 높였습니다.",
        body: [
          "일본 인보이스 제도에 맞는 문서에서 세율 구분과 세액이 더 명확하게 보이도록 개선했습니다.",
          "품목별 세액, 소계, 합계 관계를 한눈에 파악하기 쉬운 레이아웃으로 조정했습니다.",
          "기존 청구서 템플릿을 사용 중이어도 다음 미리보기·PDF 출력부터 새 표시가 적용됩니다.",
        ],
      },
    ],
  },
  en: {
    title: "Announcements",
    intro: "Product updates, improvements, and maintenance notices for SalesFlow.",
    backToSupport: "Back to support",
    backToList: "All announcements",
    notFoundTitle: "Announcement not found",
    notFoundBody: "The announcement you requested does not exist or may have been removed.",
    items: [
      {
        id: "invoice-guide-added",
        title: "Added the invoice creation guide",
        date: "2026.05.25",
        category: "New feature",
        summary:
          "A step-by-step guide that mirrors the new invoice form tabs is now available in Support.",
        body: [
          "Based on feedback that invoice creation can be hard to follow, we added an invoice creation guide under Support.",
          "Each tab—basic info, line items, delivery settings, payment, and other options—includes field tips and common pitfalls.",
          "Use it when onboarding new team members or sharing your billing workflow internally.",
        ],
        relatedHref: "/support/invoice-guide",
        relatedLabel: "Open the invoice guide",
      },
      {
        id: "invoice-email-ui-update",
        title: "Updated the invoice email sending UI",
        date: "2026.05.20",
        category: "Update",
        summary:
          "Recipient review, subject/body editing, and attachment checks are easier with the refreshed layout.",
        body: [
          "We refreshed the invoice email sending screen to make final checks before delivery clearer.",
          "To/CC fields are easier to scan, and the subject and body editors have more room to work.",
          "The attached PDF preview link is also more visible to help prevent mis-sent invoices.",
        ],
      },
      {
        id: "invoice-tax-display",
        title: "Improved tax display for Japan invoice compliance",
        date: "2026.05.12",
        category: "Compliance",
        summary:
          "Tax rate categories and per-line tax amounts are clearer on qualified invoice documents.",
        body: [
          "Documents aligned with Japan's invoice system now show tax categories and amounts more clearly.",
          "Line tax, subtotals, and totals are laid out so the relationship between them is easier to review.",
          "Existing invoice templates pick up the new display on the next preview or PDF export.",
        ],
      },
    ],
  },
};

export function getAnnouncementsContent(lang: AppLocale): AnnouncementsContent {
  return labels[lang];
}

export function getAnnouncementById(
  lang: AppLocale,
  id: string,
): Announcement | undefined {
  return labels[lang].items.find((item) => item.id === id);
}

export function isAnnouncementId(id: string): id is AnnouncementId {
  return (
    id === "invoice-guide-added" ||
    id === "invoice-email-ui-update" ||
    id === "invoice-tax-display"
  );
}

export function getAnnouncementsHref(_lang: AppLocale, id?: AnnouncementId) {
  if (id) return `/support/announcements/${id}`;
  return "/support/announcements";
}
