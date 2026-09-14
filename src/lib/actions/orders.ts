"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { lineItemSchema, hasContentLineItem } from "@/lib/validators/document";
import { computeDocumentTotals } from "@/lib/tax";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * 受注(orders)는 見積書/請求書/納品書/領収書와 달리 세율표시·인감·템플릿 같은 문서
 * 헤더 필드가 없는 가벼운 스키마라 createEstimateSchema를 확장하지 않고 별도로 둔다.
 */
export const createOrderSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  subject: z.string().max(70).optional(),
  orderDate: z.coerce.date(),
  deliveryDate: z.coerce.date().nullable().optional(),
  statusId: z.string().uuid().nullable().optional(),
  comment: z.string().optional(),
  sourceEstimateId: z.string().uuid().nullable().optional(),
  lineItems: z.array(lineItemSchema).min(1).max(80),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export async function createOrder(formData: CreateOrderInput): Promise<ActionResult<string>> {
  const parsed = createOrderSchema.safeParse(formData);
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
    _doc_type: "order",
    _issue_date: parsed.data.orderDate.toISOString().slice(0, 10),
  });
  if (seqErr) return { ok: false, error: seqErr.message };

  const totals = computeDocumentTotals(parsed.data.lineItems, "round_down");

  const { data: order, error: insertErr } = await supabase
    .from("orders")
    .insert({
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      order_number: docNum,
      order_date: parsed.data.orderDate.toISOString().slice(0, 10),
      delivery_date: parsed.data.deliveryDate?.toISOString().slice(0, 10) ?? null,
      subject: parsed.data.subject ?? null,
      status_id: parsed.data.statusId ?? null,
      comment: parsed.data.comment ?? null,
      source_estimate_id: parsed.data.sourceEstimateId ?? null,
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
    })
    .select("id")
    .single();

  if (insertErr || !order) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  if (parsed.data.lineItems.length > 0) {
    const lines = parsed.data.lineItems.map((li, idx) => ({
      document_id: order.id,
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

    const { error: lineErr } = await supabase.from("order_line_items").insert(lines);
    if (lineErr) return { ok: false, error: lineErr.message };
  }

  revalidatePath("/[lang]/orders", "page");
  return { ok: true, data: order.id };
}

export async function deleteOrder(orderId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/orders", "page");
  return { ok: true, data: undefined };
}
