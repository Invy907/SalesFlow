import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_NEXT_COOKIE } from "@/lib/site-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function resolveNextPath(request: NextRequest, searchParams: URLSearchParams) {
  const fromQuery = searchParams.get("next");
  if (fromQuery?.startsWith("/")) {
    return fromQuery;
  }

  const fromCookie = request.cookies.get(AUTH_NEXT_COOKIE)?.value;
  if (fromCookie) {
    try {
      const decoded = decodeURIComponent(fromCookie);
      if (decoded.startsWith("/")) {
        return decoded;
      }
    } catch {
      if (fromCookie.startsWith("/")) {
        return fromCookie;
      }
    }
  }

  return "/ja";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(request, searchParams);

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.delete(AUTH_NEXT_COOKIE);
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}/ja/auth/sign-in?error=callback_error`);
  response.cookies.delete(AUTH_NEXT_COOKIE);
  return response;
}
