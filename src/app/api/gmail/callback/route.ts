import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { encryptTokens, exchangeGmailCode, parseOAuthState } from "@/lib/gmail/oauth";
import { syncGmailConnection } from "@/lib/gmail/sync";
import type { GmailConnectionRow } from "@/lib/gmail/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/ja/inbox?gmail_error=${encodeURIComponent(oauthError)}`, origin),
    );
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/ja/inbox?gmail_error=missing_code", origin));
  }

  const state = parseOAuthState(stateRaw);
  if (!state) {
    return NextResponse.redirect(new URL("/ja/inbox?gmail_error=invalid_state", origin));
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state.userId) {
    return NextResponse.redirect(new URL(`/${state.lang}/auth/sign-in`, origin));
  }

  try {
    const tokens = await exchangeGmailCode(origin, code);
    const enc = encryptTokens(tokens.refreshToken, tokens.accessToken);
    const admin = createSupabaseAdminClient();

    const { data: connection, error } = await admin
      .from("gmail_connections")
      .upsert(
        {
          organization_id: state.orgId,
          connected_by: state.userId,
          google_email: tokens.googleEmail,
          refresh_token_enc: enc.refreshTokenEnc,
          access_token_enc: enc.accessTokenEnc,
          token_expires_at: tokens.expiresAt,
          history_id: tokens.historyId,
          revoked_at: null,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      )
      .select("*")
      .single();

    if (error || !connection) {
      throw new Error(error?.message ?? "Failed to save Gmail connection");
    }

    await syncGmailConnection(connection as GmailConnectionRow, origin);

    return NextResponse.redirect(new URL(`/${state.lang}/inbox?connected=1`, origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail connection failed";
    return NextResponse.redirect(
      new URL(`/${state.lang}/inbox?gmail_error=${encodeURIComponent(message)}`, origin),
    );
  }
}
