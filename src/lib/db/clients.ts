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

/** Client picker for the document forms: includes the registered address/phone so
 *  selecting a client can fill the recipient block right away. */
export type ClientOptionRow = {
  id: string;
  name: string;
  honorific: string | null;
  department: string | null;
  phone: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
};

type ClientDestinationRow = {
  postal_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  is_default: boolean | null;
};

export async function getClientOptions(orgId: string, limit = 500): Promise<ClientOptionRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, name, honorific, department, phone, client_destinations(postal_code, address_line1, address_line2, is_default)",
    )
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("furigana", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const destinations = (row.client_destinations ?? []) as ClientDestinationRow[];
    const destination = destinations.find((d) => d.is_default) ?? destinations[0] ?? null;
    return {
      id: row.id as string,
      name: (row.name as string) ?? "",
      honorific: (row.honorific as string | null) ?? null,
      department: (row.department as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      postalCode: destination?.postal_code ?? null,
      addressLine1: destination?.address_line1 ?? null,
      addressLine2: destination?.address_line2 ?? null,
    };
  });
}
