import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { newShareToken, shareExpiryFromNow } from "@/lib/share-tokens";
import { hasGmailSendScope } from "@/lib/gmail/oauth";
import { GmailSendScopeError, sendGmailMessage } from "@/lib/gmail/send";
import type { GmailConnectionRow } from "@/lib/gmail/client";
import { normalizeDocumentOutputLocale } from "./output-locale";

export type SalesDocumentKind = "estimate" | "invoice";

const TABLE: Record<SalesDocumentKind, string> = {
  estimate: "estimates",
  invoice: "invoices",
};

const SHARE_SEGMENT: Record<SalesDocumentKind, string> = {
  estimate: "estimates",
  invoice: "invoices",
};

const DEFAULT_SUBJECT: Record<SalesDocumentKind, Record<string, string>> = {
  estimate: {
    ja: "【{document_number}】見積書をお送りします",
    ko: "[{document_number}] 견적서를 보내드립니다",
    en: "[{document_number}] Estimate",
  },
  invoice: {
    ja: "【{document_number}】請求書をお送りします",
    ko: "[{document_number}] 청구서를 보내드립니다",
    en: "[{document_number}] Invoice",
  },
};

const DEFAULT_BODY: Record<SalesDocumentKind, Record<string, string>> = {
  estimate: {
    ja:
      "{client_name} ご担当者様\n\n" +
      "見積書（{document_number}）をお送りいたします。\n" +
      "下記のリンクよりご確認ください。\n\n{share_url}\n",
    ko:
      "{client_name} 담당자님\n\n" +
      "견적서({document_number})를 보내드립니다.\n" +
      "아래 링크에서 확인하실 수 있습니다.\n\n{share_url}\n",
    en:
      "Dear {client_name},\n\n" +
      "Please find your estimate ({document_number}).\n" +
      "You can view it at the link below.\n\n{share_url}\n",
  },
  invoice: {
    ja:
      "{client_name} ご担当者様\n\n" +
      "請求書（{document_number}）をお送りいたします。\n" +
      "下記のリンクよりご確認ください。\n\n{share_url}\n",
    ko:
      "{client_name} 담당자님\n\n" +
      "청구서({document_number})를 보내드립니다.\n" +
      "아래 링크에서 확인하실 수 있습니다.\n\n{share_url}\n",
    en:
      "Dear {client_name},\n\n" +
      "Please find your invoice ({document_number}).\n" +
      "You can view it at the link below.\n\n{share_url}\n",
  },
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

function applyVars(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
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

  const cc = ((client?.email_cc as string[] | null) ?? [])
    .map((v) => v.trim())
    .filter(Boolean);

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
  const documentNumber = (row.document_number as string) ?? "";
  const shareUrl = buildDocumentShareUrl(params.origin, outputLocale, params.kind, shareToken);

  const subjectTpl =
    DEFAULT_SUBJECT[params.kind][outputLocale] ?? DEFAULT_SUBJECT[params.kind].ja;
  const bodyTpl = DEFAULT_BODY[params.kind][outputLocale] ?? DEFAULT_BODY[params.kind].ja;
  const vars = {
    client_name: clientName,
    document_number: documentNumber,
    share_url: shareUrl,
  };
  const subject = applyVars(subjectTpl, vars);
  const body = applyVars(bodyTpl, vars);

  try {
    const result = await sendGmailMessage(connection, params.origin, {
      to: [recipientEmail],
      cc: cc.length > 0 ? cc : undefined,
      subject,
      body,
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
