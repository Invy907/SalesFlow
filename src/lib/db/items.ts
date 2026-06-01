import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getItems(
  orgId: string,
  opts: { query?: string; page?: number; pageSize?: number } = {},
) {
  const supabase = await getSupabaseServerClient();
  const { query, page = 1, pageSize = 30 } = opts;

  let q = supabase
    .from("items")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (query) q = q.ilike("name", `%${query}%`);

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { items: data ?? [], total: count ?? 0 };
}
