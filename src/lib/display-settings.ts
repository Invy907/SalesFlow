/**
 * 表示設定 (display_settings) の共有ロジック。
 * 一覧の表示件数とログイン直後に開くページはDBに保存され、値の候補は
 * 0031_display_settings_home_page.sql の check 制約と一致させる (依頼3)。
 */

export const LIST_PAGE_SIZES = [30, 50, 100] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];
export const DEFAULT_LIST_PAGE_SIZE: ListPageSize = 30;

export const HOME_PAGE_KEYS = [
  "home",
  "estimates",
  "invoices",
  "delivery_notes",
  "receipts",
  "orders",
  "reports",
  "inbox",
  "clients",
  "items",
] as const;
export type HomePageKey = (typeof HOME_PAGE_KEYS)[number];
export const DEFAULT_HOME_PAGE: HomePageKey = "home";

/** ホームは `/{lang}` 自身なので空文字。 */
const HOME_PAGE_SUFFIX: Record<HomePageKey, string> = {
  home: "",
  estimates: "/estimates",
  invoices: "/invoices",
  delivery_notes: "/delivery-notes",
  receipts: "/receipts",
  orders: "/orders",
  reports: "/reports",
  inbox: "/inbox",
  clients: "/clients",
  items: "/items",
};

export function normalizeListPageSize(value: unknown): ListPageSize {
  const size = Number(value);
  return (LIST_PAGE_SIZES as readonly number[]).includes(size)
    ? (size as ListPageSize)
    : DEFAULT_LIST_PAGE_SIZE;
}

export function normalizeHomePage(value: unknown): HomePageKey {
  return (HOME_PAGE_KEYS as readonly string[]).includes(String(value))
    ? (value as HomePageKey)
    : DEFAULT_HOME_PAGE;
}

export function homePagePath(lang: string, key: HomePageKey): string {
  return `/${lang}${HOME_PAGE_SUFFIX[key]}`;
}
