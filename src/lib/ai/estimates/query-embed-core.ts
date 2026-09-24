export const QUERY_EMBEDDING_DIM = 1536;

export function normalizeQueryEmbedding(values: number[] | undefined): number[] | null {
  if (values?.length !== QUERY_EMBEDDING_DIM || values.some((value) => !Number.isFinite(value))) return null;
  const norm = Math.hypot(...values);
  return norm > 0 && Number.isFinite(norm) ? values.map((value) => value / norm) : null;
}

/** The callback makes the no-consent boundary testable without a provider key. */
export async function embedQueryWithConsent(input: {
  text: string;
  allowExternalProcessing: boolean;
  configured: boolean;
  request: (text: string) => Promise<number[] | undefined>;
}): Promise<number[] | null> {
  if (!input.allowExternalProcessing || !input.configured || !input.text.trim()) return null;
  try {
    return normalizeQueryEmbedding(await input.request(input.text.trim().slice(0, 8_000)));
  } catch {
    return null;
  }
}
