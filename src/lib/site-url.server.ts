import "server-only";

import { headers } from "next/headers";

/** Strip trailing slash from a site origin or URL base. */
function normalizeOrigin(url: string) {
  return url.replace(/\/$/, "");
}

/**
 * Server actions / routes: derive origin from the incoming request (Vercel forwards host/proto).
 */
export async function getServerSiteUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (host) {
    const proto =
      headerList.get("x-forwarded-proto") ??
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host.split(",")[0]?.trim()}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) {
    return normalizeOrigin(fromEnv);
  }

  return "http://localhost:3000";
}
