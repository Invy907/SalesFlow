import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_NEXT_COOKIE } from "@/lib/site-url";
import { resolveHomePathAfterLogin } from "@/lib/display-settings.server";
import { isAppLocale } from "@/lib/locale";
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

/**
 * サインイン画面が渡すのはロケール直下(`/ja` など)なので、その場合だけ
 * 表示設定の「最初に開くページ」に差し替える (依頼3)。
 */
function localeRootOf(path: string): string | null {
  const segment = path.replace(/^\/+/, "").split("/")[0] ?? "";
  if (!isAppLocale(segment)) return null;
  return path.replace(/\/+$/, "") === `/${segment}` ? segment : null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(request, searchParams);

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const locale = localeRootOf(next);
      const target = locale ? await resolveHomePathAfterLogin(locale) : next;
      const response = NextResponse.redirect(`${origin}${target}`);
      response.cookies.delete(AUTH_NEXT_COOKIE);
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}/ja/auth/sign-in?error=callback_error`);
  response.cookies.delete(AUTH_NEXT_COOKIE);
  return response;
}
