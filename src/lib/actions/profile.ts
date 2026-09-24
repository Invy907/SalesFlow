"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function updateDisplayName(name: string): Promise<{ ok: boolean }> {
  const displayName = typeof name === "string" ? name.trim() : "";
  if (!displayName || displayName.length > 100) return { ok: false };
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data, error } = await supabase.from("profiles")
    .update({ display_name: displayName }).eq("id", user.id).select("id").single();
  if (error || !data) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}
