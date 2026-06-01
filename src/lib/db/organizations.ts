import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/** 현재 로그인 유저가 속한 조직 목록 */
export async function getUserOrganizations() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organizations(*), role")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** 쿠키 `salesflow-active-org`에서 활성 org 가져오기, 없으면 첫 멤버십 org */
export async function getActiveOrganization() {
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("salesflow-active-org")?.value;

  const supabase = await getSupabaseServerClient();
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, plan, slug)")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!memberships || memberships.length === 0) return null;

  const active = activeOrgId
    ? memberships.find((m) => m.organization_id === activeOrgId)
    : null;

  return active ?? memberships[0];
}

/** 조직 멤버 목록 */
export async function getOrgMembers(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*, profiles(id, email, display_name, avatar_url)")
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);
  return data ?? [];
}
