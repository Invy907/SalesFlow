"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createEstimateSchema, type CreateEstimateInput } from "@/lib/validators/document";
import { maybeImportIssuedEstimateAsAiSource } from "@/lib/actions/ai-estimates";
import { newShareToken, shareExpiryFromNow } from "@/lib/share-tokens";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

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

  const { data: estimate, error: insertErr } = await supabase
    .from("estimates")
    .insert({
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      document_number: docNum,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      expiry_date: parsed.data.expiryDate?.toISOString().slice(0, 10) ?? null,
      status: "draft",
      tax_display: parsed.data.taxDisplay,
      tax_rounding: parsed.data.taxRounding,
      withholding_type: parsed.data.withholdingType,
      template_key: parsed.data.templateKey ?? null,
      template_message: parsed.data.templateMessage ?? null,
      remarks: parsed.data.remarks ?? null,
      internal_memo: parsed.data.internalMemo ?? null,
      recipient_snapshot: parsed.data.recipientSnapshot ?? null,
      sender_snapshot: parsed.data.senderSnapshot ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !estimate) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  if (parsed.data.lineItems.length > 0) {
    const lines = parsed.data.lineItems.map((li, idx) => ({
      document_id: estimate.id,
      line_no: idx + 1,
      item_id: li.itemId ?? null,
      name_snapshot: li.name,
      qty: li.qty,
      unit_snapshot: li.unit ?? null,
      unit_price_snapshot: li.unitPrice,
      tax_category: li.taxCategory,
      tax_rate_snapshot: li.taxRateSnapshot,
      withholding_exempt_snapshot: li.withholdingExempt ?? null,
    }));

    const { error: lineErr } = await supabase.from("estimate_line_items").insert(lines);
    if (lineErr) return { ok: false, error: lineErr.message };
  }

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

  const { error } = await supabase
    .from("estimates")
    .update({
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      expiry_date: parsed.data.expiryDate?.toISOString().slice(0, 10) ?? null,
      tax_display: parsed.data.taxDisplay,
      tax_rounding: parsed.data.taxRounding,
      withholding_type: parsed.data.withholdingType,
      template_key: parsed.data.templateKey ?? null,
      template_message: parsed.data.templateMessage ?? null,
      remarks: parsed.data.remarks ?? null,
      internal_memo: parsed.data.internalMemo ?? null,
      recipient_snapshot: parsed.data.recipientSnapshot ?? null,
      sender_snapshot: parsed.data.senderSnapshot ?? null,
    })
    .eq("id", estimateId);

  if (error) return { ok: false, error: error.message };

  await supabase.from("estimate_line_items").delete().eq("document_id", estimateId);

  if (parsed.data.lineItems.length > 0) {
    const lines = parsed.data.lineItems.map((li, idx) => ({
      document_id: estimateId,
      line_no: idx + 1,
      item_id: li.itemId ?? null,
      name_snapshot: li.name,
      qty: li.qty,
      unit_snapshot: li.unit ?? null,
      unit_price_snapshot: li.unitPrice,
      tax_category: li.taxCategory,
      tax_rate_snapshot: li.taxRateSnapshot,
      withholding_exempt_snapshot: li.withholdingExempt ?? null,
    }));

    const { error: lineErr } = await supabase.from("estimate_line_items").insert(lines);
    if (lineErr) return { ok: false, error: lineErr.message };
  }

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
    .eq("id", estimateId);

  if (error) return { ok: false, error: error.message };
  await maybeImportIssuedEstimateAsAiSource(estimateId);
  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: undefined };
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
    .eq("id", estimateId)
    .maybeSingle();

  if (existing?.share_token) {
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

  await supabase.from("estimates").update({ share_token: token }).eq("id", estimateId);

  revalidatePath("/[lang]/estimates", "page");
  revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  return { ok: true, data: { token, expiresAt } };
}

export async function revokeShareEstimate(estimateId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();

  const { data: estimate } = await supabase
    .from("estimates")
    .select("share_token")
    .eq("id", estimateId)
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
    .eq("id", estimateId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  return { ok: true, data: undefined };
}

export async function saveEstimateMemo(estimateId: string, memo: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("estimates")
    .update({ internal_memo: memo })
    .eq("id", estimateId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/[lang]/estimates/${estimateId}`, "page");
  return { ok: true, data: undefined };
}

export async function deleteEstimate(estimateId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("estimates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", estimateId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/estimates", "page");
  return { ok: true, data: undefined };
}
