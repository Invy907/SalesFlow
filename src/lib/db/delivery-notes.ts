import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentFilter } from "./estimates";

export async function getDeliveryNotes(orgId: string, filter: DocumentFilter = {}) {
  const supabase = await getSupabaseServerClient();
  const { clientId, status, statusIn, trashed, from, to, query, page = 1, pageSize = 30 } = filter;

  let q = supabase
    .from("delivery_notes")
    .select("*, clients(id, name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("issue_date", { ascending: false });

  q = trashed ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

  if (clientId) q = q.eq("client_id", clientId);
  if (status) q = q.eq("status", status);
  if (statusIn?.length) q = q.in("status", statusIn);
  if (from) q = q.gte("issue_date", from);
  if (to) q = q.lte("issue_date", to);
  if (query) q = q.or(`document_number.ilike.%${query}%,subject.ilike.%${query}%`);

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { deliveryNotes: data ?? [], total: count ?? 0 };
}

export async function getDeliveryNoteById(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .select("*, clients(*), delivery_note_line_items(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .order("line_no", { referencedTable: "delivery_note_line_items", ascending: true })
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
