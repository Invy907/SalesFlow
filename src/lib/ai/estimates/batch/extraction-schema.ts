/**
 * Gemini 추출 결과 스키마 (SSOT).
 *
 * 3중 보존 원칙에 따라 이 파일이 정의하는 것은 **Gemini 원본 출력**의 모양이다.
 * 정규화 결과(normalized_*)와 사람 수정 결과(reviewed_*)는 별도 타입/컬럼으로 관리하고,
 * 여기서 정의한 값은 절대 덮어쓰지 않는다.
 *
 * 통화·세율 기준은 raon-flow SalesFlow 기존 구현과 동일하게 **JPY / 일본 세율**이다.
 * 금액은 전부 정수(엔 단위)로 받는다. 부동소수점 계산을 하지 않기 위한 것이며,
 * 소수 수량만 number 로 허용한다.
 *
 * 주의: CLI(tsx)에서도 import 하므로 `"server-only"` 을 넣지 않는다.
 */

import { z } from "zod";

/** 스키마를 바꾸면 반드시 올린다. DB의 extraction_version 에 그대로 저장된다. */
export const EXTRACTION_SCHEMA_VERSION = "1.0.0";

export const SUPPORTED_CURRENCIES = ["JPY", "KRW", "USD", "EUR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const TAX_MODES = ["included", "excluded", "unknown"] as const;
export type TaxMode = (typeof TAX_MODES)[number];

/* ------------------------------------------------------------------ */
/* TypeScript 타입                                                     */
/* ------------------------------------------------------------------ */

export interface EstimateExtractionLine {
  lineNumber: number;
  rawItemName: string | null;
  specification: string | null;
  quantity: number | null;
  rawUnit: string | null;
  /** 문서에 인쇄된 단가. 정수(통화 최소단위). */
  unitPrice: number | null;
  /** 문서에 인쇄된 금액. quantity * unitPrice 로 계산하지 않는다. */
  printedAmount: number | null;
  /** 행에 세율이 명시돼 있을 때만. 추론 금지. 10 / 8 / 5 / 0 */
  printedTaxRatePercent: number | null;
  description: string | null;
  confidence: number | null;
}

export interface EstimateExtractionResult {
  schemaVersion: string;

  document: {
    estimateNumber: string | null;
    issueDate: string | null;
    validUntil: string | null;
    currency: string | null;
    language: string | null;
  };

  supplier: {
    name: string | null;
    businessNumber: string | null;
    contactName: string | null;
  };

  customer: {
    name: string | null;
    businessNumber: string | null;
    contactName: string | null;
  };

  totals: {
    printedSubtotal: number | null;
    printedDiscount: number | null;
    printedTax: number | null;
    printedTotal: number | null;
    taxMode: TaxMode;
  };

  lines: EstimateExtractionLine[];

  /** 표 구조를 읽지 못했으면 true. lines 가 비어도 이 값으로 원인을 구분한다. */
  tableRecognitionFailed: boolean;
  /** 모델 자기보고 신뢰도. 임계값 미달이면 needs_review. */
  confidence: number | null;
  notes: string[];
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* zod 검증 (Gemini 응답 파싱 직후 1차 게이트)                          */
/* ------------------------------------------------------------------ */

/** 금액: 정수만. 음수도 일단 통과시키고 validator 가 needs_review 로 분류한다. */
const amount = z.number().int().finite().nullable();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다").nullable();
const text = (max: number) => z.string().max(max).nullable();

export const extractionLineSchema: z.ZodType<EstimateExtractionLine> = z.object({
  lineNumber: z.number().int().min(1).max(500),
  rawItemName: text(500),
  specification: text(1000),
  quantity: z.number().finite().nullable(),
  rawUnit: text(50),
  unitPrice: amount,
  printedAmount: amount,
  printedTaxRatePercent: z.number().finite().min(0).max(100).nullable(),
  description: text(2000),
  confidence: z.number().min(0).max(1).nullable(),
});

export const extractionResultSchema: z.ZodType<EstimateExtractionResult> = z.object({
  schemaVersion: z.string().min(1).max(20),
  document: z.object({
    estimateNumber: text(100),
    issueDate: isoDate,
    validUntil: isoDate,
    currency: text(10),
    language: text(20),
  }),
  supplier: z.object({
    name: text(255),
    businessNumber: text(50),
    contactName: text(255),
  }),
  customer: z.object({
    name: text(255),
    businessNumber: text(50),
    contactName: text(255),
  }),
  totals: z.object({
    printedSubtotal: amount,
    printedDiscount: amount,
    printedTax: amount,
    printedTotal: amount,
    taxMode: z.enum(TAX_MODES),
  }),
  lines: z.array(extractionLineSchema).max(500),
  tableRecognitionFailed: z.boolean(),
  confidence: z.number().min(0).max(1).nullable(),
  notes: z.array(z.string().max(1000)).max(50),
  warnings: z.array(z.string().max(1000)).max(50),
});

export type ExtractionParseResult =
  | { ok: true; value: EstimateExtractionResult }
  | { ok: false; issues: string[] };

/**
 * Gemini 가 돌려준 JSON 문자열을 검증한다.
 * 실패 사유는 문서 내용이 아니라 **필드 경로와 규칙 이름만** 담는다(14장 로깅 규칙).
 */
export function parseExtractionResult(raw: unknown): ExtractionParseResult {
  const parsed = extractionResultSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.code}`),
  };
}

/* ------------------------------------------------------------------ */
/* Gemini responseSchema (구조화 출력 강제용)                          */
/* ------------------------------------------------------------------ */

/**
 * Gemini 의 responseSchema 는 OpenAPI 3.0 의 부분집합만 받는다.
 * minLength/maxLength/additionalProperties 등은 넣으면 거부되므로 쓰지 않고,
 * 길이 제한은 위의 zod 로 사후 검증한다. propertyOrdering 은 출력 안정성을 위해 명시한다.
 */
export const GEMINI_EXTRACTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "schemaVersion", "document", "supplier", "customer",
    "totals", "lines", "tableRecognitionFailed", "confidence", "notes", "warnings",
  ],
  propertyOrdering: [
    "schemaVersion", "document", "supplier", "customer",
    "totals", "lines", "tableRecognitionFailed", "confidence", "notes", "warnings",
  ],
  properties: {
    schemaVersion: { type: "STRING", description: `항상 "${EXTRACTION_SCHEMA_VERSION}"` },
    document: {
      type: "OBJECT",
      required: ["estimateNumber", "issueDate", "validUntil", "currency", "language"],
      propertyOrdering: ["estimateNumber", "issueDate", "validUntil", "currency", "language"],
      properties: {
        estimateNumber: { type: "STRING", nullable: true, description: "見積番号. 없으면 null" },
        issueDate: { type: "STRING", nullable: true, description: "YYYY-MM-DD. 和暦은 서기로 변환. 불확실하면 null" },
        validUntil: { type: "STRING", nullable: true, description: "YYYY-MM-DD. 없으면 null" },
        currency: { type: "STRING", nullable: true, description: "JPY / KRW / USD / EUR 중 문서에 보이는 것. 불확실하면 null" },
        language: { type: "STRING", nullable: true, description: "ja / ko / en 등" },
      },
    },
    supplier: {
      type: "OBJECT",
      required: ["name", "businessNumber", "contactName"],
      propertyOrdering: ["name", "businessNumber", "contactName"],
      properties: {
        name: { type: "STRING", nullable: true, description: "견적을 발행한 쪽(자사). 없으면 null" },
        businessNumber: { type: "STRING", nullable: true, description: "登録番号/사업자번호. 문서에 인쇄된 것만" },
        contactName: { type: "STRING", nullable: true },
      },
    },
    customer: {
      type: "OBJECT",
      required: ["name", "businessNumber", "contactName"],
      propertyOrdering: ["name", "businessNumber", "contactName"],
      properties: {
        name: { type: "STRING", nullable: true, description: "견적을 받는 쪽(거래처). 御中/様 등 경칭은 제거" },
        businessNumber: { type: "STRING", nullable: true },
        contactName: { type: "STRING", nullable: true },
      },
    },
    totals: {
      type: "OBJECT",
      required: ["printedSubtotal", "printedDiscount", "printedTax", "printedTotal", "taxMode"],
      propertyOrdering: ["printedSubtotal", "printedDiscount", "printedTax", "printedTotal", "taxMode"],
      properties: {
        printedSubtotal: { type: "INTEGER", nullable: true, description: "문서에 인쇄된 소계. 직접 계산하지 말 것" },
        printedDiscount: { type: "INTEGER", nullable: true, description: "인쇄된 할인액. 없으면 null(0 아님)" },
        printedTax: { type: "INTEGER", nullable: true, description: "인쇄된 소비세액" },
        printedTotal: { type: "INTEGER", nullable: true, description: "인쇄된 합계" },
        taxMode: { type: "STRING", enum: [...TAX_MODES], description: "税込=included, 税抜=excluded, 판단 불가=unknown" },
      },
    },
    lines: {
      type: "ARRAY",
      description: "견적 명세 행. 소계·세액·합계 행은 포함하지 않는다",
      items: {
        type: "OBJECT",
        required: [
          "lineNumber", "rawItemName", "specification", "quantity",
          "rawUnit", "unitPrice", "printedAmount", "printedTaxRatePercent", "description", "confidence",
        ],
        propertyOrdering: [
          "lineNumber", "rawItemName", "specification", "quantity",
          "rawUnit", "unitPrice", "printedAmount", "printedTaxRatePercent", "description", "confidence",
        ],
        properties: {
          lineNumber: { type: "INTEGER", description: "1부터 시작하는 표시 순서" },
          rawItemName: { type: "STRING", nullable: true, description: "문서에 적힌 품목명 그대로. 표준화·번역 금지" },
          specification: { type: "STRING", nullable: true, description: "規格/仕様 열" },
          quantity: { type: "NUMBER", nullable: true, description: "수량. 소수 허용" },
          rawUnit: { type: "STRING", nullable: true, description: "단위 그대로(式/個/台/㎡ 등). 변환 금지" },
          unitPrice: { type: "INTEGER", nullable: true, description: "인쇄된 단가. 통화기호와 쉼표만 제거" },
          printedAmount: { type: "INTEGER", nullable: true, description: "인쇄된 금액. 수량×단가로 계산하지 말 것" },
          printedTaxRatePercent: { type: "NUMBER", nullable: true, description: "행에 세율이 인쇄된 경우만(10/8/5/0). 추론 금지" },
          description: { type: "STRING", nullable: true, description: "備考 등 행 부속 설명" },
          confidence: { type: "NUMBER", nullable: true, description: "이 행을 읽은 확신도 0~1" },
        },
      },
    },
    tableRecognitionFailed: { type: "BOOLEAN", description: "명세 표를 구조적으로 읽지 못했으면 true" },
    confidence: { type: "NUMBER", nullable: true, description: "문서 전체 추출 확신도 0~1" },
    notes: { type: "ARRAY", description: "문서 하단 조건·유효기간 등 원문 메모", items: { type: "STRING" } },
    warnings: { type: "ARRAY", description: "읽기 어려웠던 부분. 개인정보는 넣지 말 것", items: { type: "STRING" } },
  },
} as const;
