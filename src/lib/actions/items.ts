"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createItemSchema, type CreateItemInput } from "@/lib/validators/item";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createItem(input: CreateItemInput): Promise<ActionResult<string>> {
  const parsed = createItemSchema.safeParse(input);
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

  const { data, error } = await supabase
    .from("items")
    .insert({
      organization_id: org.organization_id,
      name: parsed.data.name,
      unit: parsed.data.unit ?? null,
      unit_price: parsed.data.unitPrice,
      tax_category: parsed.data.taxCategory,
      withholding_exempt: parsed.data.withholdingExempt ?? false,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };

  revalidatePath("/[lang]/items", "page");
  return { ok: true, data: data.id };
}

export async function updateItem(
  itemId: string,
  input: Partial<CreateItemInput>,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("items")
    .update({
      name: input.name,
      unit: input.unit ?? null,
      unit_price: input.unitPrice,
      tax_category: input.taxCategory,
      withholding_exempt: input.withholdingExempt ?? false,
    })
    .eq("id", itemId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/items", "page");
  return { ok: true, data: undefined };
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/items", "page");
  return { ok: true, data: undefined };
}

export type BulkItemRow = {
  row: number;
  name: string;
  unit: string;
  unitPrice: string;
  taxCategory: CreateItemInput["taxCategory"];
};

export async function bulkCreateItems(rows: BulkItemRow[]): Promise<
  ActionResult<{ created: number }>
> {
  if (rows.length > 1000) {
    return { ok: false, error: "一度に登録できるのは1000件までです" };
  }

  const fieldErrors: Record<string, string> = {};
  const payload: CreateItemInput[] = [];

  for (const r of rows) {
    const parsed = createItemSchema.safeParse({
      name: r.name,
      unit: r.unit,
      unitPrice: r.unitPrice,
      taxCategory: r.taxCategory,
    });
    if (!parsed.success) {
      for (const [field, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        fieldErrors[`${r.row}.${field}`] = msgs?.[0] ?? "Invalid";
      }
    } else {
      payload.push(parsed.data);
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "CSVの内容を確認してください", fieldErrors };
  }

  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const insertRows = payload.map((p) => ({
    organization_id: org.organization_id,
    name: p.name,
    unit: p.unit ?? null,
    unit_price: p.unitPrice,
    tax_category: p.taxCategory,
    withholding_exempt: p.withholdingExempt ?? false,
  }));

  const { error } = await supabase.from("items").insert(insertRows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/items", "page");
  return { ok: true, data: { created: insertRows.length } };
}
