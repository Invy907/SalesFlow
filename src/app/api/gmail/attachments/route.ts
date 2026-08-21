import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { getInboxMessageById } from "@/lib/db/inbox";
import { getGmailConnection } from "@/lib/db/gmail-connections";
import { fetchGmailAttachment } from "@/lib/gmail/sync";
import type { GmailConnectionRow } from "@/lib/gmail/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type InboxPayload = {
  source?: string;
  gmailMessageId?: string;
  attachments?: Array<{ id: string; filename: string; mimeType: string; size: number }>;
};

export async function GET(request: NextRequest) {
  const inboxMessageId = request.nextUrl.searchParams.get("inboxMessageId");
  const attachmentId = request.nextUrl.searchParams.get("attachmentId");

  if (!inboxMessageId || !attachmentId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await getActiveOrganization();
  if (!org) {
    return NextResponse.json({ error: "No active organization" }, { status: 403 });
  }

  const message = await getInboxMessageById(org.organization_id, inboxMessageId);
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const payload = (message.payload ?? {}) as InboxPayload;
  if (payload.source !== "gmail" || !payload.gmailMessageId) {
    return NextResponse.json({ error: "Not a Gmail message" }, { status: 400 });
  }

  const attachment = payload.attachments?.find((a) => a.id === attachmentId);
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const summary = await getGmailConnection(org.organization_id);
  if (!summary) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: connection, error } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("id", summary.id)
    .maybeSingle();

  if (error || !connection) {
    return NextResponse.json({ error: "Gmail connection not found" }, { status: 404 });
  }

  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
    const buffer = await fetchGmailAttachment(
      connection as GmailConnectionRow,
      origin,
      payload.gmailMessageId,
      attachmentId,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
