import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncAllGmailConnections } from "@/lib/gmail/sync";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
    const results = await syncAllGmailConnections(origin);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
