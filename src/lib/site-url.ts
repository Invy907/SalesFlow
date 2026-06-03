/** Cookie used when OAuth redirect URL must match Supabase allow-list exactly (no query string). */
export const AUTH_NEXT_COOKIE = "sf_auth_next";

/** Strip trailing slash from a site origin or URL base. */
function normalizeOrigin(url: string) {
  return url.replace(/\/$/, "");
}

/**
 * Browser-only: always use the page the user is on (fixes Vercel OAuth jumping to localhost
 * when NEXT_PUBLIC_SITE_URL was baked in at build time).
 */
export function getClientSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? "");
}

/** OAuth redirect URL without query params (Supabase allow-list is often exact-match). */
export function buildOAuthCallbackUrl(siteOrigin: string) {
  return `${normalizeOrigin(siteOrigin)}/auth/callback`;
}

/** Email / password-reset links may include ?next= — add `https://your-app/**` in Supabase Redirect URLs. */
export function buildAuthCallbackUrl(siteOrigin: string, nextPath: string) {
  const base = normalizeOrigin(siteOrigin);
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Store post-login path before OAuth (read in /auth/callback). */
export function setAuthNextPathCookie(nextPath: string) {
  if (typeof document === "undefined") return;
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax${secure}`;
}
