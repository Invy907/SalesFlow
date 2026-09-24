"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createReceiptSchema, hasContentLineItem, type CreateReceiptInput } from "@/lib/validators/document";
import { saveSalesDocument } from "@/lib/documents/save-sales-document";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DOCUMENT_STATUSES = ["draft", "issued", "sent", "confirmed", "overdue"] as const;
type ReceiptStatus = (typeof DOCUMENT_STATUSES)[number];

export async function createReceipt(formData: CreateReceiptInput): Promise<ActionResult<string>> {
  const parsed = createReceiptSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = msgs?.[0] ?? "Invalid";
    }
    return { ok: false, error: "Validation failed", fieldErrors };
  }

  if (!hasContentLineItem(parsed.data.lineItems)) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: { lineItems: "明細を1行以上入力してください" },
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: docNum, error: seqErr } = await supabase.rpc("next_document_number", {
    _org: org.organization_id,
    _doc_type: "receipt",
    _issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
  });
  if (seqErr) return { ok: false, error: seqErr.message };

  const { data: receipt, error: insertErr } = await saveSalesDocument(supabase, "receipt", {
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      document_number: docNum,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      transaction_date: parsed.data.transactionDate?.toISOString().slice(0, 10) ?? null,
      linked_invoice_id: parsed.data.linkedInvoiceId ?? null,
      tax_display: parsed.data.taxDisplay,
      tax_rounding: parsed.data.taxRounding,
      withholding_type: parsed.data.withholdingType,
      template_key: parsed.data.templateKey ?? null,
      output_locale: parsed.data.outputLocale,
      client_honorific: parsed.data.clientHonorific,
      show_client_honorific: parsed.data.clientHonorific !== "none",
      show_seal: parsed.data.showSeal,
      template_message: parsed.data.templateMessage ?? null,
      remarks: parsed.data.remarks ?? null,
      internal_memo: parsed.data.internalMemo ?? null,
      recipient_snapshot: parsed.data.recipientSnapshot ?? null,
      sender_snapshot: parsed.data.senderSnapshot ?? null,
    }, parsed.data.lineItems);

  if (insertErr || !receipt) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  revalidatePath("/[lang]/receipts", "page");
  return { ok: true, data: receipt.id };
}

/** Replace the existing document and lines in one transaction. */
export async function updateReceipt(
  receiptId: string,
  formData: CreateReceiptInput,
): Promise<ActionResult> {
  const parsed = createReceiptSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = messages?.[0] ?? "Invalid";
    }
    return { ok: false, error: "Validation failed", fieldErrors };
  }
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };
  const supabase = await getSupabaseServerClient();
  const { error } = await saveSalesDocument(supabase, "receipt", {
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      transaction_date: parsed.data.transactionDate?.toISOString().slice(0, 10) ?? null,
      linked_invoice_id: parsed.data.linkedInvoiceId ?? null,
      tax_display: parsed.data.taxDisplay,
      tax_rounding: parsed.data.taxRounding,
      withholding_type: parsed.data.withholdingType,
      template_key: parsed.data.templateKey,
      output_locale: parsed.data.outputLocale,
      client_honorific: parsed.data.clientHonorific,
      show_client_honorific: parsed.data.clientHonorific !== "none",
      show_seal: parsed.data.showSeal,
      template_message: parsed.data.templateMessage ?? null,
      remarks: parsed.data.remarks ?? null,
      internal_memo: parsed.data.internalMemo ?? null,
      recipient_snapshot: parsed.data.recipientSnapshot ?? null,
      sender_snapshot: parsed.data.senderSnapshot ?? null,
    }, parsed.data.lineItems, receiptId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/receipts", "page");
  revalidatePath(`/[lang]/receipts/${receiptId}`, "page");
  return { ok: true, data: undefined };
}

function uniqueValidIds(ids: string[]): string[] {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return [...new Set(ids)].filter((id) => typeof id === "string" && UUID_RE.test(id));
}

/**
 * 発行バッジ切替。領収書は入金確認後に発行するものなので入金軸は持たず、
 * status とは独立した単純な手動トグル(見積書の issue_marked_at と同じ発想)。
 */
export async function toggleReceiptIssueFlag(receiptId: string): Promise<ActionResult<boolean>> {
  const supabase = await getSupabaseServerClient();
  const { data: current, error: readErr } = await supabase
    .from("receipts")
    .select("issued_marked_at")
    .eq("id", receiptId).is("deleted_at", null)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "領収書が見つかりません" };

  const next = current.issued_marked_at ? null : new Date().toISOString();
  const { error } = await supabase
    .from("receipts")
    .update({ issued_marked_at: next })
    .eq("id", receiptId).is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/receipts", "page");
  return { ok: true, data: Boolean(next) };
}

export async function bulkSetReceiptsStatus(
  ids: string[],
  status: ReceiptStatus,
): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "領収書が選択されていません" };
  if (!DOCUMENT_STATUSES.includes(status)) return { ok: false, error: "ステータスの指定が正しくありません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("receipts")
    .update({ status })
    .in("id", validIds)
    .is("deleted_at", null)
    .eq("organization_id", org.organization_id)
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/receipts", "page");
  return { ok: true, data: { updated: data?.length ?? 0 } };
}

/** 체크박스 일괄 "処理済みにする". status を confirmed 로. */
export async function bulkMarkReceiptsProcessed(ids: string[]) {
  return bulkSetReceiptsStatus(ids, "confirmed");
}

/**
 * "未処理に戻す". 発行 배지(issued_marked_at)가 있으면 issued로, 없으면 draft로
 * 되돌린다(대상들의 발행 배지 상태가 다를 수 있어 건별로 계산한다).
 */
export async function bulkUnmarkReceiptsProcessed(ids: string[]): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "領収書が選択されていません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data: rows, error: readErr } = await supabase
    .from("receipts")
    .select("id, issued_marked_at")
    .in("id", validIds)
    .is("deleted_at", null)
    .eq("organization_id", org.organization_id);
  if (readErr) return { ok: false, error: readErr.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase
      .from("receipts")
      .update({ status: row.issued_marked_at ? "issued" : "draft" })
      .eq("id", row.id).is("deleted_at", null);
    if (!error) updated += 1;
  }

  revalidatePath("/[lang]/receipts", "page");
  return { ok: true, data: { updated } };
}
