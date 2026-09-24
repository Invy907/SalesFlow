import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedSearchQuery, QUERY_EMBEDDING_MODEL } from "./query-embed";
import { HYBRID_WEIGHTS, KEYWORD_ONLY_WEIGHTS, MIN_VECTOR_SIMILARITY, SHORTLIST_LIMIT, rankRetrievalCandidates, vectorLiteral } from "./retrieval";
import type { AiEstimateDraft } from "./schemas";
import type { AiEstimatePriceAnchor, AiEstimateTaxMode } from "./generation-core";

export type ApprovedExampleLine = {
  id: string; name: string; qty: number; unit: string | null; unit_price: number;
  tax_category: AiEstimateDraft["lines"][number]["taxCategory"];
};
export type ApprovedExampleRow = {
  id: string; source_id: string; owner_user_id: string; currency: string; tax_mode: AiEstimateTaxMode;
  client_id: string | null; client_name: string | null; subject: string | null; issue_date: string | null;
  template_message: string | null; remarks: string | null; search_text: string | null; visibility: string;
  document_kind: "estimate" | "price_list" | "design" | "work_scope";
  source_title?: string; project_name: string; revision: string; valid_from: string | null; valid_until: string | null;
  work_details: string; assumptions: string; exclusions: string;
  ai_estimate_example_lines: ApprovedExampleLine[];
};
export type ApprovedExampleMatch = {
  example: ApprovedExampleRow; score: number; keywordScore: number; vectorScore: number; sameClient: boolean;
};
export type ApprovedExampleSearch = { matches: ApprovedExampleMatch[]; vectorUsed: boolean };
type SearchRow = { example_id: string; keyword_score: number; vector_score: number; same_client: boolean; example: ApprovedExampleRow };

/** Search eligibility, ranking and detail retrieval share one DB snapshot. No recent-row corpus cap. */
export async function searchApprovedExamples({ supabase, orgId, queryText, clientId, allowPrivateSources,
  allowExternalProcessing = false, clientNames = [], limit = 5, sourceIds = [],
}: {
  supabase: SupabaseClient; orgId: string; queryText: string; clientId: string | null; allowPrivateSources: boolean;
  allowExternalProcessing?: boolean; clientNames?: Array<string | null | undefined>; limit?: number; sourceIds?: string[];
}): Promise<ApprovedExampleSearch> {
  if (!queryText.trim() && !sourceIds.length) return { matches: [], vectorUsed: false };
  const vector = sourceIds.length ? null : await embedSearchQuery(queryText, { allowExternalProcessing, clientNames });
  const params = {
    p_organization_id: orgId, p_query_text: queryText.slice(0, 8_000),
    p_query_embedding: vector ? vectorLiteral(vector) : null,
    p_embedding_model: vector ? QUERY_EMBEDDING_MODEL : null,
    p_client_id: clientId, p_allow_private: allowPrivateSources, p_limit: SHORTLIST_LIMIT, p_source_ids: sourceIds,
  };
  let result = await supabase.rpc("ai_estimate_search_approved_v2", params);
  // A vector incompatibility must not remove working local search.
  if (result.error && vector) result = await supabase.rpc("ai_estimate_search_approved_v2", {
    ...params, p_query_embedding: null, p_embedding_model: null,
  });
  if (result.error) throw new Error(result.error.message);
  const rows = (result.data ?? []) as SearchRow[];
  if (sourceIds.length) return { vectorUsed: false, matches: rows.map((row) => ({ example: row.example, score: 1,
    keywordScore: Number(row.keyword_score), vectorScore: 0, sameClient: row.same_client })) };
  const vectorUsed = rows.some((row) => Number(row.vector_score) >= MIN_VECTOR_SIMILARITY);
  const rowById = new Map(rows.map((row) => [row.example_id, row]));
  const ranked = rankRetrievalCandidates({
    candidates: rows.map((row) => ({ exampleId: row.example_id, keywordScore: Number(row.keyword_score), vectorScore: Number(row.vector_score), sameClient: row.same_client })),
    weights: vectorUsed ? HYBRID_WEIGHTS : KEYWORD_ONLY_WEIGHTS,
    limit: Math.min(10, Math.max(0, limit)),
  });
  return {
    vectorUsed,
    matches: ranked.map((row) => ({ example: rowById.get(row.exampleId)!.example,
      score: row.score, keywordScore: row.keywordScore, vectorScore: row.vectorScore, sameClient: row.sameClient })),
  };
}

/** Statistics are recomputed from current approved public lines, with original line provenance. */
export async function getApprovedPriceAnchors({ supabase, orgId, exampleIds, clientId, allApproved = false, sourceIds = [] }: {
  supabase: SupabaseClient; orgId: string; exampleIds: string[]; clientId: string | null; allApproved?: boolean; sourceIds?: string[];
}): Promise<AiEstimatePriceAnchor[]> {
  if (!exampleIds.length && !allApproved) return [];
  const { data, error } = await supabase.rpc("ai_estimate_get_price_anchors_v2", {
    p_organization_id: orgId, p_example_ids: allApproved ? null : exampleIds.slice(0, 20), p_client_id: clientId, p_source_ids: sourceIds,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{
    display_name: string; normalized_name: string; sample_count: number;
    median_price: number; p25_price: number; p75_price: number;
    scope: "client" | "company"; unit: string | null; tax_category: ApprovedExampleLine["tax_category"];
    tax_mode: AiEstimateTaxMode; currency: string; example_ids: string[]; line_ids: string[];
    sources: Array<{ exampleId: string; sourceId: string; label: string }>;
  }>).map((row) => ({
    name: row.display_name, normalizedName: row.normalized_name, sampleCount: Number(row.sample_count),
    medianPrice: row.currency === "JPY" ? Math.round(Number(row.median_price)) : Number(row.median_price), p25Price: Number(row.p25_price), p75Price: Number(row.p75_price),
    scope: row.scope, unit: row.unit, taxCategory: row.tax_category, taxMode: row.tax_mode, currency: row.currency,
    exampleIds: row.example_ids, lineIds: row.line_ids, sources: row.sources,
  }));
}
