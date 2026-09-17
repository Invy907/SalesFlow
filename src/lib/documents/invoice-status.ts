import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 請求書の「発行」「入金」ステータスバッジ共通処理。
 * lib/actions/invoices.ts と lib/documents/send-document-email.ts の
 * 両方から使われるため、循環 import を避けてここに切り出す。
 */

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
) {
  await supabase.from("invoice_status_events").insert({
    organization_id: params.orgId,
    invoice_id: params.invoiceId,
    status_type: params.statusType,
    previous_value: params.previousValue,
    new_value: params.newValue,
    source: params.source,
    changed_by: params.userId ?? null,
  });
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
) {
  const { data: current } = await supabase
    .from("invoices")
    .select("issued_marked_at")
    .eq("id", invoiceId)
    .maybeSingle();
  if (current?.issued_marked_at) return;

  await supabase
    .from("invoices")
    .update({ issued_marked_at: new Date().toISOString() })
    .eq("id", invoiceId);

  await logInvoiceStatusEvent(supabase, {
    orgId: scope.orgId,
    userId: scope.userId,
    invoiceId,
    statusType: "issue",
    previousValue: "unissued",
    newValue: "issued",
    source,
  });
}
