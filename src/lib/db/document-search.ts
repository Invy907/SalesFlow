import { getSupabaseServerClient } from "@/lib/supabase/server";
import { documentSearchClause, documentSearchPattern } from "@/lib/document-list-state";

export async function getDocumentSearchClause(orgId: string, query: string) {
  const supabase = await getSupabaseServerClient();
  const clientIds: string[] = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", orgId)
      .ilike("name", documentSearchPattern(query))
      .order("id")
      .range(offset, offset + batchSize - 1);
    if (error) throw new Error(error.message);
    clientIds.push(...(data ?? []).map((client) => client.id));
    if (!data || data.length < batchSize) break;
  }
  return documentSearchClause(query, clientIds);
}
