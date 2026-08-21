import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { buildGmailConnectUrl } from "@/lib/gmail/oauth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") ?? "ja";
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/${lang}/auth/sign-in`, request.url));
  }

  const org = await getActiveOrganization();
  if (!org) {
    return NextResponse.redirect(new URL(`/${lang}`, request.url));
  }

  try {
    const url = buildGmailConnectUrl(request.nextUrl.origin, {
      orgId: org.organization_id,
      userId: user.id,
      lang,
      exp: Date.now() + 10 * 60 * 1000,
    });
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail OAuth is not configured";
    return NextResponse.redirect(
      new URL(`/${lang}/inbox?gmail_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
