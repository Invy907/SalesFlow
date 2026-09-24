import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 請求書の「発行」「入金」ステータスバッジ共通処理。
 * lib/actions/invoices.ts と lib/documents/send-document-email.ts の
 * 両方から使われるため、循環 import を避けてここに切り出す。
 */

type InvoiceStatusResult = { ok: true } | { ok: false; error: string };

export type InvoiceStatusEventSource = "manual" | "email" | "mail" | "share" | "bulk" | "payment";

/** 依頼2 5): 発行/入金/処理済みステータスの変更を履歴テーブルに記録する。 */
export async function logInvoiceStatusEvent(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId?: string | null;
    invoiceId: string;
    statusType: "issue" | "payment" | "processed";
    previousValue: string | null;
    newValue: string;
    source: InvoiceStatusEventSource;
  },
): Promise<InvoiceStatusResult> {
  const { error } = await supabase.from("invoice_status_events").insert({
    organization_id: params.orgId,
    invoice_id: params.invoiceId,
    status_type: params.statusType,
    previous_value: params.previousValue,
    new_value: params.newValue,
    source: params.source,
    changed_by: params.userId ?? null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * 発行ステータスバッジを立てる共通処理。
 * メール送信/郵送手続き/共有リンク発行の3つのトリガーから呼ばれる(依頼2 2))。
 * 既に発行済なら何もしない(何度呼んでも安全)。
 */
export async function markInvoiceIssued(
  supabase: SupabaseClient,
  scope: { orgId: string; userId: string },
  invoiceId: string,
  source: "email" | "mail" | "share",
): Promise<InvoiceStatusResult> {
  const { data: current, error: readError } = await supabase
    .from("invoices")
    .select("issued_marked_at")
    .eq("id", invoiceId)
    .eq("organization_id", scope.orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!current) return { ok: false, error: "請求書が見つからないか、権限がありません" };
  if (current.issued_marked_at) return { ok: true };

  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update({ issued_marked_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("organization_id", scope.orgId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) return { ok: false, error: "請求書が見つからないか、変更権限がありません" };

  return logInvoiceStatusEvent(supabase, {
    orgId: scope.orgId,
    userId: scope.userId,
    invoiceId,
    statusType: "issue",
    previousValue: "unissued",
    newValue: "issued",
    source,
  });
}
