import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { newShareToken, shareExpiryFromNow } from "@/lib/share-tokens";
import { hasGmailSendScope } from "@/lib/gmail/oauth";
import { GmailSendScopeError, sendGmailMessage } from "@/lib/gmail/send";
import type { GmailConnectionRow } from "@/lib/gmail/client";
import { normalizeDocumentOutputLocale } from "./output-locale";
import { buildDocumentEmail } from "./document-email-content";

export type SalesDocumentKind = "estimate" | "invoice";

export type DocumentEmailComposeInput = {
  recipientEmail: string;
  cc?: string[];
  senderName?: string;
  replyTo?: string;
  subject?: string;
  body?: string;
  attachment?: { filename: string; mimeType: string; base64: string } | null;
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const TABLE: Record<SalesDocumentKind, string> = {
  estimate: "estimates",
  invoice: "invoices",
};

const SHARE_SEGMENT: Record<SalesDocumentKind, string> = {
  estimate: "estimates",
  invoice: "invoices",
};

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

function done<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildDocumentShareUrl(
  origin: string,
  outputLocale: string,
  kind: SalesDocumentKind,
  token: string,
) {
  return `${origin.replace(/\/$/, "")}/${outputLocale}/${SHARE_SEGMENT[kind]}/shared/${token}`;
}

async function issueShareToken(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    userId: string;
    kind: SalesDocumentKind;
    documentId: string;
    existingToken: string | null;
  },
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  if (params.existingToken) {
    await supabase
      .from("share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", params.existingToken);
  }

  const token = newShareToken();
  const expiresAt = shareExpiryFromNow();
  const { error: shareError } = await supabase.from("share_tokens").insert({
    token,
    organization_id: params.organizationId,
    target_table: TABLE[params.kind],
    target_id: params.documentId,
    created_by: params.userId,
    expires_at: expiresAt,
    revoked_at: null,
  });

  if (shareError) return fail(shareError.message);

  const { error: updateError } = await supabase
    .from(TABLE[params.kind])
    .update({ share_token: token })
    .eq("id", params.documentId);

  if (updateError) return fail(updateError.message);

  return done({ token, expiresAt });
}

export async function sendSalesDocumentEmail(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    userId: string;
    origin: string;
    kind: SalesDocumentKind;
    documentId: string;
    recipientEmail: string;
    compose?: Omit<DocumentEmailComposeInput, "recipientEmail">;
  },
): Promise<
  ActionResult<{
    messageId: string;
    shareToken: string;
    shareExpiresAt: string;
    shareUrl: string;
  }>
> {
  const recipientEmail = params.recipientEmail.trim();
  if (!recipientEmail) {
    return fail("メールアドレスを入力してください", { email: "必須です" });
  }
  if (!isValidEmail(recipientEmail)) {
    return fail("メールアドレスを確認してください", { email: "形式が正しくありません" });
  }

  const table = TABLE[params.kind];
  const notFoundMessage =
    params.kind === "estimate"
      ? "見積書が見つからないか、権限がありません"
      : "請求書が見つからないか、権限がありません";

  const { data: row, error: fetchErr } = await supabase
    .from(table)
    .select("*, clients(id, name, email, email_cc)")
    .eq("id", params.documentId)
    .maybeSingle();

  if (fetchErr) return fail(fetchErr.message);
  if (!row) return fail(notFoundMessage);

  const client = row.clients as {
    id: string;
    name: string | null;
    email: string | null;
    email_cc: string[] | null;
  } | null;

  if (row.client_id && client && (client.email ?? "").trim() !== recipientEmail) {
    await supabase.from("clients").update({ email: recipientEmail }).eq("id", row.client_id);
  }

  const cc = (params.compose?.cc ?? ((client?.email_cc as string[] | null) ?? []))
    .map((v) => v.trim())
    .filter(Boolean);
  if (cc.some((address) => !isValidEmail(address))) {
    return fail("CCのメールアドレスを確認してください", { cc: "形式が正しくありません" });
  }
  const replyTo = params.compose?.replyTo?.trim() ?? "";
  if (replyTo && !isValidEmail(replyTo)) {
    return fail("返信先メールアドレスを確認してください", { replyTo: "形式が正しくありません" });
  }
  const attachment = params.compose?.attachment ?? null;
  if (attachment) {
    let bytes = 0;
    try {
      bytes = Buffer.from(attachment.base64, "base64").byteLength;
    } catch {
      return fail("添付ファイルを読み込めませんでした", { attachment: "形式が正しくありません" });
    }
    if (!attachment.filename.trim() || bytes === 0 || bytes > MAX_ATTACHMENT_BYTES) {
      return fail("添付ファイルは5MB以下にしてください", { attachment: "5MB以下のファイルを選択してください" });
    }
  }

  const { data: connectionRow } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("organization_id", params.organizationId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!connectionRow) {
    return fail("Gmailが連携されていません。受信箱から連携してください。");
  }

  const connection = connectionRow as GmailConnectionRow;
  if (!hasGmailSendScope(connection.scopes)) {
    await supabase
      .from("gmail_connections")
      .update({
        last_send_error: "GMAIL_SEND_SCOPE_MISSING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    return fail("メール送信の権限がありません。受信箱からGmailを再連携してください。");
  }

  const shareResult = await issueShareToken(supabase, {
    organizationId: params.organizationId,
    userId: params.userId,
    kind: params.kind,
    documentId: params.documentId,
    existingToken: (row.share_token as string | null) ?? null,
  });
  if (!shareResult.ok) return shareResult;

  const shareToken = shareResult.data.token;
  const shareExpiresAt = shareResult.data.expiresAt;
  const outputLocale = normalizeDocumentOutputLocale(row.output_locale);
  const recipient = (row.recipient_snapshot ?? {}) as Record<string, string>;
  const clientName = client?.name ?? recipient.clientName ?? "";
  const shareUrl = buildDocumentShareUrl(params.origin, outputLocale, params.kind, shareToken);

  // 발신자 표시와 서명에 쓸 회사 정보. 없으면 계정 이메일만 나간다.
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("company_name_line1, tel, email")
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  const companyName = ((profile?.company_name_line1 as string | null) ?? "").trim();
  const companyEmail = ((profile?.email as string | null) ?? "").trim();

  const mail = buildDocumentEmail({
    kind: params.kind,
    locale: outputLocale,
    clientName,
    documentNumber: (row.document_number as string) ?? "",
    documentSubject: (row.subject as string | null) ?? null,
    issueDate: (row.issue_date as string | null) ?? null,
    secondaryDate:
      params.kind === "estimate"
        ? ((row.expiry_date as string | null) ?? null)
        : ((row.payment_due as string | null) ?? null),
    total: Number(row.total ?? 0),
    shareUrl,
    company: {
      name: companyName,
      tel: (profile?.tel as string | null) ?? null,
      email: companyEmail || null,
    },
  });
  const variables: Record<string, string> = {
    client_name: clientName,
    invoice_number: String(row.document_number ?? ""),
    document_number: String(row.document_number ?? ""),
    share_url: shareUrl,
  };
  const fillTemplate = (value: string) =>
    value.replace(/\{(client_name|invoice_number|document_number|share_url)\}/g, (_, key: string) => variables[key] ?? "");
  const subject = params.compose?.subject?.trim()
    ? fillTemplate(params.compose.subject.trim()).slice(0, 200)
    : mail.subject;
  const body = params.compose?.body?.trim()
    ? fillTemplate(params.compose.body.trim()).slice(0, 20_000)
    : mail.text;

  try {
    const result = await sendGmailMessage(connection, params.origin, {
      to: [recipientEmail],
      cc: cc.length > 0 ? cc : undefined,
      subject,
      body,
      html: params.compose?.body?.trim() ? null : mail.html,
      fromName: params.compose?.senderName?.trim().slice(0, 100) || companyName || null,
      replyTo: replyTo || companyEmail || null,
      attachment: attachment
        ? {
            filename: attachment.filename.trim().replace(/[\r\n"]/g, "_").slice(0, 255),
            mimeType: /^[\w.+-]+\/[\w.+-]+$/.test(attachment.mimeType)
              ? attachment.mimeType
              : "application/octet-stream",
            base64: attachment.base64,
          }
        : null,
    });

    await supabase
      .from("gmail_connections")
      .update({
        last_send_at: new Date().toISOString(),
        last_send_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return done({
      messageId: result.id,
      shareToken,
      shareExpiresAt,
      shareUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail send failed";
    await supabase
      .from("gmail_connections")
      .update({ last_send_error: message, updated_at: new Date().toISOString() })
      .eq("id", connection.id);

    if (err instanceof GmailSendScopeError) {
      return fail("メール送信の権限がありません。受信箱からGmailを再連携してください。");
    }
    return fail(message);
  }
}
