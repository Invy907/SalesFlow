import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AiEstimateExtraction } from "../schemas";
import type { BatchEnv } from "./env";
import { GeminiBatchError } from "./gemini";
import type { LocalEstimateFile } from "./local-files";
import type { NormalizedEstimateExtraction } from "./normalize";
import { canWriteOrganizationBusinessData } from "../../../organization-permissions";
import { assertTransition, type ProcessingStatus } from "./status";
import { isCanonicalEstimateSourcePath } from "./source-path";
import type { SourceDocumentKind } from "./extraction-schema";
import { manualReviewScaffold } from "../lifecycle";

export type BatchCommand = "smoke" | "pilot" | "ingest" | "retry" | "reindex" | "verify";

export interface BatchSource {
  id: string;
  organization_id: string;
  title: string;
  storage_path: string | null;
  mime_type: string | null;
  page_count: number | null;
  status: string;
  visibility: string;
  uploaded_by: string;
  document_kind?: SourceDocumentKind;
}

export interface BatchJob {
  id: string;
  organization_id: string;
  source_id: string;
  status: ProcessingStatus;
  attempt: number;
  max_attempt: number;
  last_run_id: string | null;
}

export interface RunConfig {
  command: BatchCommand;
  requestedLimit: number | null;
  confirmedAll: boolean;
  promptVersion: string;
  extractionVersion: string;
  extractionModel: string;
  retryModel: string;
  concurrency: number;
}

export interface ExtractionPersistence {
  provider?: "gemini" | "anthropic" | "local";
  job: BatchJob;
  source: BatchSource;
  runId: string;
  model: string;
  promptVersion: string;
  extractionVersion: string;
  rawOutput: unknown;
  normalized: NormalizedEstimateExtraction;
  reviewExtraction: AiEstimateExtraction;
  reviewReasons: string[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicroUsd: number;
  latencyMs: number;
}

interface IndexChunkRow {
  id: string;
  content: string;
  example_id: string;
  ai_estimate_examples:
    | { source_id: string }
    | Array<{ source_id: string }>;
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "text/csv") return ".csv";
  if (mimeType === "text/plain") return ".txt";
  if (mimeType === "text/markdown") return ".md";
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return ".xlsx";
  return ".jpg";
}

export class AiEstimateBatchRepository {
  readonly client: SupabaseClient;

  constructor(readonly env: BatchEnv, requestSignal?: AbortSignal) {
    this.client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: requestSignal ? {
        fetch: (input, init) => fetch(input, {
          ...init,
          signal: AbortSignal.any([requestSignal, ...(init?.signal ? [init.signal] : [])]),
        }),
      } : undefined,
    });
  }

  async activeFileHashes(): Promise<Set<string>> {
    const hashes = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.client
        .from("ai_estimate_sources")
        .select("file_hash")
        .eq("organization_id", this.env.organizationId)
        .neq("status", "excluded")
        .not("file_hash", "is", null)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) if (row.file_hash) hashes.add(row.file_hash as string);
      if (!data || data.length < 1000) break;
    }
    return hashes;
  }

  async registerLocalSource(
    file: LocalEstimateFile,
    bytes: Buffer,
    sha256: string,
  ): Promise<{ sourceId: string; duplicate: boolean }> {
    if (!this.env.actorUserId) {
      throw new Error("로컬 문서 등록에는 AI_ESTIMATE_ACTOR_USER_ID가 필요합니다.");
    }
    if (file.size > 20 * 1024 * 1024) throw new Error(`20MB 초과 파일: ${file.relativePath}`);

    const { data: duplicate, error: duplicateError } = await this.client
      .from("ai_estimate_sources")
      .select("id")
      .eq("organization_id", this.env.organizationId)
      .eq("file_hash", sha256)
      .neq("status", "excluded")
      .maybeSingle();
    if (duplicateError) throw new Error(duplicateError.message);
    if (duplicate) return { sourceId: duplicate.id as string, duplicate: true };

    const sourceId = randomUUID();
    const storagePath = `${this.env.organizationId}/${sourceId}/original${extensionForMime(file.mimeType)}`;
    const { error: uploadError } = await this.client.storage
      .from(this.env.storageBucket)
      .upload(storagePath, bytes, { contentType: file.mimeType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { error: insertError } = await this.client.from("ai_estimate_sources").insert({
      id: sourceId,
      organization_id: this.env.organizationId,
      source_type: "upload",
      document_kind: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(file.mimeType) ? "price_list"
        : ["text/plain", "text/markdown"].includes(file.mimeType) ? "work_scope" : "estimate",
      title: path.parse(file.fileName).name.slice(0, 255),
      original_file_name: file.fileName,
      storage_path: storagePath,
      mime_type: file.mimeType,
      file_size: file.size,
      file_hash: sha256,
      visibility: "organization",
      status: "uploaded",
      uploaded_by: this.env.actorUserId,
      ingest_origin: "batch-local",
      ingest_ref: file.relativePath,
    });
    if (insertError) {
      await this.client.storage.from(this.env.storageBucket).remove([storagePath]);
      if (insertError.code === "23505") {
        const { data: existing } = await this.client.from("ai_estimate_sources")
          .select("id")
          .eq("organization_id", this.env.organizationId)
          .eq("file_hash", sha256)
          .neq("status", "excluded")
          .maybeSingle();
        if (existing) return { sourceId: existing.id as string, duplicate: true };
      }
      throw new Error(insertError.message);
    }
    return { sourceId, duplicate: false };
  }

  async createRun(config: RunConfig): Promise<string> {
    const { data, error } = await this.client.from("ai_estimate_batch_runs").insert({
      organization_id: this.env.organizationId,
      command: config.command,
      mode: "live",
      requested_limit: config.requestedLimit,
      confirmed_all: config.confirmedAll,
      prompt_version: config.promptVersion,
      extraction_version: config.extractionVersion,
      extraction_model: config.extractionModel,
      retry_model: config.retryModel,
      concurrency: config.concurrency,
      created_by: this.env.actorUserId,
    }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "배치 실행을 생성할 수 없습니다.");
    return data.id as string;
  }

  async assertExternalProcessingAllowed(source?: BatchSource): Promise<void> {
    return this.assertProcessingAllowed(source, true);
  }

  async assertProcessingAllowed(source?: BatchSource, requiresExternal = false): Promise<void> {
    if (!this.env.actorUserId) throw new Error("외부 처리는 AI_ESTIMATE_ACTOR_USER_ID 설정이 필요합니다.");
    const { data: membership, error: memberError } = await this.client.from("organization_members")
      .select("role").eq("organization_id", this.env.organizationId).eq("user_id", this.env.actorUserId).maybeSingle();
    if (memberError || !canWriteOrganizationBusinessData(membership?.role)) throw new Error("조직 자료 처리 권한이 없습니다.");
    const { data: settings, error } = await this.client.from("ai_estimate_settings")
      .select("enabled, allow_external_processing, allow_private_sources").eq("organization_id", this.env.organizationId).maybeSingle();
    // Missing settings use the product defaults: enabled, with no external/private opt-in.
    if (error || settings?.enabled === false || (requiresExternal && !settings?.allow_external_processing)) {
      throw new Error("조직 자료 처리 설정을 확인해 주세요.");
    }
    if (source && (source.organization_id !== this.env.organizationId
      || (source.visibility === "private" && (source.uploaded_by !== this.env.actorUserId || !settings?.allow_private_sources)))) {
      throw new Error("개인 자료 외부 처리 범위를 벗어났습니다.");
    }
  }

  async queueJobs(input: { retryOnly: boolean; limit: number | null; maxAttempt: number; sourceId?: string; forceRetry?: boolean }): Promise<number> {
    const { data, error } = await this.client.rpc("ai_estimate_queue_jobs", {
      p_organization_id: this.env.organizationId, p_retry_only: input.retryOnly,
      p_limit: input.limit, p_max_attempt: input.maxAttempt, p_source_id: input.sourceId ?? null,
      p_actor_user_id: this.env.actorUserId, p_force_retry: input.forceRetry ?? false,
    });
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  }

  async advanceJobStatus(
    job: BatchJob,
    nextStatus: ProcessingStatus,
  ): Promise<BatchJob> {
    assertTransition(job.status, nextStatus);
    const { data, error } = await this.client.from("ai_estimate_jobs").update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
      .eq("id", job.id)
      .eq("organization_id", this.env.organizationId)
      .eq("status", job.status)
      .eq("attempt", job.attempt)
      .eq("last_run_id", job.last_run_id)
      .select("id, organization_id, source_id, status, attempt, max_attempt, last_run_id")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? `상태 전이 실패: ${job.status} -> ${nextStatus}`);
    }
    return data as BatchJob;
  }

  async claimJobs(runId: string, worker: string, limit: number, sourceId?: string): Promise<BatchJob[]> {
    const { data, error } = await this.client.rpc("ai_estimate_claim_jobs", {
      p_organization_id: this.env.organizationId,
      p_run_id: runId,
      p_worker: worker,
      p_limit: limit,
      p_source_id: sourceId ?? null,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as BatchJob[];
  }

  async getSource(sourceId: string): Promise<BatchSource> {
    const { data, error } = await this.client.from("ai_estimate_sources")
      .select("id, organization_id, title, storage_path, mime_type, page_count, status, visibility, uploaded_by, document_kind")
      .eq("organization_id", this.env.organizationId)
      .eq("id", sourceId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "AI 견적 원본을 찾을 수 없습니다.");
    return data as BatchSource;
  }

  async downloadSource(source: BatchSource): Promise<Blob> {
    if (!isCanonicalEstimateSourcePath(this.env.organizationId, source)) {
      throw new GeminiBatchError("원본 파일 경로가 자료의 조직과 일치하지 않습니다.", "auth", false, "invalid_source_storage_path");
    }
    const signal = AbortSignal.timeout(30_000);
    try {
      const { data, error } = await this.client.storage
        .from(this.env.storageBucket)
        .download(source.storage_path!, {}, { signal });
      if (error || !data) throw new Error(error?.message ?? "원본 파일 다운로드 실패");
      return data;
    } catch (error) {
      if (signal.aborted) throw new GeminiBatchError("원본 파일 다운로드 시간이 초과되었습니다.", "timeout", true, "storage_download_timeout");
      throw error;
    }
  }

  async recordExtraction(input: ExtractionPersistence): Promise<boolean> {
    assertTransition(input.job.status, "needs_review");
    const { data, error } = await this.client.rpc("ai_estimate_finish_extraction", {
      p_job_id: input.job.id, p_attempt: input.job.attempt, p_run_id: input.runId,
      p_result: {
        outcome: "succeeded", provider: input.provider ?? "gemini", model: input.model, promptVersion: input.promptVersion,
        extractionVersion: input.extractionVersion, rawOutput: input.rawOutput, normalized: input.normalized,
        confidence: input.normalized.confidence, reviewExtraction: input.reviewExtraction,
        reviewReasons: input.reviewReasons, inputTokens: input.inputTokens, outputTokens: input.outputTokens,
        estimatedCostMicroUsd: input.estimatedCostMicroUsd, latencyMs: input.latencyMs,
      },
    });
    if (error) throw new Error(error.message);
    return data === true;
  }

  async recordFailure(input: {
    provider?: "gemini" | "anthropic" | "local";
    job: BatchJob; source: BatchSource | null; runId: string; model: string;
    promptVersion: string; extractionVersion: string; error: GeminiBatchError;
  }): Promise<void> {
    const { error } = await this.client.rpc("ai_estimate_finish_extraction", {
      p_job_id: input.job.id, p_attempt: input.job.attempt, p_run_id: input.runId,
      p_result: {
        outcome: input.error.errorClass === "invalid_json" ? "invalid_json" : input.error.errorClass === "schema" ? "schema_failed" : "api_failed",
        provider: input.provider ?? "gemini", model: input.model, promptVersion: input.promptVersion, extractionVersion: input.extractionVersion,
        errorCode: input.error.code, errorClass: input.error.errorClass, retryable: input.error.retryable,
      },
    });
    if (error) throw new Error(error.message);
  }

  async prepareManualReview(source: BatchSource, warning: string): Promise<void> {
    const { error } = await this.client.rpc("ai_estimate_prepare_manual_review", {
      p_source_id: source.id, p_extraction: manualReviewScaffold(source.title, source.document_kind ?? "estimate", warning),
    });
    if (error) throw new Error(error.message);
  }

  async finishRun(
    runId: string,
    status: "completed" | "aborted" | "failed",
    registeredDuplicateCount = 0,
  ): Promise<void> {
    const { data: jobs, error: jobsError } = await this.client.from("ai_estimate_jobs")
      .select("status")
      .eq("organization_id", this.env.organizationId)
      .eq("last_run_id", runId);
    if (jobsError) throw new Error(jobsError.message);
    const { data: extractions, error: extractionError } = await this.client
      .from("ai_estimate_extraction_runs")
      .select("input_tokens, output_tokens, estimated_cost_micro_usd")
      .eq("organization_id", this.env.organizationId)
      .eq("batch_run_id", runId);
    if (extractionError) throw new Error(extractionError.message);

    const counts = new Map<string, number>();
    for (const row of jobs ?? []) counts.set(row.status as string, (counts.get(row.status as string) ?? 0) + 1);
    const inputTokens = (extractions ?? []).reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0);
    const outputTokens = (extractions ?? []).reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0);
    const estimatedCost = (extractions ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_micro_usd ?? 0), 0);
    const failed = (counts.get("failed_retryable") ?? 0) + (counts.get("failed_permanent") ?? 0);

    const { error } = await this.client.from("ai_estimate_batch_runs").update({
      status,
      finished_at: new Date().toISOString(),
      total_candidates: jobs?.length ?? 0,
      processed_count: jobs?.length ?? 0,
      needs_review_count: counts.get("needs_review") ?? 0,
      approved_count: (counts.get("approved") ?? 0) + (counts.get("indexed") ?? 0),
      failed_count: failed,
      duplicate_count: (counts.get("duplicate") ?? 0) + registeredDuplicateCount,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_micro_usd: estimatedCost,
    }).eq("id", runId).eq("organization_id", this.env.organizationId);
    if (error) throw new Error(error.message);
  }

  async pendingSummary(): Promise<Record<string, number>> {
    const { data, error } = await this.client.from("ai_estimate_jobs")
      .select("status")
      .eq("organization_id", this.env.organizationId);
    if (error) throw new Error(error.message);
    const result: Record<string, number> = {};
    for (const row of data ?? []) result[row.status as string] = (result[row.status as string] ?? 0) + 1;
    return result;
  }

  async duplicateHashSummary(): Promise<{ groups: number; rows: number }> {
    const groups = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.client.from("ai_estimate_sources")
        .select("file_hash")
        .eq("organization_id", this.env.organizationId)
        .neq("status", "excluded")
        .not("file_hash", "is", null)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        const hash = row.file_hash as string;
        groups.set(hash, (groups.get(hash) ?? 0) + 1);
      }
      if (!data || data.length < 1000) break;
    }
    const duplicateGroups = [...groups.values()].filter((count) => count > 1);
    return { groups: duplicateGroups.length, rows: duplicateGroups.reduce((sum, count) => sum + count, 0) };
  }

  async getRunReport(runId: string): Promise<unknown> {
    const { data, error } = await this.client.from("ai_estimate_batch_runs")
      .select("*")
      .eq("id", runId)
      .eq("organization_id", this.env.organizationId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async listUnembeddedChunks(limit: number, model: string, sourceId?: string): Promise<IndexChunkRow[]> {
    await this.assertExternalProcessingAllowed();
    let query = this.client.from("ai_estimate_chunks")
      .select("id, content, example_id, ai_estimate_examples!inner(source_id, visibility, owner_user_id, ai_estimate_sources!inner(status, organization_id))")
      .eq("organization_id", this.env.organizationId)
      .eq("ai_estimate_examples.ai_estimate_sources.organization_id", this.env.organizationId)
      .eq("ai_estimate_examples.ai_estimate_sources.status", "approved")
      .or(`embedding_vector.is.null,embedding_model.neq.${model}`)
      .limit(limit);
    // Private sources are indexed only on the individual owner's explicit path.
    if (sourceId) query = query.eq("ai_estimate_examples.source_id", sourceId);
    else query = query.eq("ai_estimate_examples.visibility", "organization");
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const chunks = (data ?? []) as unknown as IndexChunkRow[];
    for (const chunk of chunks) {
      const example = Array.isArray(chunk.ai_estimate_examples) ? chunk.ai_estimate_examples[0] : chunk.ai_estimate_examples;
      if (example) await this.assertExternalProcessingAllowed(await this.getSource(example.source_id));
    }
    return chunks;
  }

  async saveEmbedding(chunk: IndexChunkRow, values: number[], model: string): Promise<boolean> {
    if (values.length !== 1536 || values.some((value) => !Number.isFinite(value))) throw new Error("임베딩은 유한한 1536차원 벡터여야 합니다.");
    const { data, error } = await this.client.rpc("ai_estimate_save_embedding", {
      p_chunk_id: chunk.id, p_organization_id: this.env.organizationId, p_content: chunk.content,
      p_vector: `[${values.join(",")}]`, p_model: model,
    });
    if (error) throw new Error(error.message);
    return data === true;
  }

  async rebuildPriceStats(): Promise<number> {
    const { data, error } = await this.client.rpc("ai_estimate_rebuild_price_stats", {
      p_organization_id: this.env.organizationId,
    });
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  }
}
