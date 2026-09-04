import "server-only";

import { randomUUID } from "crypto";
import { getGmailClientForConnection, type GmailConnectionRow } from "./client";

/**
 * Gmail 발신.
 * 수신(sync.ts)과 달리 users.messages.send 를 쓰며 gmail.send 스코프가 필요하다.
 *
 * 평문만 보내면 스팸 필터가 자동 발송 메일로 보기 쉬워, html 이 있으면
 * 일반 메일 클라이언트와 같은 multipart/alternative 로 조립한다.
 */

export type GmailSendInput = {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  /** 있으면 평문과 함께 multipart/alternative 로 보낸다. */
  html?: string | null;
  /** From 헤더에 쓸 표시 이름. 없으면 계정 이메일만 나간다. */
  fromName?: string | null;
  /** 답장을 받을 주소. 보통 회사 대표 메일. */
  replyTo?: string | null;
  attachment?: {
    filename: string;
    mimeType: string;
    /** Raw file bytes encoded as base64. */
    base64: string;
  } | null;
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

/** 본문은 base64 로 감싸 줄바꿈·비 ASCII 가 깨지지 않게 한다. */
function encodeBodyPart(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
}

export function buildMimeMessage(input: GmailSendInput & { from: string }) {
  const headers = [
    `From: ${encodeAddress(input.from, input.fromName)}`,
    `To: ${input.to.join(", ")}`,
  ];
  if (input.cc?.length) headers.push(`Cc: ${input.cc.join(", ")}`);
  if (input.replyTo) headers.push(`Reply-To: ${input.replyTo}`);
  headers.push(`Subject: ${encodeHeaderWord(input.subject)}`, "MIME-Version: 1.0");

  if (!input.attachment && !input.html) {
    headers.push('Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64");
    return `${headers.join("\r\n")}\r\n\r\n${encodeBodyPart(input.body)}`;
  }

  const alternativeBoundary = `sf_alt_${randomUUID().replace(/-/g, "")}`;

  if (input.attachment) {
    const mixedBoundary = `sf_mix_${randomUUID().replace(/-/g, "")}`;
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    const bodyParts = input.html
      ? [
          `--${mixedBoundary}`,
          `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
          "",
          `--${alternativeBoundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "Content-Transfer-Encoding: base64",
          "",
          encodeBodyPart(input.body),
          `--${alternativeBoundary}`,
          'Content-Type: text/html; charset="UTF-8"',
          "Content-Transfer-Encoding: base64",
          "",
          encodeBodyPart(input.html ?? ""),
          `--${alternativeBoundary}--`,
        ]
      : [
          `--${mixedBoundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "Content-Transfer-Encoding: base64",
          "",
          encodeBodyPart(input.body),
        ];
    const attachmentBase64 = input.attachment.base64.replace(/\s/g, "").replace(/(.{76})/g, "$1\r\n");
    bodyParts.push(
      `--${mixedBoundary}`,
      `Content-Type: ${input.attachment.mimeType || "application/octet-stream"}; name="${encodeHeaderWord(input.attachment.filename)}"`,
      `Content-Disposition: attachment; filename="${encodeHeaderWord(input.attachment.filename)}"`,
      "Content-Transfer-Encoding: base64",
      "",
      attachmentBase64,
      `--${mixedBoundary}--`,
    );
    return `${headers.join("\r\n")}\r\n\r\n${bodyParts.join("\r\n")}`;
  }

  headers.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);

  // 평문을 먼저 두어 HTML 을 못 읽는 클라이언트도 같은 내용을 보게 한다.
  const parts = [
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodeBodyPart(input.body),
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodeBodyPart(input.html ?? ""),
    `--${alternativeBoundary}--`,
  ];

  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
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
