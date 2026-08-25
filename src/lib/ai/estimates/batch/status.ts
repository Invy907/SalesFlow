/**
 * AI 견적 배치 처리 상태 모델.
 *
 * 119 마이그레이션의 `ai_estimate_sources.status` 는 6개 값
 * (uploaded/processing/review_required/approved/failed/excluded)만 갖는다.
 * 배치는 그보다 세분화된 13개 상태가 필요하므로 121 마이그레이션에서
 * `ai_estimate_jobs.status` 로 분리하고, 기존 ai-library UI 호환을 위해
 * sources.status 에는 legacy 값을 계속 써준다.
 *
 * 주의: 이 파일은 CLI(tsx)와 Next.js 양쪽에서 import 되므로 `"server-only"` 을
 * 넣지 않는다. raon-flow 는 server-only 패키지를 직접 설치하지 않고 Next 번들러의
 * 내장 alias 에 의존하므로, Next 밖(순수 node/tsx)에서는 해석되지 않는다.
 */

export const PROCESSING_STATUSES = [
  "uploaded",
  "queued",
  "extracting",
  "extracted",
  "validating",
  "needs_review",
  "approved",
  "indexing",
  "indexed",
  "failed_retryable",
  "failed_permanent",
  "rejected",
  "duplicate",
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

/** 더 이상 자동으로 움직이지 않는 상태. 배치 대상 조회에서 제외한다. */
export const TERMINAL_STATUSES: readonly ProcessingStatus[] = [
  "indexed",
  "failed_permanent",
  "rejected",
  "duplicate",
];

/** 자동 재시도 대상 상태. */
export const RETRYABLE_STATUSES: readonly ProcessingStatus[] = ["failed_retryable"];

/**
 * 허용된 상태 전이. 여기에 없는 이동은 코드 버그로 취급한다.
 *
 * - needs_review → queued : 사람이 "재처리"를 눌렀을 때 (상위 모델로 재추출)
 * - indexed → queued      : 프롬프트/모델 버전을 올려 전체 재처리할 때
 * - failed_permanent → queued : 사람이 명시적으로 되살릴 때만
 */
const TRANSITIONS: Record<ProcessingStatus, readonly ProcessingStatus[]> = {
  uploaded: ["queued", "duplicate", "rejected"],
  queued: ["extracting", "duplicate", "rejected"],
  extracting: ["extracted", "failed_retryable", "failed_permanent"],
  extracted: ["validating", "failed_retryable", "failed_permanent"],
  validating: ["needs_review", "approved", "failed_retryable", "failed_permanent"],
  needs_review: ["approved", "rejected", "queued"],
  approved: ["indexing", "rejected"],
  indexing: ["indexed", "failed_retryable", "failed_permanent"],
  indexed: ["queued"],
  failed_retryable: ["queued", "failed_permanent", "rejected"],
  failed_permanent: ["queued"],
  rejected: [],
  duplicate: [],
};

export function isProcessingStatus(value: unknown): value is ProcessingStatus {
  return typeof value === "string"
    && (PROCESSING_STATUSES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: ProcessingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: ProcessingStatus, to: ProcessingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidStatusTransitionError extends Error {
  constructor(
    readonly from: ProcessingStatus,
    readonly to: ProcessingStatus,
  ) {
    super(`허용되지 않은 상태 전이: ${from} -> ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

/** 전이가 불가능하면 throw. Repository 의 상태 변경은 전부 이 함수를 통과해야 한다. */
export function assertTransition(from: ProcessingStatus, to: ProcessingStatus): void {
  if (!canTransition(from, to)) throw new InvalidStatusTransitionError(from, to);
}

export function nextStatuses(from: ProcessingStatus): readonly ProcessingStatus[] {
  return TRANSITIONS[from];
}

/* ------------------------------------------------------------------ */
/* 119 스키마(sources.status) 호환 매핑                                */
/* ------------------------------------------------------------------ */

export const LEGACY_SOURCE_STATUSES = [
  "uploaded",
  "processing",
  "review_required",
  "approved",
  "failed",
  "excluded",
] as const;

export type LegacySourceStatus = (typeof LEGACY_SOURCE_STATUSES)[number];

const LEGACY_MAP: Record<ProcessingStatus, LegacySourceStatus> = {
  uploaded: "uploaded",
  queued: "processing",
  extracting: "processing",
  extracted: "processing",
  validating: "processing",
  needs_review: "review_required",
  approved: "approved",
  indexing: "approved",
  indexed: "approved",
  failed_retryable: "failed",
  failed_permanent: "failed",
  rejected: "excluded",
  duplicate: "excluded",
};

/** 배치 상태 → 기존 ai-library UI 가 읽는 sources.status */
export function toLegacySourceStatus(status: ProcessingStatus): LegacySourceStatus {
  return LEGACY_MAP[status];
}
