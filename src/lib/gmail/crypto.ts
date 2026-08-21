import "server-only";

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function encryptionKey(): Buffer {
  const raw = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + 16);
  const encrypted = buf.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function signOAuthState(payload: string): string {
  const secret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyOAuthState(payload: string, signature: string): boolean {
  const expected = signOAuthState(payload);
  return expected === signature;
}
