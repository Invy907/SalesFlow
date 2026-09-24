import type { EstimateExtractionResult } from "./extraction-schema";
import {
  normalizeExtraction,
  type NormalizedEstimateExtraction,
} from "./normalize";

export const REVIEW_REASONS = [
  "missing_customer",
  "missing_issue_date",
  "missing_total",
  "missing_lines",
  "missing_item_name",
  "table_recognition_failed",
  "low_confidence",
  "line_amount_mismatch",
  "subtotal_mismatch",
  "total_mismatch",
  "negative_amount",
  "unsafe_number",
  "missing_work_details",
] as const;

export type ReviewReason = (typeof REVIEW_REASONS)[number];

export interface ValidationOptions {
  confidenceThreshold: number;
  totalToleranceMinorUnits: number;
}

export interface ValidationResult {
  normalized: NormalizedEstimateExtraction;
  reviewReasons: ReviewReason[];
  isStructurallyValid: boolean;
}

function hasUnsafeNumber(input: EstimateExtractionResult): boolean {
  const values: Array<number | null> = [
    input.totals.printedSubtotal,
    input.totals.printedDiscount,
    input.totals.printedTax,
    input.totals.printedTotal,
    ...input.lines.flatMap((line) => [
      line.quantity,
      line.unitPrice,
      line.printedAmount,
      line.printedTaxRatePercent,
    ]),
  ];
  return values.some((value) => value !== null && (!Number.isFinite(value) || Math.abs(value) > 9_000_000_000_000_000));
}

export function validateExtraction(
  input: EstimateExtractionResult,
  options: ValidationOptions,
): ValidationResult {
  const normalized = normalizeExtraction(input);
  const reasons = new Set<ReviewReason>();
  const contextOnly = input.documentKind === "design" || input.documentKind === "work_scope";
  const estimate = !input.documentKind || input.documentKind === "estimate";

  if (estimate && !input.customer.name?.trim()) reasons.add("missing_customer");
  if (estimate && !input.document.issueDate) reasons.add("missing_issue_date");
  if (estimate && input.totals.printedTotal === null) reasons.add("missing_total");
  if (!contextOnly && !input.lines.length) reasons.add("missing_lines");
  if (contextOnly && (input.workDetails?.trim().length ?? 0) < 3) reasons.add("missing_work_details");
  if (input.lines.some((line) => !line.rawItemName?.trim())) reasons.add("missing_item_name");
  if (input.tableRecognitionFailed) reasons.add("table_recognition_failed");
  if ((input.confidence ?? 0) < options.confidenceThreshold) reasons.add("low_confidence");
  if (normalized.lines.some((line) =>
    line.amountDelta !== null && Math.abs(line.amountDelta) > options.totalToleranceMinorUnits
  )) reasons.add("line_amount_mismatch");
  if (
    input.totals.printedSubtotal !== null
    && normalized.totals.computedSubtotal !== null
    && Math.abs(input.totals.printedSubtotal - normalized.totals.computedSubtotal) > options.totalToleranceMinorUnits
  ) reasons.add("subtotal_mismatch");
  if (
    normalized.totals.totalDelta !== null
    && Math.abs(normalized.totals.totalDelta) > options.totalToleranceMinorUnits
  ) reasons.add("total_mismatch");
  if (
    [input.totals.printedSubtotal, input.totals.printedTax, input.totals.printedTotal]
      .some((value) => value !== null && value < 0)
    || input.lines.some((line) =>
      [line.quantity, line.unitPrice, line.printedAmount].some((value) => value !== null && value < 0)
    )
  ) reasons.add("negative_amount");
  if (hasUnsafeNumber(input)) reasons.add("unsafe_number");

  return {
    normalized,
    reviewReasons: [...reasons],
    isStructurallyValid: (contextOnly ? (input.workDetails?.trim().length ?? 0) >= 3 : input.lines.length > 0) && !hasUnsafeNumber(input),
  };
}
