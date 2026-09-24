import { setTimeout as delay } from "node:timers/promises";
import {
  ApiError,
  createPartFromUri,
  GoogleGenAI,
} from "@google/genai";
import type { GeminiEnv } from "./env";
import {
  GEMINI_EXTRACTION_RESPONSE_SCHEMA,
  parseExtractionResult,
  type EstimateExtractionResult,
  type SourceDocumentKind,
} from "./extraction-schema";
import {
  buildExtractionUserPrompt,
  EXTRACTION_SYSTEM_INSTRUCTION,
} from "./extraction-prompt";

export type GeminiErrorClass =
  | "network"
  | "rate_limit"
  | "server"
  | "auth"
  | "invalid_json"
  | "schema"
  | "unsupported_file"
  | "timeout"
  | "unknown";

export class GeminiBatchError extends Error {
  constructor(
    message: string,
    readonly errorClass: GeminiErrorClass,
    readonly retryable: boolean,
    readonly code: string,
  ) {
    super(message);
    this.name = "GeminiBatchError";
  }
}

export interface GeminiExtractionInput {
  data: Blob;
  mimeType: string;
  displayName: string;
  pageCount: number | null;
  model: string;
  documentKind?: SourceDocumentKind;
}

export interface GeminiExtractionOutput {
  result: EstimateExtractionResult;
  rawOutput: unknown;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

function apiError(error: unknown): GeminiBatchError {
  if (error instanceof GeminiBatchError) return error;
  if (error instanceof ApiError) {
    const status = Number(error.status);
    if (status === 401 || status === 403) return new GeminiBatchError("Gemini 인증 실패", "auth", false, `http_${status}`);
    if (status === 429) return new GeminiBatchError("Gemini 요청 한도 초과", "rate_limit", true, "http_429");
    if (status >= 500) return new GeminiBatchError("Gemini 서버 오류", "server", true, `http_${status}`);
    if (status === 408) return new GeminiBatchError("Gemini 요청 시간 초과", "timeout", true, "http_408");
    return new GeminiBatchError("Gemini 요청 실패", "unknown", false, `http_${status || "unknown"}`);
  }
  if (error instanceof Error && /TimeoutError|AbortError/.test(error.name)) {
    return new GeminiBatchError("Gemini 요청 시간이 초과되었습니다.", "timeout", true, "request_timeout");
  }
  if (error instanceof Error && /fetch|network|socket|ECONN/i.test(error.message)) {
    return new GeminiBatchError("Gemini 네트워크 오류", "network", true, "network_error");
  }
  return new GeminiBatchError("Gemini 처리 중 알 수 없는 오류", "unknown", false, "unknown_error");
}

export function normalizeVector(values: number[]): number[] {
  if (values.length !== 1536 || values.some((value) => !Number.isFinite(value))) {
    throw new GeminiBatchError("임베딩 벡터 형식 오류", "schema", false, "invalid_embedding");
  }
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) throw new GeminiBatchError("빈 임베딩", "schema", false, "empty_embedding");
  return values.map((value) => value / norm);
}

export type GeminiProviderClient = {
  files: Pick<GoogleGenAI["files"], "upload" | "get" | "delete">;
  models: Pick<GoogleGenAI["models"], "generateContent" | "embedContent">;
};
interface GeminiProviderOptions {
  client?: GeminiProviderClient;
  /** Shorter limits are injectable for offline timeout regression tests. */
  operationTimeoutMs?: number;
  cleanupTimeoutMs?: number;
  pollIntervalMs?: number;
}

export class GeminiEstimateProvider {
  readonly provider = "gemini";
  private readonly ai: GeminiProviderClient;
  private readonly operationTimeoutMs: number;
  private readonly cleanupTimeoutMs: number;
  private readonly pollIntervalMs: number;

  constructor(private readonly env: GeminiEnv, options: GeminiProviderOptions = {}) {
    this.ai = options.client ?? new GoogleGenAI({ apiKey: env.apiKey });
    this.operationTimeoutMs = Math.max(1, Math.min(180_000, options.operationTimeoutMs ?? 180_000));
    this.cleanupTimeoutMs = Math.max(1, Math.min(10_000, options.cleanupTimeoutMs ?? 10_000));
    this.pollIntervalMs = Math.max(1, Math.min(2_000, options.pollIntervalMs ?? 2_000));
  }

  async extract(input: GeminiExtractionInput): Promise<GeminiExtractionOutput> {
    const startedAt = Date.now();
    const deadline = startedAt + this.operationTimeoutMs;
    const operationSignal = AbortSignal.timeout(this.operationTimeoutMs);
    const stepSignal = (milliseconds: number) => AbortSignal.any([operationSignal, AbortSignal.timeout(milliseconds)]);
    let uploadedName: string | undefined;
    try {
      const uploaded = await this.ai.files.upload({
        file: input.data,
        config: {
          mimeType: input.mimeType,
          displayName: input.displayName,
          abortSignal: stepSignal(120_000),
        },
      });
      uploadedName = uploaded.name;
      if (!uploaded.name || !uploaded.uri || !uploaded.mimeType) {
        throw new GeminiBatchError("Gemini 파일 업로드 결과가 불완전함", "unsupported_file", false, "file_upload_incomplete");
      }

      let file = uploaded;
      for (let attempt = 0; file.state === "PROCESSING" && attempt < 30; attempt += 1) {
        if (operationSignal.aborted || Date.now() >= deadline) break;
        await delay(Math.min(this.pollIntervalMs, Math.max(1, deadline - Date.now())), undefined, { signal: operationSignal });
        if (operationSignal.aborted || Date.now() >= deadline) break;
        file = await this.ai.files.get({ name: uploaded.name, config: { abortSignal: stepSignal(10_000) } });
      }
      if (file.state === "PROCESSING") {
        throw new GeminiBatchError("Gemini 파일 처리 시간 초과", "timeout", true, "file_processing_timeout");
      }
      if (file.state === "FAILED") {
        throw new GeminiBatchError("Gemini가 파일을 처리하지 못함", "unsupported_file", false, "file_processing_failed");
      }

      operationSignal.throwIfAborted();
      const response = await this.ai.models.generateContent({
        model: input.model,
        contents: [
          createPartFromUri(file.uri ?? uploaded.uri, file.mimeType ?? uploaded.mimeType),
          buildExtractionUserPrompt({ mimeType: input.mimeType, pageCount: input.pageCount, documentKind: input.documentKind }),
        ],
        config: {
          systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: GEMINI_EXTRACTION_RESPONSE_SCHEMA,
          maxOutputTokens: 16000,
          abortSignal: stepSignal(120_000),
        },
      });

      if (response.candidates?.[0]?.finishReason !== "STOP") {
        const reason = response.candidates?.[0]?.finishReason;
        const blocked = Boolean(response.promptFeedback?.blockReason) || Boolean(reason && ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(reason));
        throw new GeminiBatchError("문서 추출 응답이 끝까지 완료되지 않았습니다.", "schema", !blocked, blocked ? "extraction_refused" : "incomplete_response");
      }
      const text = response.text;
      if (!text) throw new GeminiBatchError("Gemini JSON 응답이 비어 있음", "invalid_json", true, "empty_response");
      let rawOutput: unknown;
      try {
        rawOutput = JSON.parse(text);
      } catch {
        throw new GeminiBatchError("Gemini JSON 파싱 실패", "invalid_json", true, "invalid_json");
      }
      const parsed = parseExtractionResult(rawOutput);
      if (!parsed.ok) {
        throw new GeminiBatchError(`Gemini 스키마 검증 실패: ${parsed.issues.join(", ")}`, "schema", true, "schema_failed");
      }

      return {
        result: parsed.value,
        rawOutput,
        model: input.model,
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      throw apiError(error);
    } finally {
      if (uploadedName) {
        await this.ai.files.delete({ name: uploadedName, config: { abortSignal: AbortSignal.timeout(this.cleanupTimeoutMs) } }).catch(() => undefined);
      }
    }
  }

  async embed(content: string, operationSignal?: AbortSignal): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({
        model: this.env.embeddingModel,
        contents: content,
        config: {
          outputDimensionality: 1536,
          abortSignal: operationSignal ? AbortSignal.any([operationSignal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
          taskType: "RETRIEVAL_DOCUMENT",
          title: content.slice(0, 120),
        },
      });
      const values = response.embeddings?.[0]?.values;
      if (!values?.length) throw new GeminiBatchError("Gemini 임베딩 응답이 비어 있음", "schema", true, "empty_embedding");
      return normalizeVector(values);
    } catch (error) {
      throw apiError(error);
    }
  }
}
