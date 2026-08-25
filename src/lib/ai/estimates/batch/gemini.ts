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
  if (error instanceof Error && /fetch|network|socket|ECONN/i.test(error.message)) {
    return new GeminiBatchError("Gemini 네트워크 오류", "network", true, "network_error");
  }
  return new GeminiBatchError("Gemini 처리 중 알 수 없는 오류", "unknown", false, "unknown_error");
}

function normalizeVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) throw new GeminiBatchError("빈 임베딩", "schema", false, "empty_embedding");
  return values.map((value) => value / norm);
}

export class GeminiEstimateProvider {
  private readonly ai: GoogleGenAI;

  constructor(private readonly env: GeminiEnv) {
    this.ai = new GoogleGenAI({ apiKey: env.apiKey });
  }

  async extract(input: GeminiExtractionInput): Promise<GeminiExtractionOutput> {
    const startedAt = Date.now();
    let uploadedName: string | undefined;
    try {
      const uploaded = await this.ai.files.upload({
        file: input.data,
        config: {
          mimeType: input.mimeType,
          displayName: input.displayName,
          abortSignal: AbortSignal.timeout(120_000),
        },
      });
      uploadedName = uploaded.name;
      if (!uploaded.name || !uploaded.uri || !uploaded.mimeType) {
        throw new GeminiBatchError("Gemini 파일 업로드 결과가 불완전함", "unsupported_file", false, "file_upload_incomplete");
      }

      let file = uploaded;
      for (let attempt = 0; file.state === "PROCESSING" && attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        file = await this.ai.files.get({ name: uploaded.name });
      }
      if (file.state === "PROCESSING") {
        throw new GeminiBatchError("Gemini 파일 처리 시간 초과", "timeout", true, "file_processing_timeout");
      }
      if (file.state === "FAILED") {
        throw new GeminiBatchError("Gemini가 파일을 처리하지 못함", "unsupported_file", false, "file_processing_failed");
      }

      const response = await this.ai.models.generateContent({
        model: input.model,
        contents: [
          createPartFromUri(file.uri ?? uploaded.uri, file.mimeType ?? uploaded.mimeType),
          buildExtractionUserPrompt({ mimeType: input.mimeType, pageCount: input.pageCount }),
        ],
        config: {
          systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: GEMINI_EXTRACTION_RESPONSE_SCHEMA,
          abortSignal: AbortSignal.timeout(120_000),
        },
      });

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
        await this.ai.files.delete({ name: uploadedName }).catch(() => undefined);
      }
    }
  }

  async embed(content: string): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({
        model: this.env.embeddingModel,
        contents: content,
        config: {
          outputDimensionality: 1536,
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
