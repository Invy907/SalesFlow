import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AiEstimateExtraction } from "../schemas";
import type { BatchEnv } from "./env";
import type { GeminiBatchError } from "./gemini";
import type { LocalEstimateFile } from "./local-files";
import type { NormalizedEstimateExtraction } from "./normalize";
import { assertTransition, type ProcessingStatus } from "./status";

export type BatchCommand = "smoke" | "pilot" | "ingest" | "retry" | "reindex" | "verify";

export interface BatchSource {
  id: string;
  organization_id: string;
  title: string;
  storage_path: string | null;
  mime_type: string | null;
  page_count: number | null;
  status: string;
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
  return ".jpg";
}

export class AiEstimateBatchRepository {
  readonly client: SupabaseClient;

  constructor(readonly env: BatchEnv) {
    this.client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
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
      title: path.parse(file.fileName).name.slice(0, 255),
      original_file_name: file.fileName,
      storage_path: storagePath,
      mime_type: file.mimeType,
      file_size: file.size,
      file_hash: sha256,
      visibility: "company",
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

  async queueJobs(input: {
    retryOnly: boolean;
    limit: number | null;
    maxAttempt: number;
    sourceId?: string;
  }): Promise<number> {
    let query = this.client.from("ai_estimate_jobs")
      .select("id, source_id")
      .eq("organization_id", this.env.organizationId)
      .eq("status", input.retryOnly ? "failed_retryable" : "uploaded")
      .order("created_at", { ascending: true });
    if (input.sourceId) query = query.eq("source_id", input.sourceId);
    if (input.limit !== null) query = query.limit(input.limit);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((row) => row.id as string);
    const sourceIds = (data ?? []).map((row) => row.source_id as string);
    if (!ids.length) return 0;
    const { error: updateError } = await this.client.from("ai_estimate_jobs").update({
      status: "queued",
      max_attempt: input.maxAttempt,
      next_retry_at: null,
      locked_at: null,
      locked_by: null,
      last_error_code: null,
      last_error_class: null,
    }).in("id", ids);
    if (updateError) throw new Error(updateError.message);
    const { error: sourceError } = await this.client.from("ai_estimate_sources").update({
      status: "processing",
      error_message: null,
    })
      .eq("organization_id", this.env.organizationId)
      .in("id", sourceIds);
    if (sourceError) throw new Error(sourceError.message);
    return ids.length;
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
      .select("id, organization_id, source_id, status, attempt, max_attempt, last_run_id")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? `상태 전이 실패: ${job.status} -> ${nextStatus}`);
    }
    return data as BatchJob;
  }

  async claimJobs(runId: string, worker: string, limit: number): Promise<BatchJob[]> {
    const { data, error } = await this.client.rpc("ai_estimate_claim_jobs", {
      p_organization_id: this.env.organizationId,
      p_run_id: runId,
      p_worker: worker,
      p_limit: limit,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as BatchJob[];
  }

  async getSource(sourceId: string): Promise<BatchSource> {
    const { data, error } = await this.client.from("ai_estimate_sources")
      .select("id, organization_id, title, storage_path, mime_type, page_count, status")
      .eq("organization_id", this.env.organizationId)
      .eq("id", sourceId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "AI 견적 원본을 찾을 수 없습니다.");
    return data as BatchSource;
  }

  async downloadSource(source: BatchSource): Promise<Blob> {
    if (!source.storage_path || !source.mime_type) throw new Error("저장 경로 또는 MIME 타입이 없습니다.");
    const { data, error } = await this.client.storage
      .from(this.env.storageBucket)
      .download(source.storage_path);
    if (error || !data) throw new Error(error?.message ?? "원본 파일 다운로드 실패");
    return data;
  }

  async recordExtraction(input: ExtractionPersistence): Promise<void> {
    assertTransition(input.job.status, "needs_review");
    const { data: run, error: runError } = await this.client
      .from("ai_estimate_extraction_runs")
      .insert({
        organization_id: this.env.organizationId,
        source_id: input.source.id,
        batch_run_id: input.runId,
        provider: "gemini",
        model: input.model,
        prompt_version: input.promptVersion,
        extraction_version: input.extractionVersion,
        attempt: input.job.attempt,
        raw_output: input.rawOutput,
        normalized_output: input.normalized,
        confidence: input.normalized.confidence,
        outcome: "succeeded",
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        estimated_cost_micro_usd: input.estimatedCostMicroUsd,
        latency_ms: input.latencyMs,
      })
      .select("id")
      .single();
    if (runError || !run) throw new Error(runError?.message ?? "추출 이력 저장 실패");

    const { error: extractionError } = await this.client.from("ai_estimate_extractions").upsert({
      organization_id: this.env.organizationId,
      source_id: input.source.id,
      extracted_data: input.reviewExtraction,
      raw_text: "",
      confidence: input.normalized.confidence ?? 0,
      provider: "gemini",
      model: input.model,
      extraction_run_id: run.id,
      prompt_version: input.promptVersion,
      extraction_version: input.extractionVersion,
      source_of_truth: "ai",
    }, { onConflict: "source_id" });
    if (extractionError) throw new Error(extractionError.message);

    const { error: sourceError } = await this.client.from("ai_estimate_sources").update({
      status: "review_required",
      error_message: null,
    }).eq("id", input.source.id).eq("organization_id", this.env.organizationId);
    if (sourceError) throw new Error(sourceError.message);

    const { data: updatedJob, error: jobError } = await this.client.from("ai_estimate_jobs").update({
      status: "needs_review",
      review_reasons: input.reviewReasons,
      locked_at: null,
      locked_by: null,
      finished_at: new Date().toISOString(),
      last_error_code: null,
      last_error_class: null,
    })
      .eq("id", input.job.id)
      .eq("organization_id", this.env.organizationId)
      .eq("status", input.job.status)
      .select("id")
      .maybeSingle();
    if (jobError || !updatedJob) throw new Error(jobError?.message ?? "검수 대기 상태 저장 충돌");
  }

  async recordFailure(input: {
    job: BatchJob;
    source: BatchSource | null;
    runId: string;
    model: string;
    promptVersion: string;
    extractionVersion: string;
    error: GeminiBatchError;
  }): Promise<void> {
    const retryable = input.error.retryable && input.job.attempt < input.job.max_attempt;
    const status: ProcessingStatus = retryable ? "failed_retryable" : "failed_permanent";
    assertTransition(input.job.status, status);
    const outcome = input.error.errorClass === "invalid_json"
      ? "invalid_json"
      : input.error.errorClass === "schema" ? "schema_failed" : "api_failed";

    const { error: runError } = await this.client.from("ai_estimate_extraction_runs").insert({
      organization_id: this.env.organizationId,
      source_id: input.job.source_id,
      batch_run_id: input.runId,
      provider: "gemini",
      model: input.model,
      prompt_version: input.promptVersion,
      extraction_version: input.extractionVersion,
      attempt: input.job.attempt,
      outcome,
      error_code: input.error.code,
      error_class: input.error.errorClass,
    });
    if (runError && runError.code !== "23505") throw new Error(runError.message);

    const retryAt = retryable
      ? new Date(Date.now() + Math.min(60_000, 2 ** input.job.attempt * 1_000)).toISOString()
      : null;
    const { data: updatedJob, error: jobError } = await this.client.from("ai_estimate_jobs").update({
      status,
      next_retry_at: retryAt,
      last_error_code: input.error.code,
      last_error_class: input.error.errorClass,
      locked_at: null,
      locked_by: null,
      finished_at: new Date().toISOString(),
    })
      .eq("id", input.job.id)
      .eq("organization_id", this.env.organizationId)
      .eq("status", input.job.status)
      .select("id")
      .maybeSingle();
    if (jobError || !updatedJob) throw new Error(jobError?.message ?? "실패 상태 저장 충돌");

    if (input.source) {
      await this.client.from("ai_estimate_sources").update({
        status: "failed",
        error_message: input.error.code,
      }).eq("id", input.source.id).eq("organization_id", this.env.organizationId);
    }
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

  async listUnembeddedChunks(limit: number): Promise<IndexChunkRow[]> {
    const { data, error } = await this.client.from("ai_estimate_chunks")
      .select("id, content, example_id, ai_estimate_examples!inner(source_id)")
      .eq("organization_id", this.env.organizationId)
      .is("embedding_vector", null)
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as IndexChunkRow[];
  }

  async saveEmbedding(chunk: IndexChunkRow, values: number[], model: string): Promise<void> {
    const vector = `[${values.join(",")}]`;
    const { error } = await this.client.from("ai_estimate_chunks").update({
      embedding_vector: vector,
      embedding_model: model,
      embedding_dim: values.length,
    }).eq("id", chunk.id).eq("organization_id", this.env.organizationId);
    if (error) throw new Error(error.message);
    const example = Array.isArray(chunk.ai_estimate_examples)
      ? chunk.ai_estimate_examples[0]
      : chunk.ai_estimate_examples;
    if (example?.source_id) {
      await this.client.from("ai_estimate_jobs").update({
        status: "indexed",
        finished_at: new Date().toISOString(),
      }).eq("source_id", example.source_id).eq("organization_id", this.env.organizationId);
    }
  }

  async rebuildPriceStats(): Promise<number> {
    const { data, error } = await this.client.rpc("ai_estimate_rebuild_price_stats", {
      p_organization_id: this.env.organizationId,
    });
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  }
}
