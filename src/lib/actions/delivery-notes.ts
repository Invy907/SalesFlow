"use server";

import { revalidatePath } from "next/cache";
import { todayInScheduleTz } from "@/lib/periodic/schedule-math";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createDeliveryNoteSchema, hasContentLineItem, type CreateDeliveryNoteInput } from "@/lib/validators/document";
import { saveSalesDocument } from "@/lib/documents/save-sales-document";
import type { LineItemInput } from "@/lib/validators/document";
import { createInvoice } from "@/lib/actions/invoices";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DOCUMENT_STATUSES = ["draft", "issued", "sent", "confirmed", "overdue"] as const;
type DeliveryNoteStatus = (typeof DOCUMENT_STATUSES)[number];

function uniqueValidIds(ids: string[]): string[] {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return [...new Set(ids)].filter((id) => typeof id === "string" && UUID_RE.test(id));
}

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

  const { data: deliveryNote, error: insertErr } = await saveSalesDocument(supabase, "delivery_note", {
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      document_number: docNum,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      delivery_date: parsed.data.deliveryDate?.toISOString().slice(0, 10) ?? null,
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

  if (insertErr || !deliveryNote) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: deliveryNote.id };
}

/** Replace the existing document and lines in one transaction. */
export async function updateDeliveryNote(
  deliveryNoteId: string,
  formData: CreateDeliveryNoteInput,
): Promise<ActionResult> {
  const parsed = createDeliveryNoteSchema.safeParse(formData);
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
  const { error } = await saveSalesDocument(supabase, "delivery_note", {
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      delivery_date: parsed.data.deliveryDate?.toISOString().slice(0, 10) ?? null,
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
    }, parsed.data.lineItems, deliveryNoteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/delivery-notes", "page");
  revalidatePath(`/[lang]/delivery-notes/${deliveryNoteId}`, "page");
  return { ok: true, data: undefined };
}

export async function deleteDeliveryNote(deliveryNoteId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("delivery_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", deliveryNoteId).is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: undefined };
}

/** 発行バッジ切替。status とは独立した軸(手動)。 */
export async function toggleDeliveryNoteIssueFlag(deliveryNoteId: string): Promise<ActionResult<boolean>> {
  const supabase = await getSupabaseServerClient();
  const { data: current, error: readErr } = await supabase
    .from("delivery_notes")
    .select("issued_marked_at")
    .eq("id", deliveryNoteId).is("deleted_at", null)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "納品書が見つかりません" };

  const next = current.issued_marked_at ? null : new Date().toISOString();
  const { error } = await supabase
    .from("delivery_notes")
    .update({ issued_marked_at: next })
    .eq("id", deliveryNoteId).is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: Boolean(next) };
}

export async function bulkSetDeliveryNotesStatus(
  ids: string[],
  status: DeliveryNoteStatus,
): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "納品書が選択されていません" };
  if (!DOCUMENT_STATUSES.includes(status)) return { ok: false, error: "ステータスの指定が正しくありません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .update({ status })
    .in("id", validIds)
    .is("deleted_at", null)
    .eq("organization_id", org.organization_id)
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: { updated: data?.length ?? 0 } };
}

/** 체크박스 일괄 "処理済みにする". status を confirmed 로. */
export async function bulkMarkDeliveryNotesProcessed(ids: string[]) {
  return bulkSetDeliveryNotesStatus(ids, "confirmed");
}

/**
 * "未処理に戻す". 発行 배지(issued_marked_at)가 있으면 issued로, 없으면 draft로
 * 되돌린다(대상들의 발행 배지 상태가 다를 수 있어 건별로 계산한다).
 */
export async function bulkUnmarkDeliveryNotesProcessed(ids: string[]): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "納品書が選択されていません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data: rows, error: readErr } = await supabase
    .from("delivery_notes")
    .select("id, issued_marked_at")
    .in("id", validIds)
    .is("deleted_at", null)
    .eq("organization_id", org.organization_id);
  if (readErr) return { ok: false, error: readErr.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase
      .from("delivery_notes")
      .update({ status: row.issued_marked_at ? "issued" : "draft" })
      .eq("id", row.id).is("deleted_at", null);
    if (!error) updated += 1;
  }

  revalidatePath("/[lang]/delivery-notes", "page");
  return { ok: true, data: { updated } };
}

type DeliveryNoteForConversion = {
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
  delivery_note_line_items: Array<{
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

async function loadDeliveryNoteForConversion(
  deliveryNoteId: string,
  orgId: string,
): Promise<DeliveryNoteForConversion | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .select(
      "client_id, client_destination_id, subject, tax_display, tax_rounding, withholding_type, template_key, output_locale, client_honorific, show_seal, template_message, remarks, recipient_snapshot, sender_snapshot, delivery_note_line_items(*)",
    )
    .eq("id", deliveryNoteId).is("deleted_at", null)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("line_no", { referencedTable: "delivery_note_line_items", ascending: true })
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as DeliveryNoteForConversion;
}

function deliveryNoteLinesToInput(note: DeliveryNoteForConversion): LineItemInput[] {
  return (note.delivery_note_line_items ?? []).map((l) => ({
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

async function markDeliveryNoteBilled(deliveryNoteId: string, invoiceId: string) {
  const supabase = await getSupabaseServerClient();
  await supabase
    .from("delivery_notes")
    .update({ billed_marked_at: new Date().toISOString(), linked_invoice_id: invoiceId })
    .eq("id", deliveryNoteId).is("deleted_at", null);
}

/** 納品書を「請求書に変換」。成功した件ごとに請求バッジを自動で「請求済」に切り替える。 */
export async function bulkConvertDeliveryNotesToInvoices(
  ids: string[],
): Promise<ActionResult<{ createdIds: string[]; failed: number }>> {
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const createdIds: string[] = [];
  let failed = 0;
  for (const id of uniqueValidIds(ids)) {
    const note = await loadDeliveryNoteForConversion(id, org.organization_id);
    if (!note) {
      failed += 1;
      continue;
    }
    const created = await createInvoice({
      clientId: note.client_id,
      clientDestinationId: note.client_destination_id,
      subject: note.subject ?? undefined,
      issueDate: todayDate(),
      taxDisplay: (note.tax_display ?? "separate") as CreateDeliveryNoteInput["taxDisplay"],
      taxRounding: (note.tax_rounding ?? "round_down") as CreateDeliveryNoteInput["taxRounding"],
      withholdingType: (note.withholding_type ?? "none") as CreateDeliveryNoteInput["withholdingType"],
      templateKey: note.template_key ?? "standard",
      outputLocale: (note.output_locale ?? "ja") as CreateDeliveryNoteInput["outputLocale"],
      clientHonorific: (note.client_honorific ?? "onchu") as CreateDeliveryNoteInput["clientHonorific"],
      showSeal: note.show_seal ?? true,
      templateMessage: note.template_message ?? undefined,
      remarks: note.remarks ?? undefined,
      recipientSnapshot: (note.recipient_snapshot as Record<string, string>) ?? undefined,
      senderSnapshot: (note.sender_snapshot as Record<string, string>) ?? undefined,
      lineItems: deliveryNoteLinesToInput(note),
    });
    if (created.ok) {
      await markDeliveryNoteBilled(id, created.data);
      createdIds.push(created.data);
    } else {
      failed += 1;
    }
  }

  revalidatePath("/[lang]/delivery-notes", "page");
  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: { createdIds, failed } };
}
