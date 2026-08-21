import "server-only";

import type { gmail_v1 } from "googleapis";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "./crypto";
import { getGmailClientForConnection, type GmailConnectionRow } from "./client";

const MAX_BODY_CHARS = 50_000;

type ParsedAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

type ParsedMessage = {
  gmailMessageId: string;
  gmailThreadId: string;
  subject: string;
  from: string;
  body: string;
  receivedAt: string;
  attachments: ParsedAttachment[];
};

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMessagePayload(
  message: gmail_v1.Schema$Message,
): ParsedMessage | null {
  if (!message.id) return null;
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

  let plainBody = "";
  let htmlBody = "";
  const attachments: ParsedAttachment[] = [];

  function walkParts(parts: gmail_v1.Schema$MessagePart[] | undefined) {
    if (!parts) return;
    for (const part of parts) {
      const filename = part.filename ?? "";
      if (part.body?.attachmentId && filename) {
        attachments.push({
          id: part.body.attachmentId,
          filename,
          mimeType: part.mimeType ?? "application/octet-stream",
          size: part.body.size ?? 0,
        });
      }
      if (part.mimeType === "text/plain" && part.body?.data && !plainBody) {
        plainBody = decodeBase64Url(part.body.data);
      }
      if (part.mimeType === "text/html" && part.body?.data && !htmlBody) {
        htmlBody = decodeBase64Url(part.body.data);
      }
      if (part.parts?.length) walkParts(part.parts);
    }
  }

  walkParts(message.payload?.parts);
  if (!plainBody && message.payload?.body?.data) {
    plainBody = decodeBase64Url(message.payload.body.data);
  }

  const body = (plainBody || stripHtml(htmlBody) || message.snippet || "").slice(
    0,
    MAX_BODY_CHARS,
  );
  const internalDate = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString();

  return {
    gmailMessageId: message.id,
    gmailThreadId: message.threadId ?? message.id,
    subject: getHeader("Subject"),
    from: getHeader("From"),
    body,
    receivedAt: internalDate,
    attachments,
  };
}

async function fetchAndStoreMessage(
  gmail: gmail_v1.Gmail,
  orgId: string,
  messageId: string,
  admin: ReturnType<typeof createSupabaseAdminClient>,
) {
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  const parsed = parseMessagePayload(res.data);
  if (!parsed) return;

  const { error } = await admin.from("inbox_messages").insert({
    organization_id: orgId,
    kind: "received_document",
    subject: parsed.subject || null,
    body: parsed.body || null,
    payload: {
      source: "gmail",
      gmailMessageId: parsed.gmailMessageId,
      gmailThreadId: parsed.gmailThreadId,
      from: parsed.from,
      attachments: parsed.attachments,
    },
    created_at: parsed.receivedAt,
  });

  if (error && !error.message.includes("duplicate") && error.code !== "23505") {
    throw new Error(error.message);
  }
}

async function listRecentMessageIds(gmail: gmail_v1.Gmail) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      q: "newer_than:30d",
      maxResults: 50,
      pageToken,
    });
    for (const m of res.data.messages ?? []) {
      if (m.id) ids.push(m.id);
    }
    pageToken = res.data.nextPageToken ?? undefined;
    if (ids.length >= 100) break;
  } while (pageToken);
  return ids;
}

async function collectHistoryMessageIds(
  gmail: gmail_v1.Gmail,
  startHistoryId: string,
) {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      pageToken,
    });
    for (const entry of res.data.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        if (added.message?.id) ids.add(added.message.id);
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return [...ids];
}

export async function syncGmailConnection(
  connection: GmailConnectionRow,
  origin: string,
): Promise<{ imported: number; error?: string }> {
  const admin = createSupabaseAdminClient();
  let imported = 0;

  const persistTokens = async (accessToken: string, expiresAt: string | null) => {
    await admin
      .from("gmail_connections")
      .update({
        access_token_enc: encryptSecret(accessToken),
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  };

  try {
    const gmail = await getGmailClientForConnection(connection, origin, persistTokens);
    const profile = await gmail.users.getProfile({ userId: "me" });
    const currentHistoryId = profile.data.historyId ?? null;

    let messageIds: string[] = [];
    if (connection.history_id) {
      try {
        messageIds = await collectHistoryMessageIds(gmail, connection.history_id);
      } catch {
        messageIds = await listRecentMessageIds(gmail);
      }
    } else {
      messageIds = await listRecentMessageIds(gmail);
    }

    for (const messageId of messageIds) {
      const before = imported;
      await fetchAndStoreMessage(gmail, connection.organization_id, messageId, admin);
      imported += 1;
      if (imported === before) {
        // duplicate skipped — still count as processed
      }
    }

    await admin
      .from("gmail_connections")
      .update({
        history_id: currentHistoryId,
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return { imported: messageIds.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail sync failed";
    await admin
      .from("gmail_connections")
      .update({
        last_sync_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    return { imported, error: message };
  }
}

export async function syncAllGmailConnections(origin: string) {
  const admin = createSupabaseAdminClient();
  const { data: connections, error } = await admin
    .from("gmail_connections")
    .select("*")
    .is("revoked_at", null);

  if (error) throw new Error(error.message);

  const results = [];
  for (const row of connections ?? []) {
    results.push(await syncGmailConnection(row as GmailConnectionRow, origin));
  }
  return results;
}

export async function fetchGmailAttachment(
  connection: GmailConnectionRow,
  origin: string,
  gmailMessageId: string,
  attachmentId: string,
) {
  const gmail = await getGmailClientForConnection(connection, origin);
  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId: gmailMessageId,
    id: attachmentId,
  });
  if (!res.data.data) throw new Error("Attachment not found");
  const normalized = res.data.data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}
