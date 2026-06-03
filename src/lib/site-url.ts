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

export function buildAuthCallbackUrl(siteOrigin: string, nextPath: string) {
  const base = normalizeOrigin(siteOrigin);
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
