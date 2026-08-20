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

export async function uploadCompanySeal(
  orgId: string,
  file: File,
): Promise<ActionResult<string>> {
  const supabase = await getSupabaseServerClient();
  const ext = file.name.split(".").pop();
  const path = `${orgId}/seal-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("org-seals")
    .upload(path, file, { upsert: true });

  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data: { publicUrl } } = supabase.storage.from("org-seals").getPublicUrl(path);

  await supabase
    .from("company_profiles")
    .update({ seal_path: path })
    .eq("organization_id", orgId);

  revalidatePath("/[lang]/settings/company", "page");
  return { ok: true, data: publicUrl };
}

export async function saveDocumentDefaults(data: {
  numberingRule?: string;
  lineItemLabelName?: string;
  lineItemLabelQty?: string;
  lineItemLabelPrice?: string;
  lineItemLabelAmount?: string;
  estimateHeading?: string;
  estimateMessage?: string;
  estimateRemarks?: string;
  deliveryNoteMessage?: string;
  deliveryNoteRemarks?: string;
  invoiceMessage?: string;
  invoiceRemarks?: string;
  receiptMessage?: string;
  receiptRemarks?: string;
  estimateTemplateKey?: string;
  deliveryNoteTemplateKey?: string;
  invoiceTemplateKey?: string;
  receiptTemplateKey?: string;
  taxDisplayDefault?: string;
  taxRoundingDefault?: string;
  withholdingDefault?: string;
}): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { error } = await supabase
    .from("document_defaults")
    .update({
      numbering_rule: data.numberingRule ?? null,
      line_item_label_name: data.lineItemLabelName ?? null,
      line_item_label_qty: data.lineItemLabelQty ?? null,
      line_item_label_price: data.lineItemLabelPrice ?? null,
      line_item_label_amount: data.lineItemLabelAmount ?? null,
      estimate_heading: data.estimateHeading ?? null,
      estimate_message: data.estimateMessage ?? null,
      estimate_remarks: data.estimateRemarks ?? null,
      delivery_note_message: data.deliveryNoteMessage ?? null,
      delivery_note_remarks: data.deliveryNoteRemarks ?? null,
      invoice_message: data.invoiceMessage ?? null,
      invoice_remarks: data.invoiceRemarks ?? null,
      receipt_message: data.receiptMessage ?? null,
      receipt_remarks: data.receiptRemarks ?? null,
      estimate_template_key: data.estimateTemplateKey ?? null,
      delivery_note_template_key: data.deliveryNoteTemplateKey ?? null,
      invoice_template_key: data.invoiceTemplateKey ?? null,
      receipt_template_key: data.receiptTemplateKey ?? null,
      tax_display_default: data.taxDisplayDefault as
        | "separate"
        | "separate_on_invoice"
        | "included"
        | "exempt"
        | undefined,
      tax_rounding_default: data.taxRoundingDefault as
        | "round_down"
        | "round_up"
        | "round_half"
        | undefined,
      withholding_default: data.withholdingDefault as
        | "none"
        | "with_recovery"
        | "without_recovery"
        | undefined,
    })
    .eq("organization_id", org.organization_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/settings/document-defaults", "page");
  return { ok: true, data: undefined };
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

export async function updateBankAccount(
  accountId: string,
  data: {
    bankName?: string;
    branchName?: string;
    accountType?: "futsu" | "touza" | "chochiku";
    accountNumber?: string;
    accountHolder?: string;
    displayOrder?: number;
  },
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("bank_accounts")
    .update({
      bank_name: data.bankName,
      branch_name: data.branchName,
      account_type: data.accountType,
      account_number: data.accountNumber,
      account_holder: data.accountHolder,
      display_order: data.displayOrder,
    })
    .eq("id", accountId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/settings/payment", "page");
  return { ok: true, data: undefined };
}

export async function deleteBankAccount(accountId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("bank_accounts").delete().eq("id", accountId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/settings/payment", "page");
  return { ok: true, data: undefined };
}
