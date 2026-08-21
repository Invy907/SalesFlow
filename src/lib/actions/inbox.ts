"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/db/organizations";
import { getGmailConnection } from "@/lib/db/gmail-connections";
import { syncGmailConnection } from "@/lib/gmail/sync";
import type { GmailConnectionRow } from "@/lib/gmail/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function siteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

async function requireScope() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false as const, error: "No active organization" };

  return { ok: true as const, orgId: org.organization_id, userId: user.id };
}

export async function markInboxRead(messageId: string): Promise<ActionResult> {
  const scope = await requireScope();
  if (!scope.ok) return scope;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("inbox_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("organization_id", scope.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/inbox", "page");
  return { ok: true, data: undefined };
}

export async function markAllInboxRead(): Promise<ActionResult> {
  const scope = await requireScope();
  if (!scope.ok) return scope;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("inbox_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", scope.orgId)
    .is("read_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/inbox", "page");
  return { ok: true, data: undefined };
}

export async function disconnectGmail(): Promise<ActionResult> {
  const scope = await requireScope();
  if (!scope.ok) return scope;

  const connection = await getGmailConnection(scope.orgId);
  if (!connection) return { ok: true, data: undefined };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("gmail_connections")
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/inbox", "page");
  return { ok: true, data: undefined };
}

export async function syncGmailNow(): Promise<ActionResult<{ imported: number }>> {
  const scope = await requireScope();
  if (!scope.ok) return scope;

  const summary = await getGmailConnection(scope.orgId);
  if (!summary) return { ok: false, error: "Gmail is not connected" };

  const admin = createSupabaseAdminClient();
  const { data: connection, error } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("id", summary.id)
    .maybeSingle();

  if (error || !connection) {
    return { ok: false, error: error?.message ?? "Connection not found" };
  }

  const result = await syncGmailConnection(connection as GmailConnectionRow, siteOrigin());
  if (result.error) return { ok: false, error: result.error };

  revalidatePath("/[lang]/inbox", "page");
  return { ok: true, data: { imported: result.imported } };
}
