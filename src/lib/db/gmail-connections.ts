import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasGmailSendScope } from "@/lib/gmail/oauth";

export type GmailConnectionSummary = {
  id: string;
  googleEmail: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  connectedBy: string;
  /** Has the gmail.send scope. Without it the periodic automatic email is skipped. */
  canSend: boolean;
  lastSendError: string | null;
};

export async function getGmailConnection(orgId: string): Promise<GmailConnectionSummary | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gmail_connections")
    .select("id, google_email, last_sync_at, last_sync_error, connected_by, scopes, last_send_error")
    .eq("organization_id", orgId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    googleEmail: data.google_email as string,
    lastSyncAt: (data.last_sync_at as string | null) ?? null,
    lastSyncError: (data.last_sync_error as string | null) ?? null,
    connectedBy: data.connected_by as string,
    canSend: hasGmailSendScope(data.scopes as string[] | null),
    lastSendError: (data.last_send_error as string | null) ?? null,
  };
}

export async function getGmailConnectionById(connectionId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("id", connectionId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
