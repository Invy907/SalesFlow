import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getCompanyProfile(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function getDocumentDefaults(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_defaults")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function getDisplaySettings(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("display_settings")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function getFeatureFlags(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("flags")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data?.flags as Record<string, boolean> | null;
}

export async function getBankAccounts(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .order("display_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
