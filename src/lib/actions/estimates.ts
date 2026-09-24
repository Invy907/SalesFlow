"use server";

import { revalidatePath } from "next/cache";
import { canWriteOrganizationBusinessData } from "@/lib/organization-permissions";
import { todayInScheduleTz } from "@/lib/periodic/schedule-math";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createEstimateSchema, type CreateEstimateInput } from "@/lib/validators/document";
import { hasContentLineItem } from "@/lib/validators/document";
import { maybeImportIssuedEstimateAsAiSource } from "@/lib/actions/ai-estimates";
import { newShareToken, shareExpiryFromNow } from "@/lib/share-tokens";
import { saveSalesDocument } from "@/lib/documents/save-sales-document";
import { sendSalesDocumentEmail } from "@/lib/documents/send-document-email";
import { getServerSiteUrl } from "@/lib/site-url.server";
import { createInvoice } from "@/lib/actions/invoices";
import { createDeliveryNote } from "@/lib/actions/delivery-notes";
import { createOrder } from "@/lib/actions/orders";
import type { LineItemInput } from "@/lib/validators/document";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DOCUMENT_STATUSES = ["draft", "issued", "sent", "confirmed", "overdue"] as const;
type EstimateStatus = (typeof DOCUMENT_STATUSES)[number];

function uniqueValidIds(ids: string[]): string[] {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return [...new Set(ids)].filter((id) => typeof id === "string" && UUID_RE.test(id));
}

export async function createEstimate(
  formData: CreateEstimateInput,
): Promise<ActionResult<string>> {
  const parsed = createEstimateSchema.safeParse(formData);
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: docNum, error: seqErr } = await supabase.rpc("next_document_number", {
    _org: org.organization_id,
    _doc_type: "estimate",
    _issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
  });
  if (seqErr) return { ok: false, error: seqErr.message };

  const { data: estimate, error: insertErr } = await saveSalesDocument(supabase, "estimate", {
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      document_number: docNum,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      expiry_date: parsed.data.expiryDate?.toISOString().slice(0, 10) ?? null,
      tax_display: parsed.data.taxDisplay,
      tax_rounding: parsed.data.taxRounding,
      withholding_type: parsed.data.withholdingType,
      template_key: parsed.data.templateKey ?? null,
      output_locale: parsed.data.outputLocale,
      client_honorific: parsed.data.clientHonorific,
      show_seal: parsed.data.showSeal,
      // 기존 조회 코드 호환용으로 같은 뜻을 boolean 으로도 남긴다.
      show_client_honorific: parsed.data.clientHonorific !== "none",
      template_message: parsed.data.templateMessage ?? null,
      remarks: parsed.data.remarks ?? null,
      internal_memo: parsed.data.internalMemo ?? null,
      recipient_snapshot: parsed.data.recipientSnapshot ?? null,
      sender_snapshot: parsed.data.senderSnapshot ?? null,
    }, parsed.data.lineItems, undefined, parsed.data.aiSuggestionIds);

  if (insertErr || !estimate) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: estimate.id };
}

export async function updateEstimate(
  estimateId: string,
  formData: CreateEstimateInput,
): Promise<ActionResult> {
  const parsed = createEstimateSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = msgs?.[0] ?? "Invalid";
    }
    return { ok: false, error: "Validation failed", fieldErrors };
  }

  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { error } = await saveSalesDocument(supabase, "estimate", {
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      expiry_date: parsed.data.expiryDate?.toISOString().slice(0, 10) ?? null,
      tax_display: parsed.data.taxDisplay,
      tax_rounding: parsed.data.taxRounding,
      withholding_type: parsed.data.withholdingType,
      template_key: parsed.data.templateKey ?? null,
      output_locale: parsed.data.outputLocale,
      client_honorific: parsed.data.clientHonorific,
      show_seal: parsed.data.showSeal,
      show_client_honorific: parsed.data.clientHonorific !== "none",
      template_message: parsed.data.templateMessage ?? null,
      remarks: parsed.data.remarks ?? null,
      internal_memo: parsed.data.internalMemo ?? null,
      recipient_snapshot: parsed.data.recipientSnapshot ?? null,
      sender_snapshot: parsed.data.senderSnapshot ?? null,
    }, parsed.data.lineItems, estimateId, parsed.data.aiSuggestionIds);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/estimates", "page");
  revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  return { ok: true, data: undefined };
}

export async function issueEstimate(estimateId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("estimates")
    .update({ status: "issued" })
    .eq("id", estimateId).is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  await maybeImportIssuedEstimateAsAiSource(estimateId);
  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: undefined };
}

/** 発行 배지(依頼1) 토글. status와 무관한 독립 축. */
export async function toggleEstimateIssueFlag(estimateId: string): Promise<ActionResult<boolean>> {
  const supabase = await getSupabaseServerClient();
  const { data: current, error: readErr } = await supabase
    .from("estimates")
    .select("issue_marked_at")
    .eq("id", estimateId).is("deleted_at", null)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "見積書が見つかりません" };

  const next = current.issue_marked_at ? null : new Date().toISOString();
  const { error } = await supabase.from("estimates").update({ issue_marked_at: next }).eq("id", estimateId).is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: Boolean(next) };
}

/** 受注 배지(依頼1) 토글. 수동 토글은 ordered_order_id 는 건드리지 않는다(실제 연결은 변환 액션만). */
export async function toggleEstimateOrderFlag(estimateId: string): Promise<ActionResult<boolean>> {
  const supabase = await getSupabaseServerClient();
  const { data: current, error: readErr } = await supabase
    .from("estimates")
    .select("ordered_at")
    .eq("id", estimateId).is("deleted_at", null)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "見積書が見つかりません" };

  const next = current.ordered_at ? null : new Date().toISOString();
  const { error } = await supabase.from("estimates").update({ ordered_at: next }).eq("id", estimateId).is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: Boolean(next) };
}

async function markEstimateOrdered(estimateId: string, orderId?: string) {
  const supabase = await getSupabaseServerClient();
  if (orderId) {
    await supabase
      .from("estimates")
      .update({ ordered_at: new Date().toISOString(), ordered_order_id: orderId })
      .eq("id", estimateId).is("deleted_at", null);
  } else {
    await supabase.from("estimates").update({ ordered_at: new Date().toISOString() }).eq("id", estimateId).is("deleted_at", null);
  }
}

export async function bulkSetEstimatesStatus(
  ids: string[],
  status: EstimateStatus,
): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "見積書が選択されていません" };
  if (!DOCUMENT_STATUSES.includes(status)) return { ok: false, error: "ステータスの指定が正しくありません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .update({ status })
    .in("id", validIds)
    .is("deleted_at", null)
    .eq("organization_id", org.organization_id)
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: { updated: data?.length ?? 0 } };
}

/** 依頼2: 체크박스 일괄 "処理済みにする". status を confirmed 로. */
export async function bulkMarkEstimatesProcessed(ids: string[]) {
  return bulkSetEstimatesStatus(ids, "confirmed");
}

/**
 * 依頼2: "未処理に戻す". 発行 배지(issue_marked_at)가 있으면 issued로, 없으면 draft로
 * 되돌린다(대상들의 발행 배지 상태가 다를 수 있어 건별로 계산한다).
 */
export async function bulkUnmarkEstimatesProcessed(ids: string[]): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "見積書が選択されていません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data: rows, error: readErr } = await supabase
    .from("estimates")
    .select("id, issue_marked_at")
    .in("id", validIds)
    .is("deleted_at", null)
    .eq("organization_id", org.organization_id);
  if (readErr) return { ok: false, error: readErr.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase
      .from("estimates")
      .update({ status: row.issue_marked_at ? "issued" : "draft" })
      .eq("id", row.id).is("deleted_at", null);
    if (!error) updated += 1;
  }

  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: { updated } };
}

export async function bulkIssueEstimates(ids: string[]): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "見積書が選択されていません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .update({ status: "issued" })
    .in("id", validIds)
    .is("deleted_at", null)
    .eq("organization_id", org.organization_id)
    .select("id");
  if (error) return { ok: false, error: error.message };

  for (const row of data ?? []) {
    await maybeImportIssuedEstimateAsAiSource(row.id as string);
  }

  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: { updated: data?.length ?? 0 } };
}

type EstimateForConversion = {
  client_id: string | null;
  client_destination_id: string | null;
  subject: string | null;
  tax_display: string | null;
  tax_rounding: string | null;
  withholding_type: string | null;
  template_key: string | null;
  output_locale: string | null;
  client_honorific: string | null;
  show_seal: boolean | null;
  template_message: string | null;
  remarks: string | null;
  recipient_snapshot: Record<string, unknown> | null;
  sender_snapshot: Record<string, unknown> | null;
  estimate_line_items: Array<{
    item_id: string | null;
    name_snapshot: string | null;
    qty: number;
    unit_snapshot: string | null;
    unit_price_snapshot: number;
    tax_category: string;
    tax_rate_snapshot: number;
    withholding_exempt_snapshot: boolean | null;
  }>;
};

async function loadEstimateForConversion(
  estimateId: string,
  orgId: string,
): Promise<EstimateForConversion | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .select(
      "client_id, client_destination_id, subject, tax_display, tax_rounding, withholding_type, template_key, output_locale, client_honorific, show_seal, template_message, remarks, recipient_snapshot, sender_snapshot, estimate_line_items(*)",
    )
    .eq("id", estimateId).is("deleted_at", null)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("line_no", { referencedTable: "estimate_line_items", ascending: true })
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as EstimateForConversion;
}

function estimateLinesToInput(est: EstimateForConversion): LineItemInput[] {
  return (est.estimate_line_items ?? []).map((l) => ({
    itemId: l.item_id ?? undefined,
    name: l.name_snapshot ?? "",
    qty: l.qty,
    unit: l.unit_snapshot ?? undefined,
    unitPrice: l.unit_price_snapshot,
    taxCategory: l.tax_category as LineItemInput["taxCategory"],
    taxRateSnapshot: l.tax_rate_snapshot,
    withholdingExempt: l.withholding_exempt_snapshot ?? undefined,
  }));
}

function todayDate() {
  return new Date(todayInScheduleTz());
}

/** 見積書 → 納品書/請求書/受注情報 변환 공용. 성공한 건마다 受注 배지를 자동 전환한다. */
async function convertEstimates(
  ids: string[],
  orgId: string,
  create: (est: EstimateForConversion, estimateId: string) => Promise<ActionResult<string>>,
): Promise<{ createdIds: string[]; failed: number }> {
  const createdIds: string[] = [];
  let failed = 0;
  for (const id of uniqueValidIds(ids)) {
    const est = await loadEstimateForConversion(id, orgId);
    if (!est) {
      failed += 1;
      continue;
    }
    const result = await create(est, id);
    if (result.ok) {
      createdIds.push(result.data);
    } else {
      failed += 1;
    }
  }
  return { createdIds, failed };
}

export async function bulkConvertEstimatesToDeliveryNotes(
  ids: string[],
): Promise<ActionResult<{ createdIds: string[]; failed: number }>> {
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const result = await convertEstimates(ids, org.organization_id, async (est, estimateId) => {
    const created = await createDeliveryNote({
      clientId: est.client_id,
      clientDestinationId: est.client_destination_id,
      subject: est.subject ?? undefined,
      issueDate: todayDate(),
      taxDisplay: (est.tax_display ?? "separate") as CreateEstimateInput["taxDisplay"],
      taxRounding: (est.tax_rounding ?? "round_down") as CreateEstimateInput["taxRounding"],
      withholdingType: (est.withholding_type ?? "none") as CreateEstimateInput["withholdingType"],
      templateKey: est.template_key ?? "standard",
      outputLocale: (est.output_locale ?? "ja") as CreateEstimateInput["outputLocale"],
      clientHonorific: (est.client_honorific ?? "onchu") as CreateEstimateInput["clientHonorific"],
      showSeal: est.show_seal ?? true,
      templateMessage: est.template_message ?? undefined,
      remarks: est.remarks ?? undefined,
      recipientSnapshot: (est.recipient_snapshot as Record<string, string>) ?? undefined,
      senderSnapshot: (est.sender_snapshot as Record<string, string>) ?? undefined,
      lineItems: estimateLinesToInput(est),
    });
    if (created.ok) await markEstimateOrdered(estimateId);
    return created;
  });
  revalidatePath("/[lang]/estimates", "page");
  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: result };
}

export async function bulkConvertEstimatesToInvoices(
  ids: string[],
): Promise<ActionResult<{ createdIds: string[]; failed: number }>> {
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const result = await convertEstimates(ids, org.organization_id, async (est, estimateId) => {
    const created = await createInvoice({
      clientId: est.client_id,
      clientDestinationId: est.client_destination_id,
      subject: est.subject ?? undefined,
      issueDate: todayDate(),
      taxDisplay: (est.tax_display ?? "separate") as CreateEstimateInput["taxDisplay"],
      taxRounding: (est.tax_rounding ?? "round_down") as CreateEstimateInput["taxRounding"],
      withholdingType: (est.withholding_type ?? "none") as CreateEstimateInput["withholdingType"],
      templateKey: est.template_key ?? "standard",
      outputLocale: (est.output_locale ?? "ja") as CreateEstimateInput["outputLocale"],
      clientHonorific: (est.client_honorific ?? "onchu") as CreateEstimateInput["clientHonorific"],
      showSeal: est.show_seal ?? true,
      templateMessage: est.template_message ?? undefined,
      remarks: est.remarks ?? undefined,
      recipientSnapshot: (est.recipient_snapshot as Record<string, string>) ?? undefined,
      senderSnapshot: (est.sender_snapshot as Record<string, string>) ?? undefined,
      lineItems: estimateLinesToInput(est),
    });
    if (created.ok) await markEstimateOrdered(estimateId);
    return created;
  });
  revalidatePath("/[lang]/estimates", "page");
  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: result };
}

export async function bulkConvertEstimatesToOrders(
  ids: string[],
): Promise<ActionResult<{ createdIds: string[]; failed: number }>> {
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const result = await convertEstimates(ids, org.organization_id, async (est, estimateId) => {
    const created = await createOrder({
      clientId: est.client_id,
      subject: est.subject ?? undefined,
      orderDate: todayDate(),
      sourceEstimateId: estimateId,
      lineItems: estimateLinesToInput(est),
    });
    if (created.ok) await markEstimateOrdered(estimateId, created.data);
    return created;
  });
  revalidatePath("/[lang]/estimates", "page");
  revalidatePath("/[lang]/orders", "page");
  return { ok: true, data: result };
}

export async function bulkDuplicateEstimates(
  ids: string[],
): Promise<ActionResult<{ createdIds: string[]; failed: number }>> {
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const result = await convertEstimates(ids, org.organization_id, async (est) => {
    return createEstimate({
      clientId: est.client_id,
      clientDestinationId: est.client_destination_id,
      subject: est.subject ?? undefined,
      issueDate: todayDate(),
      taxDisplay: (est.tax_display ?? "separate") as CreateEstimateInput["taxDisplay"],
      taxRounding: (est.tax_rounding ?? "round_down") as CreateEstimateInput["taxRounding"],
      withholdingType: (est.withholding_type ?? "none") as CreateEstimateInput["withholdingType"],
      templateKey: est.template_key ?? "standard",
      outputLocale: (est.output_locale ?? "ja") as CreateEstimateInput["outputLocale"],
      clientHonorific: (est.client_honorific ?? "onchu") as CreateEstimateInput["clientHonorific"],
      showSeal: est.show_seal ?? true,
      templateMessage: est.template_message ?? undefined,
      remarks: est.remarks ?? undefined,
      recipientSnapshot: (est.recipient_snapshot as Record<string, string>) ?? undefined,
      senderSnapshot: (est.sender_snapshot as Record<string, string>) ?? undefined,
      lineItems: estimateLinesToInput(est),
    });
  });
  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: result };
}

export async function shareEstimate(
  estimateId: string,
  days?: number,
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: existing } = await supabase
    .from("estimates")
    .select("share_token")
    .eq("id", estimateId).is("deleted_at", null)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Document not found" };

  if (existing.share_token) {
    await supabase
      .from("share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", existing.share_token);
  }

  const token = newShareToken();
  const expiresAt = shareExpiryFromNow(days);

  const { error } = await supabase.from("share_tokens").insert({
    token,
    organization_id: org.organization_id,
    target_table: "estimates",
    target_id: estimateId,
    created_by: user.id,
    expires_at: expiresAt,
    revoked_at: null,
  });

  if (error) return { ok: false, error: error.message };

  await supabase.from("estimates").update({ share_token: token }).eq("id", estimateId).is("deleted_at", null);

  revalidatePath("/[lang]/estimates", "page");
  revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  return { ok: true, data: { token, expiresAt } };
}

export async function revokeShareEstimate(estimateId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();

  const { data: estimate } = await supabase
    .from("estimates")
    .select("share_token")
    .eq("id", estimateId).is("deleted_at", null)
    .single();

  if (estimate?.share_token) {
    await supabase
      .from("share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", estimate.share_token);
  }

  const { error } = await supabase
    .from("estimates")
    .update({ share_token: null })
    .eq("id", estimateId).is("deleted_at", null);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  return { ok: true, data: undefined };
}

export async function saveEstimateMemo(estimateId: string, memo: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("estimates")
    .update({ internal_memo: memo })
    .eq("id", estimateId).is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  return { ok: true, data: undefined };
}

export async function sendEstimateEmail(
  estimateId: string,
  recipientEmail: string,
): Promise<
  ActionResult<{
    messageId: string;
    shareToken: string;
    shareExpiresAt: string;
    shareUrl: string;
  }>
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };
  if (!canWriteOrganizationBusinessData(org.role)) return { ok: false, error: "この操作を行う権限がありません" };

  const origin = await getServerSiteUrl();
  const result = await sendSalesDocumentEmail(supabase, {
    organizationId: org.organization_id,
    userId: user.id,
    origin,
    kind: "estimate",
    documentId: estimateId,
    recipientEmail,
  });

  if (result.ok) {
    revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  }
  return result;
}

export async function deleteEstimate(estimateId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("estimates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", estimateId).is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: undefined };
}
