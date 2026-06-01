import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isAppLocale,
} from "@/lib/locale";
import { updateSession } from "@/lib/supabase/middleware";

// Matches /ja, /ja/anything — but NOT /ja/auth/...
const PROTECTED_PREFIX_RE = /^\/(?:ja|en|ko)(\/(?!auth).*)?$/;

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

export async function proxy(request: NextRequest) {
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

  const rewriteResponse = NextResponse.rewrite(new URL(localizedPath, request.url));

  // Refresh Supabase session on every request
  const { response, user } = await updateSession(request, rewriteResponse);

  // Redirect unauthenticated users from protected routes to sign-in
  if (PROTECTED_PREFIX_RE.test(localizedPath) && !user) {
    const signInUrl = request.nextUrl.clone();
    // Use locale-less path so the proxy doesn't double-redirect
    signInUrl.pathname = "/auth/sign-in";
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      locale: false,
    },
  ],
};
