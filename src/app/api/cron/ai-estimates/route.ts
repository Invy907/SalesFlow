import { NextResponse, type NextRequest } from "next/server";
import { processPendingEstimateSources } from "@/lib/ai/estimates/maintenance";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processPendingEstimateSources({ limit: 1, retentionLimit: 10 });
    return NextResponse.json({ ok: result.failed === 0 && result.purgeFailed === 0, ...result });
  } catch {
    return NextResponse.json({ error: "AI estimate maintenance failed" }, { status: 500 });
  }
}
