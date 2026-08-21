import "server-only";

import { google } from "googleapis";
import { encryptSecret, signOAuthState, verifyOAuthState } from "./crypto";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export type GmailOAuthState = {
  orgId: string;
  userId: string;
  lang: string;
  exp: number;
};

function gmailClientConfig() {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Gmail OAuth credentials are not configured");
  }
  return { clientId, clientSecret };
}

export function getGmailRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/gmail/callback`;
}

export function createOAuth2Client(redirectUri: string) {
  const { clientId, clientSecret } = gmailClientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGmailConnectUrl(origin: string, state: GmailOAuthState) {
  const redirectUri = getGmailRedirectUri(origin);
  const oauth2 = createOAuth2Client(redirectUri);
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = signOAuthState(payload);
  const oauthState = `${payload}.${signature}`;
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE],
    state: oauthState,
  });
}

export function parseOAuthState(raw: string): GmailOAuthState | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !verifyOAuthState(payload, signature)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GmailOAuthState;
    if (!state.orgId || !state.userId || !state.lang || !state.exp) return null;
    if (Date.now() > state.exp) return null;
    return state;
  } catch {
    return null;
  }
}

export async function exchangeGmailCode(origin: string, code: string) {
  const redirectUri = getGmailRedirectUri(origin);
  const oauth2 = createOAuth2Client(redirectUri);
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Try disconnecting and reconnecting.");
  }
  oauth2.setCredentials(tokens);
  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const email = profile.data.emailAddress;
  if (!email) throw new Error("Could not read Gmail profile email");

  return {
    googleEmail: email,
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    historyId: profile.data.historyId ?? null,
  };
}

export function encryptTokens(refreshToken: string, accessToken: string | null) {
  return {
    refreshTokenEnc: encryptSecret(refreshToken),
    accessTokenEnc: accessToken ? encryptSecret(accessToken) : null,
  };
}
