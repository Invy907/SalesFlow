import { redirect } from "next/navigation";
import { getActiveOrganization } from "@/lib/db/organizations";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ActiveOrgScope = {
  orgId: string;
  role: string;
  userId: string;
};

/** RSC 페이지에서 org 스코프 확보. 미로그인 → sign-in, org 없음 → home. */
export async function requireActiveOrg(lang: string): Promise<ActiveOrgScope> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${lang}/auth/sign-in`);

  const org = await getActiveOrganization();
  if (!org) redirect(`/${lang}`);

  return {
    orgId: org.organization_id,
    role: org.role,
    userId: user.id,
  };
}
