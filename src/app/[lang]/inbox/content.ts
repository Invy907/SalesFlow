import type { AppLocale } from "@/contexts/language-context";

const labels = {
  ja: {
    title: "受信箱",
    helpLink: "受信箱機能について",
    emailAlert: {
      title: "受信箱機能を使うためにはメールアドレスの確認が必要です。",
      body: "下のボタンをクリックすると、ご登録のメールアドレスに確認メールを送信します。メール内のリンクをクリックして、メールアドレスの確認を完了してください。",
      button: "確認メールを送信",
    },
    empty: "受信した文書はありません",
    listHeaders: ["種別", "件名", "受信日時", "状態"],
    kindLabels: {
      received_document: "受信文書",
      system: "システム",
      announcement: "お知らせ",
    },
    unread: "未読",
    read: "既読",
    unreadOnly: "未読のみ",
    all: "すべて",
    noSubject: "（件名なし）",
  },
  ko: {
    title: "받은 문서함",
    helpLink: "받은 문서함 기능 안내",
    emailAlert: {
      title: "받은 문서함 기능을 사용하려면 이메일 주소 확인이 필요합니다.",
      body: "아래 버튼을 클릭하면 등록된 이메일 주소로 확인 메일을 보냅니다. 메일 내 링크를 클릭하여 이메일 확인을 완료해 주세요.",
      button: "확인 메일 보내기",
    },
    empty: "수신한 문서가 없습니다",
    listHeaders: ["종류", "제목", "수신 일시", "상태"],
    kindLabels: {
      received_document: "수신 문서",
      system: "시스템",
      announcement: "공지",
    },
    unread: "읽지 않음",
    read: "읽음",
    unreadOnly: "읽지 않은 것만",
    all: "전체",
    noSubject: "(제목 없음)",
  },
  en: {
    title: "Inbox",
    helpLink: "About the inbox feature",
    emailAlert: {
      title: "Email verification is required to use the inbox feature.",
      body: "Click the button below to send a verification email to your registered address. Click the link in the email to complete verification.",
      button: "Send verification email",
    },
    empty: "No received documents",
    listHeaders: ["Type", "Subject", "Received", "Status"],
    kindLabels: {
      received_document: "Received document",
      system: "System",
      announcement: "Announcement",
    },
    unread: "Unread",
    read: "Read",
    unreadOnly: "Unread only",
    all: "All",
    noSubject: "(No subject)",
  },
} as const;

export function getInboxContent(lang: AppLocale) {
  return labels[lang];
}
