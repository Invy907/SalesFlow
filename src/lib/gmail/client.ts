import "server-only";

import { google } from "googleapis";
import { decryptSecret } from "./crypto";
import { createOAuth2Client, getGmailRedirectUri } from "./oauth";

export type GmailConnectionRow = {
  id: string;
  organization_id: string;
  connected_by: string;
  google_email: string;
  refresh_token_enc: string;
  access_token_enc: string | null;
  token_expires_at: string | null;
  history_id: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  scopes: string[] | null;
  last_send_at: string | null;
  last_send_error: string | null;
  revoked_at: string | null;
};

export async function getGmailClientForConnection(
  connection: GmailConnectionRow,
  origin: string,
  onTokenRefresh?: (accessToken: string, expiresAt: string | null) => Promise<void>,
) {
  const oauth2 = createOAuth2Client(getGmailRedirectUri(origin));
  const refreshToken = decryptSecret(connection.refresh_token_enc);
  oauth2.setCredentials({ refresh_token: refreshToken });

  if (connection.access_token_enc && connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at).getTime();
    if (expiresAt > Date.now() + 60_000) {
      oauth2.setCredentials({
        refresh_token: refreshToken,
        access_token: decryptSecret(connection.access_token_enc),
        expiry_date: expiresAt,
      });
    }
  }

  oauth2.on("tokens", (tokens) => {
    if (tokens.access_token && onTokenRefresh) {
      void onTokenRefresh(
        tokens.access_token,
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      );
    }
  });

  const { credentials } = await oauth2.refreshAccessToken();
  oauth2.setCredentials(credentials);

  return google.gmail({ version: "v1", auth: oauth2 });
}
