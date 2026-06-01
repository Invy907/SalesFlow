"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createInvoiceSchema, type CreateInvoiceInput } from "@/lib/validators/document";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createInvoice(
  formData: CreateInvoiceInput,
): Promise<ActionResult<string>> {
  const parsed = createInvoiceSchema.safeParse(formData);
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
    _doc_type: "invoice",
    _issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
  });
  if (seqErr) return { ok: false, error: seqErr.message };

  const { data: invoice, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      document_number: docNum,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      payment_due: parsed.data.paymentDue?.toISOString().slice(0, 10) ?? null,
      delivery_date: parsed.data.deliveryDate?.toISOString().slice(0, 10) ?? null,
      billing_month: parsed.data.billingMonth ?? null,
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
      bank_account_ids: parsed.data.bankAccountIds ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !invoice) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  if (parsed.data.lineItems.length > 0) {
    const lines = parsed.data.lineItems.map((li, idx) => ({
      document_id: invoice.id,
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

    const { error: lineErr } = await supabase.from("invoice_line_items").insert(lines);
    if (lineErr) return { ok: false, error: lineErr.message };
  }

  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: invoice.id };
}

export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: "bank" | "card" | "cash" | "other",
  paidAt: string,
  memo?: string,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: inv } = await supabase
    .from("invoices")
    .select("client_id, paid_amount")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { ok: false, error: "Invoice not found" };

  const { error } = await supabase.from("payments").insert({
    organization_id: org.organization_id,
    invoice_id: invoiceId,
    client_id: inv.client_id,
    paid_at: paidAt,
    amount,
    method,
    memo: memo ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const newPaid = (inv.paid_amount ?? 0) + amount;
  await supabase.from("invoices").update({ paid_amount: newPaid }).eq("id", invoiceId);

  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: undefined };
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("invoices")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", invoiceId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: undefined };
}
