import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prepareUploadedEstimateForReview } from "./processor";

/** Bounded cron recovery; durable file-purge tasks are safe to retry after storage failures. */
export async function processPendingEstimateSources(options: { limit?: number; retentionLimit?: number } = {}) {
  const supabase = createSupabaseAdminClient();
  const result = { processed: 0, reviewRequired: 0, failed: 0, skipped: 0, purged: 0, purgeFailed: 0 };
  const limit = Math.max(1, Math.min(3, options.limit ?? 3));
  const { data: pending, error: pendingError } = await supabase.rpc("ai_estimate_pending_sources", { p_limit: limit });
  if (pendingError) throw new Error(pendingError.message);
  for (const source of pending ?? []) {
    try {
      await prepareUploadedEstimateForReview(source.source_id, source.uploaded_by);
      const { data: updated, error } = await supabase.from("ai_estimate_sources").select("status").eq("id", source.source_id).maybeSingle();
      if (error) throw new Error(error.message);
      result.processed += 1;
      if (updated?.status === "review_required") result.reviewRequired += 1;
      else if (updated?.status === "failed") result.failed += 1;
      else result.skipped += 1;
    } catch {
      result.failed += 1;
    }
  }
  const { data: expired, error: expirationError } = await supabase.rpc("ai_estimate_claim_expired_files", {
    p_limit: Math.max(1, Math.min(50, options.retentionLimit ?? 10)),
  });
  if (expirationError) throw new Error(expirationError.message);
  for (const source of expired ?? []) {
    try {
      const { error } = await supabase.storage.from("ai-estimate-sources").remove([source.storage_path]);
      if (error) throw new Error(error.message);
      const { error: completedError } = await supabase.rpc("ai_estimate_complete_file_purge", {
        p_source_id: source.source_id, p_storage_path: source.storage_path,
      });
      if (completedError) throw new Error(completedError.message);
      result.purged += 1;
    } catch {
      result.purgeFailed += 1;
    }
  }
  return result;
}
