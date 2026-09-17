import { requireActiveOrg } from "@/lib/guards";
import { getDisplaySettings } from "@/lib/db/company";
import { normalizeHomePage, normalizeListPageSize } from "@/lib/display-settings";
import { DisplayFormClient } from "./display-form-client";

export const dynamic = "force-dynamic";

export default async function SettingsDisplayPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const settings = await getDisplaySettings(scope.orgId);

  return (
    <DisplayFormClient
      initial={{
        listPageSize: normalizeListPageSize(settings?.list_page_size),
        homePageAfterLogin: normalizeHomePage(settings?.home_page_after_login),
      }}
    />
  );
}
