"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createDeliveryNoteSchema, hasContentLineItem, type CreateDeliveryNoteInput } from "@/lib/validators/document";
import { computeDocumentTotals } from "@/lib/tax";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createDeliveryNote(
  formData: CreateDeliveryNoteInput,
): Promise<ActionResult<string>> {
  const parsed = createDeliveryNoteSchema.safeParse(formData);
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
    _doc_type: "delivery_note",
    _issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
  });
  if (seqErr) return { ok: false, error: seqErr.message };

  const totals = computeDocumentTotals(parsed.data.lineItems, parsed.data.taxRounding);

  const { data: deliveryNote, error: insertErr } = await supabase
    .from("delivery_notes")
    .insert({
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      document_number: docNum,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      delivery_date: parsed.data.deliveryDate?.toISOString().slice(0, 10) ?? null,
      linked_invoice_id: parsed.data.linkedInvoiceId ?? null,
      status: "draft",
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
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !deliveryNote) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  if (parsed.data.lineItems.length > 0) {
    const lines = parsed.data.lineItems.map((li, idx) => ({
      document_id: deliveryNote.id,
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

    const { error: lineErr } = await supabase.from("delivery_note_line_items").insert(lines);
    if (lineErr) return { ok: false, error: lineErr.message };
  }

  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: deliveryNote.id };
}

export async function deleteDeliveryNote(deliveryNoteId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("delivery_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", deliveryNoteId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: undefined };
}
