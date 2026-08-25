/**
 * 추출 프롬프트. 코드에 고정하지 않고 **버전**으로 관리한다(가이드라인 12항).
 *
 * PROMPT_VERSION 을 올리면 DB의 UNIQUE(source_id, prompt_version, model, attempt) 덕분에
 * 같은 문서를 새 버전으로 다시 추출해도 기존 행을 덮어쓰지 않고 새 행이 쌓인다.
 * 프롬프트를 한 글자라도 바꾸면 반드시 버전을 올리고 회귀 테스트를 다시 돌린다.
 */

import { EXTRACTION_SCHEMA_VERSION } from "./extraction-schema";

export const EXTRACTION_PROMPT_VERSION = "2026-08-21.1";

/**
 * 모델에 넘길 시스템 지시문.
 * 절대 규칙은 전부 부정형("~하지 않는다")으로 쓴다. 모델이 빈칸을 채우려는 경향을 막기 위한 것.
 */
export const EXTRACTION_SYSTEM_INSTRUCTION = [
  "당신은 일본어 견적서(見積書)를 읽어 구조화 데이터로 변환하는 추출기다.",
  "판단이나 요약을 하지 않고, 문서에 인쇄된 내용만 지정된 JSON 스키마로 옮긴다.",
  "",
  "절대 규칙:",
  "1. 문서에 보이지 않는 값을 만들지 않는다. 확실하지 않으면 null 을 넣는다.",
  "2. 빈 문자열을 쓰지 않는다. 값이 없으면 반드시 null 이다.",
  "3. 품목명을 표준화·번역·교정하지 않는다. 오탈자도 그대로 옮긴다.",
  "4. 인쇄된 금액과 계산된 금액을 섞지 않는다. printedAmount 에 수량×단가를 넣지 않는다.",
  "5. 할인·소비세를 직접 계산하지 않는다. 인쇄돼 있지 않으면 null 이다.",
  "6. 숫자에서는 통화기호(¥ ￥ 円 원 $)와 쉼표만 제거한다. 단위를 바꾸거나 자리수를 보정하지 않는다.",
  "7. 개인정보(이름·연락처·계좌·사업자번호)를 새로 추론하지 않는다. 인쇄된 것만 옮긴다.",
  "8. 세율은 행이나 표에 인쇄된 경우에만 printedTaxRatePercent 에 넣는다. 기본값 10 을 가정하지 않는다.",
  "9. 소계·소비세·합계 행은 lines 에 넣지 않는다. totals 로만 옮긴다.",
  "10. 명세 표의 열 구조를 확신할 수 없으면 tableRecognitionFailed = true 로 두고 읽은 만큼만 넣는다.",
  "11. warnings 에 문서 원문이나 개인정보를 복사하지 않는다. 어떤 부분이 왜 어려웠는지만 짧게 쓴다.",
  "",
  "날짜 규칙:",
  "- 令和6年5月1日 같은 和暦은 서기 YYYY-MM-DD 로 변환한다.",
  "- 연도가 없으면 추측하지 않고 null 을 넣는다.",
  "",
  `schemaVersion 에는 항상 "${EXTRACTION_SCHEMA_VERSION}" 을 넣는다.`,
].join("\n");

export interface ExtractionPromptContext {
  /** 파일 형식만 알려준다. 파일명·거래처명 등 힌트는 주지 않는다(모델 유도 방지). */
  mimeType: string;
  /** 여러 페이지 PDF 인 경우 총 페이지 수. 모르면 null. */
  pageCount: number | null;
}

export function buildExtractionUserPrompt(context: ExtractionPromptContext): string {
  const lines = [
    "첨부된 견적서를 지정된 JSON 스키마로 추출하라.",
    `입력 형식: ${context.mimeType}`,
  ];
  if (context.pageCount && context.pageCount > 1) {
    lines.push(
      `이 문서는 ${context.pageCount}페이지다. 모든 페이지의 명세 행을 lineNumber 로 이어서 번호를 매긴다.`,
      "페이지마다 반복되는 머리글·바닥글은 lines 에 넣지 않는다.",
    );
  }
  lines.push("스키마에 없는 키를 추가하지 않는다.");
  return lines.join("\n");
}

/** DB에 저장할 프롬프트 식별자. 모델명·attempt 와 함께 UNIQUE 키를 이룬다. */
export function extractionPromptFingerprint(): string {
  return `${EXTRACTION_PROMPT_VERSION}/schema-${EXTRACTION_SCHEMA_VERSION}`;
}
