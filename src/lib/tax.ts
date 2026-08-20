import type { z } from "zod";
import { taxCategorySchema, taxRoundingSchema } from "@/lib/validators/document";

export type TaxCategory = z.infer<typeof taxCategorySchema>;
export type TaxRounding = z.infer<typeof taxRoundingSchema>;

/** 화면 세율 라벨 ↔ DB enum */
export const TAX_LABEL_TO_CATEGORY: Record<string, TaxCategory> = {
  "10%": "standard_10",
  "軽減8%": "reduced_8",
  "8%": "standard_8",
  "対象外": "exempt",
  "5%": "standard_5",
};

export const TAX_CATEGORY_TO_LABEL: Record<TaxCategory, string> = {
  follow_company: "10%",
  standard_10: "10%",
  reduced_8: "軽減8%",
  standard_8: "8%",
  exempt: "対象外",
  standard_5: "5%",
};

export const TAX_CATEGORY_RATE: Record<TaxCategory, number> = {
  follow_company: 0.1,
  standard_10: 0.1,
  reduced_8: 0.08,
  standard_8: 0.08,
  exempt: 0,
  standard_5: 0.05,
};

export function taxCategoryFromLabel(label: string): TaxCategory {
  return TAX_LABEL_TO_CATEGORY[label] ?? "standard_10";
}

export function taxRateFor(category: TaxCategory): number {
  return TAX_CATEGORY_RATE[category] ?? 0.1;
}

export function taxRateSnapshotFor(category: TaxCategory): number {
  return taxRateFor(category);
}

export function applyRounding(value: number, rounding: TaxRounding): number {
  if (rounding === "round_up") return Math.ceil(value);
  if (rounding === "round_half") return Math.round(value);
  return Math.floor(value);
}
