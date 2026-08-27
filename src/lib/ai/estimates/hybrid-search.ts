import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { embedSearchQuery } from "./query-embed";
import {
  HYBRID_WEIGHTS,
  KEYWORD_CANDIDATE_LIMIT,
  KEYWORD_ONLY_WEIGHTS,
  SHORTLIST_LIMIT,
  VECTOR_CANDIDATE_LIMIT,
  distanceToSimilarity,
  mergeChannelScores,
  rankRetrievalCandidates,
  tokenScore,
  vectorLiteral,
} from "./retrieval";
import type { AiEstimateDraft } from "./schemas";

const EXAMPLE_DETAIL_COLUMNS =
  "id, client_id, client_name, subject, issue_date, template_message, remarks, search_text, visibility, ai_estimate_example_lines(name, qty, unit, unit_price, tax_category)";

export type ApprovedExampleLine = {
  name: string;
  qty: number;
  unit: string | null;
  unit_price: number;
  tax_category: AiEstimateDraft["lines"][number]["taxCategory"];
};

export type ApprovedExampleRow = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  subject: string | null;
  issue_date: string | null;
  template_message: string | null;
  remarks: string | null;
  search_text: string | null;
  visibility: string;
  ai_estimate_example_lines: ApprovedExampleLine[];
};

export type ApprovedExampleMatch = {
  example: ApprovedExampleRow;
  score: number;
  keywordScore: number;
  vectorScore: number;
  sameClient: boolean;
};

export type ApprovedExampleSearch = {
  matches: ApprovedExampleMatch[];
  /** 벡터 채널이 실제로 후보를 돌려줬는지. 점수 가중치와 provider 기록에 쓴다. */
  vectorUsed: boolean;
};

type VectorChunkRow = {
  example_id: string;
  chunk_index: number;
  content: string;
  distance: number;
};

/**
 * 승인된 과거 견적을 키워드 + 벡터 하이브리드로 검색한다.
 *
 * 벡터 채널은 GEMINI 키가 있고 임베딩된 청크가 있을 때만 동작한다. 둘 중 하나라도
 * 없으면 키워드 전용 가중치로 떨어져 하이브리드 도입 전과 같은 점수를 낸다.
 */
export async function searchApprovedExamples({
  supabase,
  orgId,
  queryText,
  clientId,
  allowPrivateSources,
  limit = 5,
}: {
  supabase: SupabaseClient;
  orgId: string;
  queryText: string;
  clientId: string | null;
  allowPrivateSources: boolean;
  limit?: number;
}): Promise<ApprovedExampleSearch> {
  let keywordQuery = supabase
    .from("ai_estimate_examples")
    .select("id, client_id, search_text")
    .eq("organization_id", orgId)
    .order("issue_date", { ascending: false, nullsFirst: false })
    .limit(KEYWORD_CANDIDATE_LIMIT);
  if (!allowPrivateSources) keywordQuery = keywordQuery.eq("visibility", "organization");

  const [keywordResult, queryVector] = await Promise.all([
    keywordQuery,
    embedSearchQuery(queryText),
  ]);
  if (keywordResult.error) throw new Error(keywordResult.error.message);

  const keywordRows = (keywordResult.data ?? []) as Array<{
    id: string;
    client_id: string | null;
    search_text: string | null;
  }>;
  const clientIdByExample = new Map(keywordRows.map((row) => [row.id, row.client_id]));
  const keywordScored = keywordRows
    .map((row) => ({ exampleId: row.id, score: tokenScore(queryText, row.search_text ?? "") }))
    .filter((row) => row.score > 0);

  let vectorScored: Array<{ exampleId: string; similarity: number }> = [];
  if (queryVector) {
    const { data, error } = await supabase.rpc("ai_estimate_search_chunks", {
      p_organization_id: orgId,
      p_query: vectorLiteral(queryVector),
      p_limit: VECTOR_CANDIDATE_LIMIT,
    });
    /* 벡터는 부가 채널이라 RPC 실패는 키워드 결과로 흡수한다. */
    if (!error) {
      vectorScored = ((data ?? []) as VectorChunkRow[]).map((row) => ({
        exampleId: row.example_id,
        similarity: distanceToSimilarity(Number(row.distance)),
      }));
    }
  }

  const vectorUsed = vectorScored.length > 0;
  const weights = vectorUsed ? HYBRID_WEIGHTS : KEYWORD_ONLY_WEIGHTS;

  const shortlist = rankRetrievalCandidates({
    candidates: mergeChannelScores(keywordScored, vectorScored).map((candidate) => ({
      ...candidate,
      sameClient: Boolean(clientId) && clientIdByExample.get(candidate.exampleId) === clientId,
    })),
    weights,
    limit: SHORTLIST_LIMIT,
  });
  if (!shortlist.length) return { matches: [], vectorUsed };

  let detailQuery = supabase
    .from("ai_estimate_examples")
    .select(EXAMPLE_DETAIL_COLUMNS)
    .eq("organization_id", orgId)
    .in("id", shortlist.map((candidate) => candidate.exampleId));
  /* RPC 는 organization_id 만 거르고 chunks RLS 는 관리자에게 private 도 허용한다.
     조직 설정이 private 를 막고 있으면 여기서 반드시 다시 걸러야 한다. */
  if (!allowPrivateSources) detailQuery = detailQuery.eq("visibility", "organization");
  const { data: details, error: detailError } = await detailQuery;
  if (detailError) throw new Error(detailError.message);

  const channelByExample = new Map(shortlist.map((candidate) => [candidate.exampleId, candidate]));
  const matches = ((details ?? []) as unknown as ApprovedExampleRow[])
    .map((example) => {
      const channels = channelByExample.get(example.id);
      const sameClient = Boolean(clientId) && example.client_id === clientId;
      const [ranked] = rankRetrievalCandidates({
        candidates: [{
          exampleId: example.id,
          keywordScore: channels?.keywordScore ?? 0,
          vectorScore: channels?.vectorScore ?? 0,
          sameClient,
        }],
        weights,
        limit: 1,
      });
      if (!ranked) return null;
      return {
        example,
        score: ranked.score,
        keywordScore: ranked.keywordScore,
        vectorScore: ranked.vectorScore,
        sameClient,
      } satisfies ApprovedExampleMatch;
    })
    .filter((match): match is ApprovedExampleMatch => match !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { matches, vectorUsed };
}
