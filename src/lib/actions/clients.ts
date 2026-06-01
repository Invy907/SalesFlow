"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createClientSchema, type CreateClientInput } from "@/lib/validators/client";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createClient(input: CreateClientInput): Promise<ActionResult<string>> {
  const parsed = createClientSchema.safeParse(input);
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
    .from("clients")
    .insert({
      organization_id: org.organization_id,
      name: parsed.data.name,
      furigana: parsed.data.furigana ?? null,
      corp_number: parsed.data.corpNumber ?? null,
      management_code: parsed.data.managementCode ?? null,
      department: parsed.data.department ?? null,
      email: parsed.data.email || null,
      email_cc: parsed.data.emailCc ?? null,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      honorific: parsed.data.honorific ?? null,
      memo: parsed.data.memo ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };

  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: data.id };
}

export async function updateClient(
  clientId: string,
  input: Partial<CreateClientInput>,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name: input.name,
      furigana: input.furigana ?? null,
      corp_number: input.corpNumber ?? null,
      management_code: input.managementCode ?? null,
      department: input.department ?? null,
      email: input.email || null,
      email_cc: input.emailCc ?? null,
      phone: input.phone ?? null,
      fax: input.fax ?? null,
      honorific: input.honorific ?? null,
      memo: input.memo ?? null,
    })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: undefined };
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: undefined };
}

export async function toggleFavorite(
  clientId: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_favorite: isFavorite })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: undefined };
}
