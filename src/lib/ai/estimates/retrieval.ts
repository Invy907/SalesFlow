import { normalizeItemName } from "./normalize";

export const SHORTLIST_LIMIT = 20;
export const SAME_CLIENT_BONUS = 0.05;
export const MIN_KEYWORD_SCORE = 0.25;
export const MIN_VECTOR_SIMILARITY = 0.65;
export type RetrievalWeights = { keyword: number; vector: number };
export const HYBRID_WEIGHTS: RetrievalWeights = { keyword: 0.4, vector: 0.6 };
export const KEYWORD_ONLY_WEIGHTS: RetrievalWeights = { keyword: 1, vector: 0 };
export type ChannelScores = { exampleId: string; keywordScore: number; vectorScore: number };
export type RankedCandidate = ChannelScores & { sameClient: boolean; score: number };

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Mirrors ai_estimate_search_terms: CJK bigrams also work without whitespace. */
export function searchTerms(value: string): string[] {
  const words = normalizeItemName(value).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1);
  return [...new Set(words.flatMap((word) => {
    if (!/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(word)) return [word];
    const chars = Array.from(word);
    return chars.slice(0, -1).map((char, index) => char + chars[index + 1]);
  }))];
}

export function tokenScore(query: string, text: string) {
  const terms = searchTerms(query);
  const document = new Set(searchTerms(text));
  return terms.length ? terms.filter((term) => document.has(term)).length / terms.length : 0;
}

/** Cosine similarity is 1 - distance; orthogonal vectors are not evidence. */
export function distanceToSimilarity(distance: number) {
  return Number.isFinite(distance) ? clamp01(1 - distance) : 0;
}

export function computeHybridScore({ keywordScore, vectorScore, sameClient, weights }: {
  keywordScore: number; vectorScore: number; sameClient: boolean; weights: RetrievalWeights;
}) {
  const keyword = clamp01(keywordScore);
  const vector = clamp01(vectorScore);
  if (keyword < MIN_KEYWORD_SCORE && (weights.vector === 0 || vector < MIN_VECTOR_SIMILARITY)) return 0;
  const base = weights.keyword * keyword + weights.vector * vector;
  return Math.min(1, base * (sameClient ? 1 + SAME_CLIENT_BONUS : 1));
}

export function mergeChannelScores(
  keyword: Array<{ exampleId: string; score: number }>,
  vector: Array<{ exampleId: string; similarity: number }>,
): ChannelScores[] {
  const merged = new Map<string, ChannelScores>();
  const entry = (exampleId: string) => {
    const current = merged.get(exampleId) ?? { exampleId, keywordScore: 0, vectorScore: 0 };
    merged.set(exampleId, current);
    return current;
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

export function rankRetrievalCandidates({ candidates, weights, limit }: {
  candidates: Array<ChannelScores & { sameClient?: boolean }>; weights: RetrievalWeights; limit: number;
}): RankedCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    keywordScore: clamp01(candidate.keywordScore),
    vectorScore: clamp01(candidate.vectorScore),
    sameClient: candidate.sameClient ?? false,
    score: computeHybridScore({ ...candidate, sameClient: candidate.sameClient ?? false, weights }),
  })).filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.exampleId.localeCompare(b.exampleId))
    .slice(0, Math.max(0, limit));
}

export function vectorLiteral(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value))) throw new Error("Invalid embedding vector");
  return `[${values.join(",")}]`;
}
