import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getOrders(
  orgId: string,
  opts: { statusId?: string; clientId?: string; page?: number; pageSize?: number } = {},
) {
  const supabase = await getSupabaseServerClient();
  const { statusId, clientId, page = 1, pageSize = 30 } = opts;

  let q = supabase
    .from("orders")
    .select("*, clients(id, name), order_statuses(id, name, color)", { count: "exact" })
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("order_date", { ascending: false });

  if (statusId) q = q.eq("status_id", statusId);
  if (clientId) q = q.eq("client_id", clientId);

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { orders: data ?? [], total: count ?? 0 };
}

export async function getOrderStatuses(orgId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("order_statuses")
    .select("*")
    .eq("organization_id", orgId)
    .order("display_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
