import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization, getUserOrganizations } from "@/lib/db/organizations";

export type ShellProfile = {
  name: string;
  email: string;
  initials: string;
};

export type ShellOrganization = {
  id: string;
  name: string;
};

function initialsFrom(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= +2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email.slice(0, 2) || "??").toUpperCase();
}

/** Shell 프로필·조직 컨텍스트 (RSC에서 SalesFlowShell에 전달). */
export async function getShellSession(): Promise<{
  profile: ShellProfile | null;
  organizations: ShellOrganization[];
  activeOrgId: string | null;
}> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, organizations: [], activeOrgId: null };
  }

  const [{ data: profileRow }, memberships, active] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    getUserOrganizations(),
    getActiveOrganization(),
  ]);

  const email = profileRow?.email ?? user.email ?? "";
  const name = profileRow?.display_name?.trim() || email.split("@")[0] || "User";

  const organizations: ShellOrganization[] = memberships
    .map((m) => {
      const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
      if (!org || typeof org !== "object" || !("id" in org)) return null;
      return { id: String(org.id), name: String(org.name ?? "Organization") };
    })
    .filter((o): o is ShellOrganization => o !== null);

  return {
    profile: {
      name,
      email,
      initials: initialsFrom(name, email),
    },
    organizations,
    activeOrgId: active?.organization_id ?? organizations[0]?.id ?? null,
  };
}
