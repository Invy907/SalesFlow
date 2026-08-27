import "server-only";

import { getGmailClientForConnection, type GmailConnectionRow } from "./client";

/**
 * Gmail 발신.
 * 수신(sync.ts)과 달리 users.messages.send 를 쓰며 gmail.send 스코프가 필요하다.
 * 본문은 UTF-8 평문 한 종류만 보낸다(1차 범위: 공유 링크 안내).
 */

export type GmailSendInput = {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  /** From 헤더에 쓸 표시 이름. 없으면 계정 이메일만 나간다. */
  fromName?: string | null;
};

export class GmailSendScopeError extends Error {
  constructor(message = "GMAIL_SEND_SCOPE_MISSING") {
    super(message);
    this.name = "GmailSendScopeError";
  }
}

function encodeHeaderWord(value: string) {
  // 비 ASCII 헤더는 RFC 2047 로 감싼다. 제목에 한글·일본어가 그대로 들어간다.
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function encodeAddress(email: string, name?: string | null) {
  return name ? `${encodeHeaderWord(name)} <${email}>` : email;
}

export function buildMimeMessage(input: GmailSendInput & { from: string }) {
  const headers = [
    `From: ${encodeAddress(input.from, input.fromName)}`,
    `To: ${input.to.join(", ")}`,
  ];
  if (input.cc?.length) headers.push(`Cc: ${input.cc.join(", ")}`);
  headers.push(
    `Subject: ${encodeHeaderWord(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  );

  // 본문은 base64 로 감싸 줄바꿈·비 ASCII 가 깨지지 않게 한다.
  const body = Buffer.from(input.body, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

function isScopeError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /insufficient/i.test(message) ||
    /ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(message) ||
    /Request had insufficient authentication scopes/i.test(message)
  );
}

export async function sendGmailMessage(
  connection: GmailConnectionRow,
  origin: string,
  input: GmailSendInput,
): Promise<{ id: string; threadId: string | null }> {
  const gmail = await getGmailClientForConnection(connection, origin);
  const raw = Buffer.from(
    buildMimeMessage({ ...input, from: connection.google_email }),
    "utf8",
  ).toString("base64url");

  try {
    const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    return { id: res.data.id ?? "", threadId: res.data.threadId ?? null };
  } catch (err) {
    if (isScopeError(err)) throw new GmailSendScopeError();
    throw err;
  }
}
