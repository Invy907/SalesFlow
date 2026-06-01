"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function saveCompanyProfile(data: {
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  companyNameLine1?: string;
  companyNameLine2?: string;
  companyNameLine3?: string;
  tel?: string;
  fax?: string;
  email?: string;
  invoiceRegistrationNumber?: string;
  representativeName?: string;
}): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { error } = await supabase
    .from("company_profiles")
    .update({
      postal_code: data.postalCode ?? null,
      address_line1: data.addressLine1 ?? null,
      address_line2: data.addressLine2 ?? null,
      address_line3: data.addressLine3 ?? null,
      company_name_line1: data.companyNameLine1 ?? null,
      company_name_line2: data.companyNameLine2 ?? null,
      company_name_line3: data.companyNameLine3 ?? null,
      tel: data.tel ?? null,
      fax: data.fax ?? null,
      email: data.email ?? null,
      invoice_registration_number: data.invoiceRegistrationNumber ?? null,
      representative_name: data.representativeName ?? null,
    })
    .eq("organization_id", org.organization_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/settings/company", "page");
  return { ok: true, data: undefined };
}

export async function uploadCompanyLogo(
  orgId: string,
  file: File,
): Promise<ActionResult<string>> {
  const supabase = await getSupabaseServerClient();
  const ext = file.name.split(".").pop();
  const path = `${orgId}/logo-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("org-logos")
    .upload(path, file, { upsert: true });

  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data: { publicUrl } } = supabase.storage.from("org-logos").getPublicUrl(path);

  await supabase
    .from("company_profiles")
    .update({ logo_path: path })
    .eq("organization_id", orgId);

  revalidatePath("/[lang]/settings/company", "page");
  return { ok: true, data: publicUrl };
}

export async function updateDisplaySettings(
  orgId: string,
  data: { listPageSize?: number; homePageAfterLogin?: string },
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("display_settings")
    .update({
      list_page_size: data.listPageSize,
      home_page_after_login: data.homePageAfterLogin,
    })
    .eq("organization_id", orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/settings/display", "page");
  return { ok: true, data: undefined };
}

export async function createBankAccount(
  orgId: string,
  data: {
    bankName: string;
    branchName: string;
    accountType: "futsu" | "touza" | "chochiku";
    accountNumber: string;
    accountHolder: string;
    displayOrder: number;
  },
): Promise<ActionResult<string>> {
  const supabase = await getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("bank_accounts")
    .insert({
      organization_id: orgId,
      bank_name: data.bankName,
      branch_name: data.branchName,
      account_type: data.accountType,
      account_number: data.accountNumber,
      account_holder: data.accountHolder,
      display_order: data.displayOrder,
    })
    .select("id")
    .single();

  if (error || !row) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidatePath("/[lang]/settings/payment", "page");
  return { ok: true, data: row.id };
}
