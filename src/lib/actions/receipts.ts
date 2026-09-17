"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DOCUMENT_STATUSES = ["draft", "issued", "sent", "confirmed", "overdue"] as const;
type ReceiptStatus = (typeof DOCUMENT_STATUSES)[number];

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
    .eq("id", receiptId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "領収書が見つかりません" };

  const next = current.issued_marked_at ? null : new Date().toISOString();
  const { error } = await supabase
    .from("receipts")
    .update({ issued_marked_at: next })
    .eq("id", receiptId);
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
    .eq("organization_id", org.organization_id);
  if (readErr) return { ok: false, error: readErr.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase
      .from("receipts")
      .update({ status: row.issued_marked_at ? "issued" : "draft" })
      .eq("id", row.id);
    if (!error) updated += 1;
  }

  revalidatePath("/[lang]/receipts", "page");
  return { ok: true, data: { updated } };
}
