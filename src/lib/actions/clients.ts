"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import {
  createClientSchema,
  type ClientDestinationInput,
  type CreateClientInput,
} from "@/lib/validators/client";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function parseEmailCc(value?: string): string[] | null {
  if (!value?.trim()) return null;
  const parts = value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function hasDestinationValue(dest: ClientDestinationInput): boolean {
  return Boolean(
    dest.postalCode?.trim() ||
      dest.addressLine1?.trim() ||
      dest.addressLine2?.trim() ||
      dest.mailingLine1?.trim() ||
      dest.mailingLine2?.trim() ||
      dest.mailingLine3?.trim() ||
      dest.mailingLine4?.trim() ||
      dest.honorific?.trim(),
  );
}

function destinationRow(dest: ClientDestinationInput) {
  return {
    postal_code: dest.postalCode?.trim() || null,
    address_line1: dest.addressLine1?.trim() || null,
    address_line2: dest.addressLine2?.trim() || null,
    mailing_line1: dest.mailingLine1?.trim() || null,
    mailing_line2: dest.mailingLine2?.trim() || null,
    mailing_line3: dest.mailingLine3?.trim() || null,
    mailing_line4: dest.mailingLine4?.trim() || null,
    honorific: dest.honorific?.trim() || null,
  };
}

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
      email_cc: parseEmailCc(parsed.data.emailCc),
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      honorific: parsed.data.honorific ?? null,
      memo: parsed.data.memo ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };

  if (parsed.data.destination && hasDestinationValue(parsed.data.destination)) {
    const { error: destErr } = await supabase.from("client_destinations").insert({
      client_id: data.id,
      is_default: true,
      ...destinationRow(parsed.data.destination),
    });
    if (destErr) {
      await supabase.from("clients").delete().eq("id", data.id);
      return { ok: false, error: destErr.message };
    }
  }

  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: data.id };
}

export async function updateClient(
  clientId: string,
  input: Partial<CreateClientInput>,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.furigana !== undefined) updatePayload.furigana = input.furigana ?? null;
  if (input.corpNumber !== undefined) updatePayload.corp_number = input.corpNumber ?? null;
  if (input.managementCode !== undefined) updatePayload.management_code = input.managementCode ?? null;
  if (input.department !== undefined) updatePayload.department = input.department ?? null;
  if (input.email !== undefined) updatePayload.email = input.email || null;
  if (input.emailCc !== undefined) updatePayload.email_cc = parseEmailCc(input.emailCc);
  if (input.phone !== undefined) updatePayload.phone = input.phone ?? null;
  if (input.fax !== undefined) updatePayload.fax = input.fax ?? null;
  if (input.honorific !== undefined) updatePayload.honorific = input.honorific ?? null;
  if (input.memo !== undefined) updatePayload.memo = input.memo ?? null;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase.from("clients").update(updatePayload as never).eq("id", clientId);
    if (error) return { ok: false, error: error.message };
  }

  if (input.destination) {
    const dest = destinationRow(input.destination);
    const { data: existing } = await supabase
      .from("client_destinations")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_default", true)
      .maybeSingle();

    if (hasDestinationValue(input.destination)) {
      if (existing) {
        const { error: destErr } = await supabase
          .from("client_destinations")
          .update(dest)
          .eq("id", existing.id);
        if (destErr) return { ok: false, error: destErr.message };
      } else {
        const { error: destErr } = await supabase.from("client_destinations").insert({
          client_id: clientId,
          is_default: true,
          ...dest,
        });
        if (destErr) return { ok: false, error: destErr.message };
      }
    }
  }

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
