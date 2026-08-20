import { requireActiveOrg } from "@/lib/guards";
import { getDashboard } from "@/lib/db/dashboard";
import { HomeClient } from "./home-client";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const dashboard = await getDashboard(scope.orgId);

  return <HomeClient dashboard={dashboard} />;
}
