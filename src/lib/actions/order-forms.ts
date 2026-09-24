"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/db/organizations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { taxRateSnapshotFor } from "@/lib/tax";
import { orderFormDraftSchema, type OrderFormDraftInput } from "@/lib/validators/order-form";

export async function createOrderFormDraft(input: OrderFormDraftInput) {
  const parsed = orderFormDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const org = await getActiveOrganization();
  if (!org) return { ok: false as const, error: "No active organization" };
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const inputData = parsed.data;
  const { data: form, error } = await supabase.from("order_forms").insert({
    organization_id: org.organization_id,
    name: inputData.name,
    subject: inputData.subject,
    expiration_mode: inputData.expirationMode,
    expiration_date: inputData.expirationMode === "date" ? inputData.expirationDate : null,
    public_token: randomUUID(),
    is_published: false,
  }).select("id").single();
  if (error || !form) return { ok: false as const, error: error?.message ?? "Could not save form" };

  const { error: lineError } = await supabase.from("order_form_line_items").insert(inputData.lines.map((line, index) => ({
    order_form_id: form.id,
    line_no: index + 1,
    name_snapshot: line.name,
    unit_snapshot: line.unit || null,
    unit_price_snapshot: line.unitPrice,
    tax_category: line.taxCategory,
    tax_rate_snapshot: taxRateSnapshotFor(line.taxCategory),
  })));
  if (lineError) {
    await supabase.from("order_forms").delete().eq("id", form.id).eq("organization_id", org.organization_id);
    return { ok: false as const, error: lineError.message };
  }
  revalidatePath("/[lang]/orders/form", "page");
  return { ok: true as const, data: form.id };
}

export async function deleteOrderFormDraft(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "Invalid form" };
  const org = await getActiveOrganization();
  if (!org) return { ok: false as const, error: "No active organization" };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("order_forms")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id).eq("organization_id", org.organization_id)
    .eq("is_published", false).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return { ok: false as const, error: error?.message ?? "Draft not found" };
  revalidatePath("/[lang]/orders/form", "page");
  return { ok: true as const };
}
