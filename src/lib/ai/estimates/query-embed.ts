import "server-only";

import { GoogleGenAI } from "@google/genai";

export const QUERY_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";

/**
 * ai_estimate_chunks.embedding_vector 와 같은 차원이어야 RPC 가 결과를 돌려준다.
 * 배치(batch/gemini.ts)도 1536 으로 저장한다.
 */
const QUERY_EMBEDDING_DIM = 1536;

export function isQueryEmbeddingConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function l2Normalize(values: number[]) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) return null;
  return values.map((value) => value / norm);
}

/**
 * 검색 쿼리용 임베딩. 문서 임베딩은 RETRIEVAL_DOCUMENT 로 저장하므로 여기서는
 * RETRIEVAL_QUERY 를 쓴다.
 *
 * 벡터 검색은 부가 채널이라 실패해도 초안 생성을 막지 않는다. 그래서 throw 하지 않고
 * null 을 돌려주고, 호출부는 키워드 검색만으로 계속 진행한다.
 */
export async function embedSearchQuery(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const trimmed = text.trim();
  if (!apiKey || !trimmed) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: QUERY_EMBEDDING_MODEL,
      contents: trimmed.slice(0, 8_000),
      config: {
        outputDimensionality: QUERY_EMBEDDING_DIM,
        taskType: "RETRIEVAL_QUERY",
        abortSignal: AbortSignal.timeout(15_000),
      },
    });
    const values = response.embeddings?.[0]?.values;
    if (!values?.length || values.length !== QUERY_EMBEDDING_DIM) return null;
    return l2Normalize(values);
  } catch {
    return null;
  }
}
