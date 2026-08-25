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

export type TotalsLine = {
  qty: number;
  unitPrice: number;
  taxCategory: TaxCategory;
};

export type DocumentTotals = {
  subtotal: number;
  tax: number;
  total: number;
  /** 세율 구분별 내역 (적격청구서 표기에 필요) */
  breakdown: Array<{ taxCategory: TaxCategory; rate: number; taxableAmount: number; taxAmount: number }>;
};

/**
 * 소계는 행별 절사 없이 합산하고, 세액은 세율 그룹별로 한 번만 반올림한다.
 * (일본 적격청구서 제도의 "세율마다 1회 단수처리" 규칙)
 */
export function computeDocumentTotals(
  lines: TotalsLine[],
  rounding: TaxRounding = "round_down",
): DocumentTotals {
  const groups = new Map<TaxCategory, number>();
  let subtotal = 0;

  for (const line of lines) {
    const amount = line.qty * line.unitPrice;
    subtotal += amount;
    groups.set(line.taxCategory, (groups.get(line.taxCategory) ?? 0) + amount);
  }

  const breakdown = [...groups.entries()]
    .filter(([, taxable]) => taxable > 0)
    .map(([taxCategory, taxableAmount]) => {
      const rate = taxRateFor(taxCategory);
      return {
        taxCategory,
        rate,
        taxableAmount: Math.floor(taxableAmount),
        taxAmount: applyRounding(taxableAmount * rate, rounding),
      };
    });

  const tax = breakdown.reduce((sum, entry) => sum + entry.taxAmount, 0);
  const flooredSubtotal = Math.floor(subtotal);

  return { subtotal: flooredSubtotal, tax, total: flooredSubtotal + tax, breakdown };
}
