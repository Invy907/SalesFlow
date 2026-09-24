import "server-only";
import { GoogleGenAI } from "@google/genai";
import { embedQueryWithConsent, QUERY_EMBEDDING_DIM } from "./query-embed-core";
import { redactKnownClientNames } from "./generation-core";

export const QUERY_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";

export function isQueryEmbeddingConfigured() {
  return /^AIza[A-Za-z0-9_-]{20,}$/.test(process.env.GEMINI_API_KEY ?? "");
}

/** External processing is opt-in, including this query-side embedding request. */
export async function embedSearchQuery(text: string, options: {
  allowExternalProcessing?: boolean;
  clientNames?: Array<string | null | undefined>;
} = {}): Promise<number[] | null> {
  return embedQueryWithConsent({
    text: redactKnownClientNames(text, options.clientNames ?? []),
    allowExternalProcessing: options.allowExternalProcessing === true,
    configured: isQueryEmbeddingConfigured(),
    request: async (contents) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.embedContent({
        model: QUERY_EMBEDDING_MODEL,
        contents,
        config: { outputDimensionality: QUERY_EMBEDDING_DIM, taskType: "RETRIEVAL_QUERY", abortSignal: AbortSignal.timeout(15_000) },
      });
      return response.embeddings?.[0]?.values;
    },
  });
}
