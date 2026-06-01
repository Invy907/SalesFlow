import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentFilter } from "./estimates";

export async function getInvoices(orgId: string, filter: DocumentFilter = {}) {
  const supabase = await getSupabaseServerClient();
  const { clientId, status, from, to, query, page = 1, pageSize = 30 } = filter;

  let q = supabase
    .from("invoices")
    .select("*, clients(id, name)", { count: "exact" })
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("issue_date", { ascending: false });

  if (clientId) q = q.eq("client_id", clientId);
  if (status) q = q.eq("status", status);
  if (from) q = q.gte("issue_date", from);
  if (to) q = q.lte("issue_date", to);
  if (query) q = q.or(`document_number.ilike.%${query}%,subject.ilike.%${query}%`);

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { invoices: data ?? [], total: count ?? 0 };
}

export async function getInvoiceById(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients(*), invoice_line_items(*), payments(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .order("line_no", { referencedTable: "invoice_line_items", ascending: true })
    .single();

  if (error) throw new Error(error.message);
  return data;
}
