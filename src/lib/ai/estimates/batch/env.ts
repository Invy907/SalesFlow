/**
 * 배치 환경변수 검증.
 *
 * 규칙(가이드라인 15항):
 * - Gemini 키와 Service Role 키에는 NEXT_PUBLIC_ 을 붙이지 않는다.
 * - dry-run 은 API 를 호출하지 않으므로 GEMINI_API_KEY 없이도 동작해야 한다.
 *   그래서 검증을 두 단계(loadBatchEnv / requireGeminiEnv)로 나눈다.
 *
 * NEXT_PUBLIC_SUPABASE_URL 만 예외적으로 기존 이름을 그대로 쓴다. raon-flow 전역이
 * 이 이름을 쓰고 있고 URL 자체는 공개 값이기 때문이다. 키는 SUPABASE_SERVICE_ROLE_KEY.
 */

export interface BatchEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  organizationId: string;
  /** 로컬 파일을 신규 등록할 때 uploaded_by 로 사용할 사용자. */
  actorUserId: string | null;
  /** 로컬 스캔 대상 폴더. 미설정이면 Storage 버킷만 스캔한다. */
  sourceDir: string | null;
  storageBucket: string;
  concurrency: number;
  maxRetry: number;
  /** 이 값 미만이면 자동 승인하지 않는다. */
  confidenceThreshold: number;
  /** printedTotal 과 computedTotal 허용 오차(통화 최소단위). */
  totalToleranceMinorUnits: number;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export interface GeminiEnv {
  apiKey: string;
  extractionModel: string;
  retryModel: string;
  embeddingModel: string;
}

export class BatchEnvError extends Error {
  constructor(readonly missing: string[], readonly invalid: string[]) {
    const parts = [
      missing.length ? `누락: ${missing.join(", ")}` : "",
      invalid.length ? `형식 오류: ${invalid.join(", ")}` : "",
    ].filter(Boolean);
    super(`환경변수 설정 오류 — ${parts.join(" / ")}`);
    this.name = "BatchEnvError";
  }
}

function intFromEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
  invalid: string[],
): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    invalid.push(`${name}(${min}~${max} 정수)`);
    return fallback;
  }
  return value;
}

function floatFromEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
  invalid: string[],
): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    invalid.push(`${name}(${min}~${max})`);
    return fallback;
  }
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Supabase 접속과 배치 튜닝 값만 검증한다. dry-run 이 쓰는 경로. */
export function loadBatchEnv(): BatchEnv {
  const missing: string[] = [];
  const invalid: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? "";

  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  const organizationId = process.env.AI_ESTIMATE_ORGANIZATION_ID ?? "";
  if (!organizationId) missing.push("AI_ESTIMATE_ORGANIZATION_ID");
  else if (!isUuid(organizationId)) invalid.push("AI_ESTIMATE_ORGANIZATION_ID(UUID)");
  const actorUserId = process.env.AI_ESTIMATE_ACTOR_USER_ID || null;
  if (actorUserId && !isUuid(actorUserId)) invalid.push("AI_ESTIMATE_ACTOR_USER_ID(UUID)");

  for (const publicName of ["NEXT_PUBLIC_GEMINI_API_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]) {
    if (process.env[publicName]) invalid.push(`${publicName}(비밀키에 NEXT_PUBLIC_ 금지)`);
  }

  const env: BatchEnv = {
    supabaseUrl,
    supabaseServiceRoleKey,
    organizationId,
    actorUserId,
    sourceDir: process.env.AI_ESTIMATE_SOURCE_DIR || null,
    storageBucket: process.env.AI_ESTIMATE_STORAGE_BUCKET || "ai-estimate-sources",
    concurrency: intFromEnv("AI_ESTIMATE_BATCH_CONCURRENCY", 3, 1, 16, invalid),
    maxRetry: intFromEnv("AI_ESTIMATE_MAX_RETRY", 3, 1, 10, invalid),
    confidenceThreshold: floatFromEnv("AI_ESTIMATE_CONFIDENCE_THRESHOLD", 0.8, 0, 1, invalid),
    totalToleranceMinorUnits: intFromEnv("AI_ESTIMATE_TOTAL_TOLERANCE", 1, 0, 1000, invalid),
    inputUsdPerMillionTokens: floatFromEnv("AI_ESTIMATE_INPUT_USD_PER_MILLION", 0.3, 0, 1000, invalid),
    outputUsdPerMillionTokens: floatFromEnv("AI_ESTIMATE_OUTPUT_USD_PER_MILLION", 2.5, 0, 1000, invalid),
  };

  if (missing.length || invalid.length) throw new BatchEnvError(missing, invalid);
  return env;
}

/** 실제 API 호출 직전에만 부른다. */
export function requireGeminiEnv(): GeminiEnv {
  const missing: string[] = [];
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) missing.push("GEMINI_API_KEY");
  if (missing.length) throw new BatchEnvError(missing, []);

  return {
    apiKey,
    extractionModel: process.env.GEMINI_EXTRACTION_MODEL || "gemini-3.5-flash-lite",
    retryModel: process.env.GEMINI_RETRY_MODEL || "gemini-3.6-flash",
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  };
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
