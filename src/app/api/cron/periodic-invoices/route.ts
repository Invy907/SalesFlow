import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runDuePeriodicSchedules } from "@/lib/periodic/run-due-schedules";

/**
 * Periodic invoice run. vercel.json calls this once a day (09:30 JST).
 * Protected with the same CRON_SECRET bearer as gmail-sync.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
    const results = await runDuePeriodicSchedules(origin);
    const generated = results.filter((r) => r.ok).length;
    const failed = results.length - generated;
    return NextResponse.json({ ok: true, generated, failed, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Periodic cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
