import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { newShareToken, shareExpiryFromNow } from "@/lib/share-tokens";
import { hasGmailSendScope } from "@/lib/gmail/oauth";
import { GmailSendScopeError, sendGmailMessage } from "@/lib/gmail/send";
import type { GmailConnectionRow } from "@/lib/gmail/client";
import { applyTemplateVars, emailTemplateVars } from "./template-vars";
import type { GeneratedInvoice } from "./generate-from-schedule";
import type { PeriodicScheduleRow } from "./types";

/**
 * Email the generated invoice to the client.
 *
 * First cut sends a share link only (no PDF attachment).
 * A failed email never rolls back the invoice.
 */

export type PeriodicEmailSkipReason =
  | "disabled"
  | "no_client_email"
  | "no_gmail_connection"
  | "gmail_send_scope_missing"
  | "send_failed";

export type PeriodicEmailOutcome =
  | { sent: true; messageId: string; shareUrl: string }
  | { sent: false; skipped: PeriodicEmailSkipReason; error?: string };

const DEFAULT_TEXT: Record<string, { subject: string; body: string }> = {
  ja: {
    subject: "【{invoice_number}】{month}月分の請求書をお送りします",
    body:
      "{client_name} ご担当者様\n\n" +
      "いつもお世話になっております。\n{month}月分の請求書（{invoice_number}）をお送りいたします。\n" +
      "下記のリンクよりご確認ください。\n\n{share_url}\n",
  },
  ko: {
    subject: "[{invoice_number}] {month}월분 청구서를 보내드립니다",
    body:
      "{client_name} 담당자님\n\n" +
      "평소 감사합니다.\n{month}월분 청구서({invoice_number})를 보내드립니다.\n" +
      "아래 링크에서 확인하실 수 있습니다.\n\n{share_url}\n",
  },
  en: {
    subject: "[{invoice_number}] Invoice for month {month}",
    body:
      "Dear {client_name},\n\n" +
      "Please find your invoice ({invoice_number}) for month {month}.\n" +
      "You can view it at the link below.\n\n{share_url}\n",
  },
};

function defaultsFor(locale: string) {
  return DEFAULT_TEXT[locale] ?? DEFAULT_TEXT.ja;
}

export function buildShareUrl(origin: string, locale: string, token: string) {
  return `${origin.replace(/\/$/, "")}/${locale}/invoices/shared/${token}`;
}

export async function sendPeriodicInvoiceEmail(
  admin: SupabaseClient,
  params: { schedule: PeriodicScheduleRow; invoice: GeneratedInvoice; origin: string },
): Promise<PeriodicEmailOutcome> {
  const { schedule, invoice, origin } = params;

  if (!schedule.email_enabled) return { sent: false, skipped: "disabled" };
  if (!schedule.client_id) return { sent: false, skipped: "no_client_email" };

  const { data: client } = await admin
    .from("clients")
    .select("email, email_cc")
    .eq("id", schedule.client_id)
    .maybeSingle();

  const to = (client?.email as string | null)?.trim();
  if (!to) return { sent: false, skipped: "no_client_email" };
  const cc = ((client?.email_cc as string[] | null) ?? []).map((v) => v.trim()).filter(Boolean);

  const { data: connectionRow } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("organization_id", schedule.organization_id)
    .is("revoked_at", null)
    .maybeSingle();

  if (!connectionRow) return { sent: false, skipped: "no_gmail_connection" };

  const connection = connectionRow as GmailConnectionRow;
  if (!hasGmailSendScope(connection.scopes)) {
    // Surfaced in the inbox as a "reconnect to allow sending" banner.
    await admin
      .from("gmail_connections")
      .update({
        last_send_error: "GMAIL_SEND_SCOPE_MISSING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    return { sent: false, skipped: "gmail_send_scope_missing" };
  }

  const token = newShareToken();
  const { error: shareError } = await admin.from("share_tokens").insert({
    token,
    organization_id: schedule.organization_id,
    target_table: "invoices",
    target_id: invoice.invoiceId,
    created_by: schedule.created_by,
    expires_at: shareExpiryFromNow(),
    revoked_at: null,
  });

  if (shareError) return { sent: false, skipped: "send_failed", error: shareError.message };
  await admin.from("invoices").update({ share_token: token }).eq("id", invoice.invoiceId);

  const shareUrl = buildShareUrl(origin, invoice.outputLocale, token);
  const vars = emailTemplateVars({
    issueDate: invoice.issueDate,
    clientName: invoice.clientName,
    invoiceNumber: invoice.documentNumber,
    shareUrl,
  });

  const fallback = defaultsFor(invoice.outputLocale);
  const subject = applyTemplateVars(schedule.email_subject || fallback.subject, vars);
  const body = applyTemplateVars(schedule.email_body || fallback.body, vars);

  try {
    const result = await sendGmailMessage(connection, origin, {
      to: [to],
      cc: cc.length > 0 ? cc : undefined,
      subject,
      body,
    });

    await admin
      .from("gmail_connections")
      .update({
        last_send_at: new Date().toISOString(),
        last_send_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return { sent: true, messageId: result.id, shareUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail send failed";
    await admin
      .from("gmail_connections")
      .update({ last_send_error: message, updated_at: new Date().toISOString() })
      .eq("id", connection.id);

    if (err instanceof GmailSendScopeError) {
      return { sent: false, skipped: "gmail_send_scope_missing" };
    }
    return { sent: false, skipped: "send_failed", error: message };
  }
}
