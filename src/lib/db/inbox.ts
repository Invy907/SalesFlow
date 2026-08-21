import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getInboxMessages(
  orgId: string,
  opts: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
) {
  const supabase = await getSupabaseServerClient();
  const { page = 1, pageSize = 30, unreadOnly } = opts;

  let q = supabase
    .from("inbox_messages")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (unreadOnly) q = q.is("read_at", null);

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { messages: data ?? [], total: count ?? 0 };
}

export async function getInboxMessageById(orgId: string, messageId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getInboxUnreadCount(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase
    .from("inbox_messages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
