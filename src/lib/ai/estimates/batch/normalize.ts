import type { AiEstimateExtraction } from "../schemas";
import { normalizeItemName } from "../normalize";
import type {
  EstimateExtractionLine,
  EstimateExtractionResult,
} from "./extraction-schema";

const UNIT_ALIASES: Record<string, string> = {
  ea: "個",
  pc: "個",
  pcs: "個",
  piece: "個",
  pieces: "個",
  個: "個",
  ケ: "個",
  式: "式",
  set: "式",
  台: "台",
  本: "本",
  枚: "枚",
  人: "人",
  時間: "時間",
  日: "日",
  月: "月",
  m: "m",
  "ｍ": "m",
  "㎡": "㎡",
  m2: "㎡",
  "m²": "㎡",
  "㎥": "㎥",
  m3: "㎥",
  "m³": "㎥",
  kg: "kg",
  "㎏": "kg",
};

export interface NormalizedExtractionLine extends EstimateExtractionLine {
  normalizedItemName: string | null;
  normalizedUnit: string | null;
  computedAmount: number | null;
  amountDelta: number | null;
}

export interface NormalizedEstimateExtraction {
  schemaVersion: string;
  document: EstimateExtractionResult["document"];
  supplier: EstimateExtractionResult["supplier"];
  customer: EstimateExtractionResult["customer"];
  totals: EstimateExtractionResult["totals"] & {
    computedSubtotal: number | null;
    computedTax: number | null;
    computedTotal: number | null;
    totalDelta: number | null;
  };
  lines: NormalizedExtractionLine[];
  tableRecognitionFailed: boolean;
  confidence: number | null;
  notes: string[];
  warnings: string[];
}

export function normalizeUnit(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return null;
  return UNIT_ALIASES[normalized.toLocaleLowerCase()] ?? normalized;
}

function computedLineAmount(line: EstimateExtractionLine): number | null {
  if (line.quantity === null || line.unitPrice === null) return null;
  const amount = line.quantity * line.unitPrice;
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount))) return null;
  return Math.round(amount);
}

export function normalizeExtraction(input: EstimateExtractionResult): NormalizedEstimateExtraction {
  const lines = input.lines.map((line): NormalizedExtractionLine => {
    const computedAmount = computedLineAmount(line);
    return {
      ...line,
      normalizedItemName: line.rawItemName ? normalizeItemName(line.rawItemName) : null,
      normalizedUnit: normalizeUnit(line.rawUnit),
      computedAmount,
      amountDelta:
        line.printedAmount !== null && computedAmount !== null
          ? line.printedAmount - computedAmount
          : null,
    };
  });

  const computable = lines.filter((line) => line.computedAmount !== null);
  const computedSubtotal = computable.length === lines.length && lines.length > 0
    ? computable.reduce((sum, line) => sum + (line.computedAmount ?? 0), 0)
    : null;
  const computedTax =
    input.totals.printedTax !== null ? input.totals.printedTax : null;
  const computedTotal = computedSubtotal !== null && computedTax !== null
    ? computedSubtotal - (input.totals.printedDiscount ?? 0) + computedTax
    : null;

  return {
    ...input,
    lines,
    totals: {
      ...input.totals,
      computedSubtotal,
      computedTax,
      computedTotal,
      totalDelta:
        input.totals.printedTotal !== null && computedTotal !== null
          ? input.totals.printedTotal - computedTotal
          : null,
    },
  };
}

function taxCategoryFromLine(
  line: NormalizedExtractionLine,
): AiEstimateExtraction["lines"][number]["taxCategory"] {
  if (line.printedTaxRatePercent === 0) return "exempt";
  if (line.printedTaxRatePercent === 5) return "standard_5";
  if (line.printedTaxRatePercent === 8) return "reduced_8";
  if (line.printedTaxRatePercent === 10) return "standard_10";
  return "follow_company";
}

/** 기존 ai-library 검수 UI가 읽는 현재 추출 형태로 변환한다. */
export function toReviewExtraction(
  normalized: NormalizedEstimateExtraction,
  sourceTitle: string,
): AiEstimateExtraction {
  const usableLines = normalized.lines.filter((line) => line.rawItemName?.trim());
  const reviewLines: AiEstimateExtraction["lines"] = usableLines.length
    ? usableLines.slice(0, 80).map((line) => ({
      name: (line.rawItemName ?? "").slice(0, 255),
      qty: Math.max(0, line.quantity ?? 1),
      unit: (line.rawUnit ?? "").slice(0, 50),
      unitPrice: Math.max(0, line.unitPrice ?? 0),
      taxCategory: taxCategoryFromLine(line),
      confidence: Math.min(1, Math.max(0, line.confidence ?? 0)),
      reason: [line.specification, line.description].filter(Boolean).join(" · ").slice(0, 500),
    }))
    : [{
      name: "확인 필요",
      qty: 1,
      unit: "",
      unitPrice: 0,
      taxCategory: "follow_company",
      confidence: 0,
      reason: "명세 표를 자동으로 추출하지 못했습니다. 원본 문서를 확인해 주세요.",
    }];
  return {
    clientName: normalized.customer.name ?? "",
    clientId: null,
    subject: sourceTitle.slice(0, 70),
    issueDate: normalized.document.issueDate,
    templateMessage: "",
    remarks: normalized.notes.join("\n").slice(0, 5000),
    rawText: "",
    confidence: Math.min(1, Math.max(0, normalized.confidence ?? 0)),
    lines: reviewLines,
    warnings: normalized.warnings.slice(0, 20).map((value) => value.slice(0, 500)),
  };
}
