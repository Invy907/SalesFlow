import { getDisplaySettings } from "@/lib/db/company";
import {
  DEFAULT_LIST_PAGE_SIZE,
  homePagePath,
  normalizeHomePage,
  normalizeListPageSize,
  type ListPageSize,
} from "@/lib/display-settings";
import { getActiveOrganization } from "@/lib/db/organizations";

/** 一覧の1ページあたり件数。設定が読めないときは既定値で表示を続ける。 */
export async function getListPageSize(orgId: string): Promise<ListPageSize> {
  try {
    const settings = await getDisplaySettings(orgId);
    return normalizeListPageSize(settings?.list_page_size);
  } catch {
    return DEFAULT_LIST_PAGE_SIZE;
  }
}

/** ログイン直後に開くページ。組織や設定が取れないときはホーム。 */
export async function resolveHomePathAfterLogin(lang: string): Promise<string> {
  try {
    const org = await getActiveOrganization();
    if (!org) return `/${lang}`;
    const settings = await getDisplaySettings(org.organization_id);
    return homePagePath(lang, normalizeHomePage(settings?.home_page_after_login));
  } catch {
    return `/${lang}`;
  }
}
