import { normalizeItemName } from "./normalize";

/** 키워드 채널이 점수를 매길 승인 예시 상한. 전체 corpus 를 메모리로 올리지 않기 위한 방어선. */
export const KEYWORD_CANDIDATE_LIMIT = 500;
/** 벡터 RPC 가 돌려줄 청크 수. RPC 자체 상한은 50. */
export const VECTOR_CANDIDATE_LIMIT = 30;
/** 상세(품목 포함) 조회 대상. 여기서 visibility 를 다시 걸러도 5건이 남도록 넉넉히 둔다. */
export const SHORTLIST_LIMIT = 20;
export const SAME_CLIENT_BONUS = 0.35;

export type RetrievalWeights = { keyword: number; vector: number };

/**
 * 벡터 채널이 살아 있을 때의 가중치. 의미 검색에 더 무게를 둔다.
 */
export const HYBRID_WEIGHTS: RetrievalWeights = { keyword: 0.4, vector: 0.6 };

/**
 * GEMINI 키가 없거나 임베딩된 청크가 없을 때 쓴다. 키워드에 1.0 을 주어 하이브리드 도입
 * 전과 점수 스케일을 같게 유지한다. draft 의 confidence 가 이 점수에 직접 의존한다.
 */
export const KEYWORD_ONLY_WEIGHTS: RetrievalWeights = { keyword: 1, vector: 0 };

export type ChannelScores = {
  exampleId: string;
  keywordScore: number;
  vectorScore: number;
};

export type RankedCandidate = ChannelScores & {
  sameClient: boolean;
  score: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function tokenScore(query: string, text: string) {
  const tokens = normalizeItemName(query).split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return 0;
  const normalized = normalizeItemName(text);
  return tokens.filter((token) => normalized.includes(token)).length / tokens.length;
}

/**
 * pgvector 코사인 거리(0~2)를 유사도(1~0)로 바꾼다. 정규화된 벡터끼리는 0 이 완전 일치.
 */
export function distanceToSimilarity(distance: number) {
  if (!Number.isFinite(distance)) return 0;
  return clamp01(1 - distance / 2);
}

export function computeHybridScore({
  keywordScore,
  vectorScore,
  sameClient,
  weights,
}: {
  keywordScore: number;
  vectorScore: number;
  sameClient: boolean;
  weights: RetrievalWeights;
}) {
  const base = weights.keyword * clamp01(keywordScore) + weights.vector * clamp01(vectorScore);
  return Math.min(1, base + (sameClient ? SAME_CLIENT_BONUS : 0));
}

/**
 * 두 채널 결과를 example 단위로 합친다. 한 example 에 청크가 여러 개면 가장 가까운 것만 남긴다.
 */
export function mergeChannelScores(
  keyword: Array<{ exampleId: string; score: number }>,
  vector: Array<{ exampleId: string; similarity: number }>,
): ChannelScores[] {
  const merged = new Map<string, ChannelScores>();

  const entry = (exampleId: string) => {
    const existing = merged.get(exampleId);
    if (existing) return existing;
    const created: ChannelScores = { exampleId, keywordScore: 0, vectorScore: 0 };
    merged.set(exampleId, created);
    return created;
  };

  for (const row of keyword) {
    const target = entry(row.exampleId);
    target.keywordScore = Math.max(target.keywordScore, clamp01(row.score));
  }
  for (const row of vector) {
    const target = entry(row.exampleId);
    target.vectorScore = Math.max(target.vectorScore, clamp01(row.similarity));
  }

  return [...merged.values()];
}

export function rankRetrievalCandidates({
  candidates,
  weights,
  limit,
}: {
  candidates: Array<ChannelScores & { sameClient?: boolean }>;
  weights: RetrievalWeights;
  limit: number;
}): RankedCandidate[] {
  return candidates
    .map((candidate) => {
      const sameClient = candidate.sameClient ?? false;
      return {
        exampleId: candidate.exampleId,
        keywordScore: clamp01(candidate.keywordScore),
        vectorScore: clamp01(candidate.vectorScore),
        sameClient,
        score: computeHybridScore({
          keywordScore: candidate.keywordScore,
          vectorScore: candidate.vectorScore,
          sameClient,
          weights,
        }),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

/** supabase-js 는 vector 리터럴을 문자열로 보내므로 배치 저장 형식과 같게 맞춘다. */
export function vectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}
