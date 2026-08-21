import { randomBytes } from "crypto";

/** Default share link validity in days (matches share_tokens.expires_at). */
export const SHARE_DEFAULT_DAYS = 30;

export function newShareToken() {
  return randomBytes(32).toString("hex");
}

export function shareExpiryFromNow(days = SHARE_DEFAULT_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
