import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getOrders(
  orgId: string,
  opts: {
    statusId?: string;
    clientId?: string;
    trashed?: boolean;
    query?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const supabase = await getSupabaseServerClient();
  const { statusId, clientId, trashed, query, page = 1, pageSize = 30 } = opts;

  let q = supabase
    .from("orders")
    .select("*, clients(id, name), order_statuses(id, name, color)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("order_date", { ascending: false });

  q = trashed ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

  if (statusId) q = q.eq("status_id", statusId);
  if (clientId) q = q.eq("client_id", clientId);
  if (query) q = q.or(`order_number.ilike.%${query}%,subject.ilike.%${query}%`);

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { orders: data ?? [], total: count ?? 0 };
}

export async function getOrderById(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, clients(id, name), order_statuses(id, name, color), order_line_items(*)")
    .eq("id", id)
    .order("line_no", { referencedTable: "order_line_items", ascending: true })
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
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

/** 상태 사이드바 배지용. status_id → 건수. 휴지통은 별도 키. */
export async function getOrderCounts(orgId: string) {
  const supabase = await getSupabaseServerClient();

  const [live, trashed] = await Promise.all([
    supabase
      .from("orders")
      .select("status_id")
      .eq("organization_id", orgId)
      .is("deleted_at", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .not("deleted_at", "is", null),
  ]);

  if (live.error) throw new Error(live.error.message);
  if (trashed.error) throw new Error(trashed.error.message);

  const byStatus: Record<string, number> = {};
  for (const row of live.data ?? []) {
    const key = (row.status_id as string | null) ?? "__none__";
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }

  return { byStatus, trashed: trashed.count ?? 0 };
}
