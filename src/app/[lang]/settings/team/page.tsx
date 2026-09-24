import { requireActiveOrg } from "@/lib/guards";
import { getOrgMembers } from "@/lib/db/organizations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TeamClient } from "./team-client";

export default async function SettingsTeamPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const members = await getOrgMembers(scope.orgId);
  const supabase = await getSupabaseServerClient();
  const { data: profiles, error } = await supabase.from("profiles").select("id, email, display_name").in("id", members.map((member) => member.user_id));
  if (error) throw new Error(error.message);
  return <TeamClient members={members.map((member) => {
    const profile = profiles?.find((profile) => profile.id === member.user_id);
    return { id: member.user_id, role: member.role, name: profile?.display_name ?? "", email: profile?.email ?? "", self: member.user_id === scope.userId };
  })} />;
}
