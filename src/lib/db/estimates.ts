import { getDocumentSearchClause } from "./document-search";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type DocumentStatus = Database["public"]["Enums"]["document_status"];

export interface DocumentFilter {
  clientId?: string;
  status?: DocumentStatus;
  statusIn?: DocumentStatus[];
  trashed?: boolean;
  /** 見積書: 発行 배지. 請求書: 発行(issued_marked_at) 배지도 같은 이름을 재사용. true=완료만, false=미완료만 */
  issueFlag?: boolean;
  /** 見積書 전용: 受注 배지. true=受注済만, false=未受注만 */
  orderFlag?: boolean;
  /** 請求書 전용: 入金(payment_marked_at) 배지. true=入金済만, false=未入金만 */
  paymentFlag?: boolean;
  /** 納品書 전용: 請求(billed_marked_at) 배지. true=請求済만, false=未請求만 */
  billedFlag?: boolean;
  from?: string;
  to?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export async function getEstimates(orgId: string, filter: DocumentFilter = {}) {
  const supabase = await getSupabaseServerClient();
  const { clientId, status, statusIn, trashed, issueFlag, orderFlag, from, to, query, page = 1, pageSize = 30 } = filter;

  let q = supabase
    .from("estimates")
    .select("*, clients(id, name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("issue_date", { ascending: false })
    .order("id", { ascending: false });

  if (trashed) {
    q = q.not("deleted_at", "is", null);
  } else {
    q = q.is("deleted_at", null);
  }

  if (clientId) q = q.eq("client_id", clientId);
  if (status) q = q.eq("status", status);
  if (statusIn?.length) q = q.in("status", statusIn);
  if (issueFlag !== undefined) q = issueFlag ? q.not("issue_marked_at", "is", null) : q.is("issue_marked_at", null);
  if (orderFlag !== undefined) q = orderFlag ? q.not("ordered_at", "is", null) : q.is("ordered_at", null);
  if (from) q = q.gte("issue_date", from);
  if (to) q = q.lte("issue_date", to);
  if (query) q = q.or(await getDocumentSearchClause(orgId, query));

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { estimates: data ?? [], total: count ?? 0 };
}

export async function getEstimateById(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*, clients(*), estimate_line_items(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .order("line_no", { referencedTable: "estimate_line_items", ascending: true })
    .single();

  if (error) throw new Error(error.message);
  return data;
}
