import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isGeminiConfigured, requireGeminiEnv } from "./batch/env";
import { GeminiBatchError, GeminiEstimateProvider } from "./batch/gemini";
import { AiEstimateBatchRepository } from "./batch/repository";
import { sourceProcessingEnv } from "./lifecycle";

/** Lexical chunks are already committed by approval. Optional embeddings may be retried independently. */
export async function indexApprovedEstimateSource(sourceId: string, actorUserId: string): Promise<{ embedded: number; mode: "lexical" | "hybrid" }> {
  const deadline = Date.now() + 180_000;
  const operationSignal = AbortSignal.timeout(180_000);
  if (!isGeminiConfigured()) return { embedded: 0, mode: "lexical" };
  const supabase = createSupabaseAdminClient();
  const { data: source, error } = await supabase.from("ai_estimate_sources")
    .select("organization_id, status").eq("id", sourceId).abortSignal(operationSignal).maybeSingle();
  if (error) throw new Error(error.message);
  if (!source || source.status !== "approved") return { embedded: 0, mode: "lexical" };
  const repository = new AiEstimateBatchRepository(sourceProcessingEnv(source.organization_id, actorUserId), operationSignal);
  try {
    await repository.assertExternalProcessingAllowed(await repository.getSource(sourceId));
  } catch {
    return { embedded: 0, mode: "lexical" };
  }
  const geminiEnv = requireGeminiEnv();
  const provider = new GeminiEstimateProvider(geminiEnv);
  const chunks = await repository.listUnembeddedChunks(80, geminiEnv.embeddingModel, sourceId);
  let embedded = 0;
  for (const chunk of chunks) {
    // Leave enough time for a full embed attempt; the CLI can continue the remaining chunks.
    if (Date.now() + 60_000 > deadline) break;
    // Recheck policy before each external request, including long indexing runs.
    const currentSource = await repository.getSource(sourceId);
    if (currentSource.status !== "approved") return { embedded, mode: "lexical" };
    await repository.assertExternalProcessingAllowed(currentSource);
    if (Date.now() + 60_000 > deadline) break;
    try {
      const vector = await provider.embed(chunk.content, operationSignal);
      if (await repository.saveEmbedding(chunk, vector, geminiEnv.embeddingModel)) embedded += 1;
    } catch (error) {
      if (error instanceof GeminiBatchError && error.errorClass === "timeout") break;
      throw error;
    }
  }
  return { embedded, mode: embedded > 0 || chunks.length === 0 ? "hybrid" : "lexical" };
}
