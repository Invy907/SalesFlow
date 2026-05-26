import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isAppLocale,
} from "@/lib/locale";

function getPreferredLocale(request: NextRequest) {
  const header = request.headers.get("accept-language");

  if (!header) {
    return DEFAULT_LOCALE;
  }

  const accepted = header
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const language of accepted) {
    const exactMatch = APP_LOCALES.find((locale) => locale === language);

    if (exactMatch) {
      return exactMatch;
    }

    const baseLanguage = language.split("-")[0];
    const baseMatch = APP_LOCALES.find((locale) => locale === baseLanguage);

    if (baseMatch) {
      return baseMatch;
    }
  }

  return DEFAULT_LOCALE;
}

function getLocaleFromRequest(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale && isAppLocale(cookieLocale)) {
    return cookieLocale;
  }

  return getPreferredLocale(request);
}

function buildLocalizedPath(pathname: string, locale: string) {
  if (pathname === "/") {
    return `/${locale}`;
  }

  return `/${locale}${pathname}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js serve public/static assets as-is.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  for (const locale of APP_LOCALES) {
    if (pathname === `/${locale}`) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith(`/${locale}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice(`/${locale}`.length) || "/";
      return NextResponse.redirect(url);
    }
  }

  const locale = getLocaleFromRequest(request);
  const localizedPath = buildLocalizedPath(pathname, locale);

  return NextResponse.rewrite(new URL(localizedPath, request.url));
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      locale: false,
    },
  ],
};
