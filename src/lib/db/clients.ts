import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface ClientFilter {
  query?: string;
  favoritesOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getClients(orgId: string, filter: ClientFilter = {}) {
  const supabase = await getSupabaseServerClient();
  const { query, favoritesOnly, page = 1, pageSize = 30 } = filter;

  let q = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("furigana", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (query) q = q.ilike("name", `%${query}%`);
  if (favoritesOnly) q = q.eq("is_favorite", true);

  const from = (page - 1) * pageSize;
  q = q.range(from, from + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { clients: data ?? [], total: count ?? 0 };
}

export async function getClientById(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*, client_destinations(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
