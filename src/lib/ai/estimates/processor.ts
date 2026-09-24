import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canWriteOrganizationBusinessData } from "@/lib/organization-permissions";
import { extractionConfig, makeExtractionProvider } from "./extraction-provider";
import { isLocalDocumentMime } from "./local-document-parser";
import { AiEstimateBatchRepository } from "./batch/repository";
import { runExtractionBatch } from "./batch/runner";
import { manualReviewScaffold, sourceProcessingEnv } from "./lifecycle";

/** Upload/retry boundary: permission + organization opt-in precede any provider call. */
export async function prepareUploadedEstimateForReview(sourceId: string, actorUserId?: string, options: { retry?: boolean } = {}) {
  const supabase = createSupabaseAdminClient();
  const { data: source, error } = await supabase.from("ai_estimate_sources")
    .select("id, organization_id, title, status, uploaded_by, visibility, mime_type, document_kind").eq("id", sourceId).single();
  if (error || !source) throw new Error(error?.message ?? "AI source not found");
  if (source.status === "approved" || source.status === "excluded") return;
  const actor = actorUserId ?? source.uploaded_by;
  const { data: member, error: memberError } = await supabase.from("organization_members").select("role")
    .eq("organization_id", source.organization_id).eq("user_id", actor).maybeSingle();
  if (memberError || !canWriteOrganizationBusinessData(member?.role)
    || (actor !== source.uploaded_by && member?.role !== "owner" && member?.role !== "admin")) return;
  const { data: extraction } = await supabase.from("ai_estimate_extractions").select("source_of_truth").eq("source_id", sourceId).maybeSingle();
  // A retry must never discard human input, even before it has been approved.
  if (extraction?.source_of_truth === "human") return;
  const { data: settings, error: settingsError } = await supabase.from("ai_estimate_settings")
    .select("enabled, allow_external_processing, allow_private_sources").eq("organization_id", source.organization_id).maybeSingle();
  if (settingsError) throw new Error(settingsError.message);
  // A new organization has no settings row: local processing is enabled by default.
  if (settings?.enabled === false) return;
  if (source.visibility === "private" && (!settings?.allow_private_sources || actor !== source.uploaded_by)) return;
  const local = isLocalDocumentMime(source.mime_type);
  const configuration = extractionConfig(process.env);
  const providerAllowed = settings?.enabled && settings.allow_external_processing
    && (source.visibility !== "private" || (settings.allow_private_sources && actor === source.uploaded_by));
  if (!local && (!configuration || !providerAllowed)) {
    const { error: manualError } = await supabase.rpc("ai_estimate_prepare_manual_review", {
      p_source_id: sourceId, p_extraction: manualReviewScaffold(source.title, source.document_kind ?? "estimate"),
    });
    if (manualError) throw new Error(manualError.message);
    return;
  }
  const env = sourceProcessingEnv(source.organization_id, actor);
  const model = configuration?.model ?? "salesflow-file-parser-v1";
  const providerEnv = { apiKey: configuration?.apiKey ?? "", extractionModel: model,
    retryModel: configuration?.provider === "gemini" ? process.env.GEMINI_RETRY_MODEL?.trim() || "gemini-3.8-flash" : model,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001" };
  await runExtractionBatch(new AiEstimateBatchRepository(env), makeExtractionProvider(configuration), env, providerEnv, {
    command: "ingest", limit: 1, all: false, resume: false, sourceId, forceRetry: options.retry ?? false,
  });
}
