export const APP_LOCALES = ["ja", "ko", "en"] as const;
export const DEFAULT_LOCALE = "ja";
export const LOCALE_COOKIE_NAME = "salesflow-lang";

export type AppLocaleCode = (typeof APP_LOCALES)[number];

export function appPath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function isAppLocale(value: string): value is AppLocaleCode {
  return APP_LOCALES.includes(value as AppLocaleCode);
}

export function localizedRequestUrl(requestUrl: string, locale: AppLocaleCode): URL {
  const url = new URL(requestUrl);
  url.pathname = url.pathname === "/" ? `/${locale}` : `/${locale}${url.pathname}`;
  return url;
}
