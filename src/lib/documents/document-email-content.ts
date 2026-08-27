/**
 * 견적서·청구서 메일의 제목·본문(평문/HTML).
 *
 * 링크 한 줄만 있는 메일은 스팸으로 분류되기 쉬워, 회사명·문서 번호·금액·날짜를
 * 본문에 담아 일반적인 거래 메일과 같은 형태로 만든다.
 */

export type DocumentEmailKind = "estimate" | "invoice";

export type DocumentEmailCompany = {
  name: string;
  tel?: string | null;
  email?: string | null;
};

export type DocumentEmailInput = {
  kind: DocumentEmailKind;
  locale: string;
  clientName: string;
  documentNumber: string;
  documentSubject?: string | null;
  issueDate?: string | null;
  /** 견적서는 유효기한, 청구서는 지급기한. */
  secondaryDate?: string | null;
  total?: number | null;
  shareUrl: string;
  company: DocumentEmailCompany;
};

type Labels = {
  subject: (v: { documentNumber: string; companyName: string }) => string;
  greeting: (v: { clientName: string; companyName: string }) => string;
  lead: string;
  documentNumber: string;
  documentSubject: string;
  issueDate: string;
  secondaryDate: string;
  total: string;
  linkLead: string;
  linkButton: string;
  closing: string;
  noValue: string;
};

const LABELS: Record<string, Record<DocumentEmailKind, Labels>> = {
  ja: {
    estimate: {
      subject: (v) => `お見積書のご送付（${v.documentNumber}）｜${v.companyName}`,
      greeting: (v) =>
        `${v.clientName} ご担当者様\n\nいつもお世話になっております。\n${v.companyName}です。`,
      lead: "お見積書をお送りいたします。下記の内容をご確認くださいますようお願いいたします。",
      documentNumber: "見積書番号",
      documentSubject: "件名",
      issueDate: "発行日",
      secondaryDate: "有効期限",
      total: "お見積金額",
      linkLead: "内容は下記のリンクよりご確認いただけます。",
      linkButton: "見積書を確認する",
      closing:
        "ご不明な点がございましたら、本メールにご返信ください。\nどうぞよろしくお願いいたします。",
      noValue: "指定なし",
    },
    invoice: {
      subject: (v) => `ご請求書のご送付（${v.documentNumber}）｜${v.companyName}`,
      greeting: (v) =>
        `${v.clientName} ご担当者様\n\nいつもお世話になっております。\n${v.companyName}です。`,
      lead: "ご請求書をお送りいたします。下記の内容をご確認くださいますようお願いいたします。",
      documentNumber: "請求書番号",
      documentSubject: "件名",
      issueDate: "請求日",
      secondaryDate: "お支払い期限",
      total: "ご請求金額",
      linkLead: "内容は下記のリンクよりご確認いただけます。",
      linkButton: "請求書を確認する",
      closing:
        "ご不明な点がございましたら、本メールにご返信ください。\nどうぞよろしくお願いいたします。",
      noValue: "指定なし",
    },
  },
  ko: {
    estimate: {
      subject: (v) => `견적서 송부 안내 (${v.documentNumber}) | ${v.companyName}`,
      greeting: (v) => `${v.clientName} 담당자님\n\n안녕하세요.\n${v.companyName}입니다.`,
      lead: "견적서를 보내드립니다. 아래 내용을 확인해 주시기 바랍니다.",
      documentNumber: "견적서 번호",
      documentSubject: "제목",
      issueDate: "발행일",
      secondaryDate: "유효기한",
      total: "견적 금액",
      linkLead: "상세 내용은 아래 링크에서 확인하실 수 있습니다.",
      linkButton: "견적서 확인하기",
      closing: "문의 사항이 있으시면 본 메일로 회신해 주세요.\n감사합니다.",
      noValue: "지정 없음",
    },
    invoice: {
      subject: (v) => `청구서 송부 안내 (${v.documentNumber}) | ${v.companyName}`,
      greeting: (v) => `${v.clientName} 담당자님\n\n안녕하세요.\n${v.companyName}입니다.`,
      lead: "청구서를 보내드립니다. 아래 내용을 확인해 주시기 바랍니다.",
      documentNumber: "청구서 번호",
      documentSubject: "제목",
      issueDate: "청구일",
      secondaryDate: "지급 기한",
      total: "청구 금액",
      linkLead: "상세 내용은 아래 링크에서 확인하실 수 있습니다.",
      linkButton: "청구서 확인하기",
      closing: "문의 사항이 있으시면 본 메일로 회신해 주세요.\n감사합니다.",
      noValue: "지정 없음",
    },
  },
  en: {
    estimate: {
      subject: (v) => `Estimate ${v.documentNumber} from ${v.companyName}`,
      greeting: (v) => `Dear ${v.clientName},\n\nThank you for your continued business.\nThis is ${v.companyName}.`,
      lead: "Please find the details of your estimate below.",
      documentNumber: "Estimate no.",
      documentSubject: "Subject",
      issueDate: "Issue date",
      secondaryDate: "Valid until",
      total: "Estimate amount",
      linkLead: "You can review the full document at the link below.",
      linkButton: "View estimate",
      closing: "If you have any questions, simply reply to this email.\nBest regards,",
      noValue: "Not specified",
    },
    invoice: {
      subject: (v) => `Invoice ${v.documentNumber} from ${v.companyName}`,
      greeting: (v) => `Dear ${v.clientName},\n\nThank you for your continued business.\nThis is ${v.companyName}.`,
      lead: "Please find the details of your invoice below.",
      documentNumber: "Invoice no.",
      documentSubject: "Subject",
      issueDate: "Invoice date",
      secondaryDate: "Payment due",
      total: "Amount due",
      linkLead: "You can review the full document at the link below.",
      linkButton: "View invoice",
      closing: "If you have any questions, simply reply to this email.\nBest regards,",
      noValue: "Not specified",
    },
  },
};

function labelsFor(locale: string, kind: DocumentEmailKind) {
  return (LABELS[locale] ?? LABELS.ja)[kind];
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 사용자가 직접 쓴 평문 템플릿을 HTML 파트로 변환한다(정기 청구 메일용). */
export function renderPlainTextAsHtml(text: string) {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1096a8">$1</a>')
    .replace(/\n/g, "<br />");

  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;',
    'font-size:14px;line-height:1.8;color:#1e293b">',
    body,
    "</div>",
  ].join("");
}

function formatAmount(total: number) {
  return `¥ ${total.toLocaleString("ja-JP")}`;
}

export function buildDocumentEmail(input: DocumentEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const ui = labelsFor(input.locale, input.kind);
  const companyName = input.company.name.trim() || input.company.email?.trim() || "";

  const rows: Array<[string, string]> = [[ui.documentNumber, input.documentNumber]];
  if (input.documentSubject?.trim()) rows.push([ui.documentSubject, input.documentSubject.trim()]);
  if (input.issueDate) rows.push([ui.issueDate, input.issueDate]);
  rows.push([ui.secondaryDate, input.secondaryDate || ui.noValue]);
  if (typeof input.total === "number") rows.push([ui.total, formatAmount(input.total)]);

  const signature = [companyName, input.company.tel ? `TEL: ${input.company.tel}` : null, input.company.email]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join("\n");

  const text = [
    ui.greeting({ clientName: input.clientName || "-", companyName }),
    "",
    ui.lead,
    "",
    ...rows.map(([label, value]) => `  ${label}: ${value}`),
    "",
    ui.linkLead,
    input.shareUrl,
    "",
    ui.closing,
    "",
    "--",
    signature,
    "",
  ].join("\n");

  const html = [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:14px;line-height:1.8;color:#1e293b;max-width:600px">',
    `<p style="margin:0 0 16px">${escapeHtml(ui.greeting({ clientName: input.clientName || "-", companyName })).replace(/\n/g, "<br />")}</p>`,
    `<p style="margin:0 0 20px">${escapeHtml(ui.lead)}</p>`,
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;width:100%">',
    ...rows.map(
      ([label, value]) =>
        '<tr>' +
        `<td style="padding:8px 16px 8px 0;color:#64748b;white-space:nowrap;border-bottom:1px solid #e2e8f0">${escapeHtml(label)}</td>` +
        `<td style="padding:8px 0;font-weight:600;border-bottom:1px solid #e2e8f0">${escapeHtml(value)}</td>` +
        "</tr>",
    ),
    "</table>",
    `<p style="margin:0 0 12px">${escapeHtml(ui.linkLead)}</p>`,
    `<p style="margin:0 0 24px"><a href="${escapeHtml(input.shareUrl)}" style="display:inline-block;background:#14a7bb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">${escapeHtml(ui.linkButton)}</a></p>`,
    `<p style="margin:0 0 24px;color:#64748b;font-size:13px;word-break:break-all">${escapeHtml(input.shareUrl)}</p>`,
    `<p style="margin:0 0 24px">${escapeHtml(ui.closing).replace(/\n/g, "<br />")}</p>`,
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 12px" />',
    `<p style="margin:0;color:#64748b;font-size:13px">${escapeHtml(signature).replace(/\n/g, "<br />")}</p>`,
    "</div>",
  ].join("");

  return {
    subject: ui.subject({ documentNumber: input.documentNumber, companyName }),
    text,
    html,
  };
}
