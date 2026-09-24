import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  // A POST must redirect with GET, rather than replaying POST at the sign-in page.
  return NextResponse.redirect(`${origin}/auth/sign-in`, 303);
}
