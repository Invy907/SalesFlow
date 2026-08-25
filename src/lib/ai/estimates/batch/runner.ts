import os from "node:os";
import type { BatchEnv, GeminiEnv } from "./env";
import { EXTRACTION_SCHEMA_VERSION } from "./extraction-schema";
import {
  extractionPromptFingerprint,
} from "./extraction-prompt";
import {
  GeminiBatchError,
  GeminiEstimateProvider,
} from "./gemini";
import {
  discoverLocalEstimateFiles,
  readAndHashLocalFile,
} from "./local-files";
import { toReviewExtraction } from "./normalize";
import {
  AiEstimateBatchRepository,
  type BatchCommand,
  type BatchJob,
  type BatchSource,
} from "./repository";
import { validateExtraction } from "./validate";

export interface RunExtractionOptions {
  command: Extract<BatchCommand, "smoke" | "pilot" | "ingest" | "retry">;
  limit: number | null;
  all: boolean;
  resume: boolean;
  sourceId?: string;
}

export interface BatchResult {
  runId: string;
  registered: number;
  duplicates: number;
  queued: number;
  processed: number;
  succeeded: number;
  failed: number;
}

function estimatedCostMicroUsd(
  env: BatchEnv,
  inputTokens: number,
  outputTokens: number,
): number {
  return Math.round(
    inputTokens * env.inputUsdPerMillionTokens
    + outputTokens * env.outputUsdPerMillionTokens,
  );
}

function safeError(error: unknown): GeminiBatchError {
  if (error instanceof GeminiBatchError) return error;
  return new GeminiBatchError(
    "배치 내부 처리 실패",
    "unknown",
    false,
    error instanceof Error && /storage/i.test(error.message) ? "storage_error" : "internal_error",
  );
}

async function registerLocalSources(
  repository: AiEstimateBatchRepository,
  env: BatchEnv,
  limit: number | null,
): Promise<{ registered: number; duplicates: number }> {
  if (!env.sourceDir) return { registered: 0, duplicates: 0 };
  const files = await discoverLocalEstimateFiles(env.sourceDir);
  const existingHashes = await repository.activeFileHashes();
  let registered = 0;
  let duplicates = 0;
  for (const file of files) {
    if (limit !== null && registered >= limit) break;
    const { bytes, sha256 } = await readAndHashLocalFile(file);
    if (existingHashes.has(sha256)) {
      duplicates += 1;
      continue;
    }
    const result = await repository.registerLocalSource(file, bytes, sha256);
    if (result.duplicate) duplicates += 1;
    else {
      registered += 1;
      existingHashes.add(sha256);
    }
  }
  return { registered, duplicates };
}

async function processJob(input: {
  job: BatchJob;
  runId: string;
  repository: AiEstimateBatchRepository;
  provider: GeminiEstimateProvider;
  env: BatchEnv;
  geminiEnv: GeminiEnv;
}): Promise<boolean> {
  const { runId, repository, provider, env, geminiEnv } = input;
  let job = input.job;
  const model = job.attempt > 1 ? geminiEnv.retryModel : geminiEnv.extractionModel;
  let source: BatchSource | null = null;
  try {
    source = await repository.getSource(job.source_id);
    const data = await repository.downloadSource(source);
    const extracted = await provider.extract({
      data,
      mimeType: source.mime_type ?? "application/pdf",
      displayName: `estimate-${source.id}`,
      pageCount: source.page_count,
      model,
    });
    job = await repository.advanceJobStatus(job, "extracted");
    const validation = validateExtraction(extracted.result, {
      confidenceThreshold: env.confidenceThreshold,
      totalToleranceMinorUnits: env.totalToleranceMinorUnits,
    });
    job = await repository.advanceJobStatus(job, "validating");
    const reviewExtraction = toReviewExtraction(validation.normalized, source.title);
    if (!reviewExtraction.lines.length) validation.reviewReasons.push("missing_lines");

    await repository.recordExtraction({
      job,
      source,
      runId,
      model,
      promptVersion: extractionPromptFingerprint(),
      extractionVersion: EXTRACTION_SCHEMA_VERSION,
      rawOutput: extracted.rawOutput,
      normalized: validation.normalized,
      reviewExtraction,
      reviewReasons: [...new Set(validation.reviewReasons)],
      inputTokens: extracted.inputTokens,
      outputTokens: extracted.outputTokens,
      estimatedCostMicroUsd: estimatedCostMicroUsd(env, extracted.inputTokens, extracted.outputTokens),
      latencyMs: extracted.latencyMs,
    });
    return true;
  } catch (error) {
    await repository.recordFailure({
      job,
      source,
      runId,
      model,
      promptVersion: extractionPromptFingerprint(),
      extractionVersion: EXTRACTION_SCHEMA_VERSION,
      error: safeError(error),
    });
    return false;
  }
}

export async function runExtractionBatch(
  repository: AiEstimateBatchRepository,
  provider: GeminiEstimateProvider,
  env: BatchEnv,
  geminiEnv: GeminiEnv,
  options: RunExtractionOptions,
): Promise<BatchResult> {
  const promptVersion = extractionPromptFingerprint();
  const runId = await repository.createRun({
    command: options.command,
    requestedLimit: options.limit,
    confirmedAll: options.all,
    promptVersion,
    extractionVersion: EXTRACTION_SCHEMA_VERSION,
    extractionModel: geminiEnv.extractionModel,
    retryModel: geminiEnv.retryModel,
    concurrency: env.concurrency,
  });
  let runStatus: "completed" | "failed" = "completed";
  let registration = { registered: 0, duplicates: 0 };
  let queued = 0;
  const maximum = options.limit ?? Number.MAX_SAFE_INTEGER;
  let reservations = 0;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  async function nextJob(worker: string): Promise<BatchJob | null> {
    if (reservations >= maximum) return null;
    reservations += 1;
    try {
      const jobs = await repository.claimJobs(runId, worker, 1);
      if (!jobs[0]) {
        reservations -= 1;
        return null;
      }
      return jobs[0];
    } catch (error) {
      reservations -= 1;
      throw error;
    }
  }

  try {
    if (options.command !== "retry" && !options.resume && !options.sourceId) {
      registration = await registerLocalSources(repository, env, options.limit);
    }
    if (!options.resume) {
      queued = await repository.queueJobs({
        retryOnly: options.command === "retry",
        limit: options.limit,
        maxAttempt: env.maxRetry,
        sourceId: options.sourceId,
      });
    }
    await Promise.all(Array.from({ length: env.concurrency }, async (_, index) => {
      const worker = `${os.hostname()}:${process.pid}:${index + 1}`;
      for (;;) {
        const job = await nextJob(worker);
        if (!job) return;
        const ok = await processJob({ job, runId, repository, provider, env, geminiEnv });
        processed += 1;
        if (ok) succeeded += 1;
        else failed += 1;
      }
    }));
  } catch (error) {
    runStatus = "failed";
    throw error;
  } finally {
    await repository.finishRun(runId, runStatus, registration.duplicates);
  }

  return {
    runId,
    registered: registration.registered,
    duplicates: registration.duplicates,
    queued,
    processed,
    succeeded,
    failed,
  };
}

export async function dryRunSummary(
  repository: AiEstimateBatchRepository,
  env: BatchEnv,
): Promise<unknown> {
  const pending = await repository.pendingSummary();
  const duplicates = await repository.duplicateHashSummary();
  if (!env.sourceDir) return { sourceDir: null, localFiles: 0, pending, duplicateHashes: duplicates };
  const files = await discoverLocalEstimateFiles(env.sourceDir);
  const oversized = files.filter((file) => file.size > 20 * 1024 * 1024).length;
  return {
    sourceDir: env.sourceDir,
    localFiles: files.length,
    oversized,
    pending,
    duplicateHashes: duplicates,
  };
}

export async function reindexApprovedSources(
  repository: AiEstimateBatchRepository,
  provider: GeminiEstimateProvider,
  geminiEnv: GeminiEnv,
  limit: number,
): Promise<{ embedded: number; priceStats: number }> {
  const chunks = await repository.listUnembeddedChunks(limit);
  let embedded = 0;
  for (const chunk of chunks) {
    const vector = await provider.embed(chunk.content);
    await repository.saveEmbedding(chunk, vector, geminiEnv.embeddingModel);
    embedded += 1;
  }
  const priceStats = await repository.rebuildPriceStats();
  return { embedded, priceStats };
}
