import type { z } from "zod";
import type { taxCategorySchema, taxRoundingSchema, taxDisplaySchema, withholdingTypeSchema } from "@/lib/validators/document";

export type TaxCategory = z.infer<typeof taxCategorySchema>;
export type TaxRounding = z.infer<typeof taxRoundingSchema>;
export type TaxDisplay = z.infer<typeof taxDisplaySchema>;
export type WithholdingType = z.infer<typeof withholdingTypeSchema>;

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
  if (rounding === "round_half") return Math.sign(value) * Math.round(Math.abs(value));
  return Math.floor(value);
}

export type TotalsLine = {
  qty: number;
  unitPrice: number;
  taxCategory: TaxCategory;
  withholdingExempt?: boolean;
};

export type DocumentTaxOptions = {
  taxDisplay?: TaxDisplay;
  withholdingType?: WithholdingType;
  documentType?: "estimate" | "invoice" | "delivery_note" | "receipt";
};

export type DocumentTotals = {
  subtotal: number;
  tax: number;
  withholding: number;
  total: number;
  breakdown: Array<{ taxCategory: TaxCategory; rate: number; taxableAmount: number; taxAmount: number }>;
};

// Match the database's numeric(18,4) quantity precision, without binary floating
// point errors (for example 0.29 * 100 must be 29, not 28.999999999999996).
const SCALE = BigInt(10_000);
function scaledAmount(line: Pick<TotalsLine, "qty" | "unitPrice">): bigint {
  if (!Number.isFinite(line.qty) || !Number.isFinite(line.unitPrice)) return BigInt(0);
  return BigInt(Math.round(line.qty * 10_000)) * BigInt(Math.trunc(line.unitPrice));
}

export function computeLineAmount(line: Pick<TotalsLine, "qty" | "unitPrice">): number {
  return Number(roundRatio(scaledAmount(line), SCALE, "round_down"));
}

function roundRatio(numerator: bigint, denominator: bigint, rounding: TaxRounding): bigint {
  const negative = numerator < BigInt(0);
  const absolute = negative ? -numerator : numerator;
  let whole = absolute / denominator;
  const remainder = absolute % denominator;
  if (remainder !== BigInt(0)) {
    if ((rounding === "round_up" && !negative) || (rounding === "round_down" && negative) ||
      (rounding === "round_half" && remainder * BigInt(2) >= denominator)) whole += BigInt(1);
  }
  return negative ? -whole : whole;
}

/**
 * Round once per tax bucket, using the same decimal arithmetic as PostgreSQL.
 * Included prices already contain consumption tax. Withholding is deducted
 * from the line subtotal and always truncated, independently of tax rounding.
 * Misoca's rate brackets: https://support.yayoi-kk.co.jp/subcontents.html?page_id=23228
 */
export function computeDocumentTotals(
  lines: TotalsLine[],
  rounding: TaxRounding = "round_down",
  options: DocumentTaxOptions = {},
): DocumentTotals {
  const taxDisplay = options.taxDisplay ?? "separate";
  const withholdingType = options.withholdingType ?? "none";
  const groups = new Map<number, { taxCategory: TaxCategory; amount: bigint }>();
  let subtotalScaled = BigInt(0);
  let withholdingBase = BigInt(0);

  for (const line of lines) {
    const amount = scaledAmount(line);
    subtotalScaled += amount;
    if (!line.withholdingExempt) withholdingBase += amount;
    // These resolve to the same tax bucket; round their combined amount once.
    const category = line.taxCategory === "follow_company" ? "standard_10" : line.taxCategory;
    const rate = taxRateFor(category);
    const group = groups.get(rate);
    groups.set(rate, { taxCategory: group?.taxCategory ?? category, amount: (group?.amount ?? BigInt(0)) + amount });
  }

  const noTax = taxDisplay === "exempt" ||
    (taxDisplay === "separate_on_invoice" && options.documentType === "delivery_note");
  const breakdown = [...groups.values()]
    .filter(({ amount }) => amount !== BigInt(0))
    .map(({ taxCategory, amount }) => {
      const rate = noTax ? 0 : taxRateFor(taxCategory);
      const percent = BigInt(Math.round(rate * 100));
      const denominator = SCALE * (taxDisplay === "included" ? BigInt(100) + percent : BigInt(100));
      return {
        taxCategory,
        rate,
        taxableAmount: Number(roundRatio(amount, SCALE, "round_down")),
        taxAmount: Number(roundRatio(amount * percent, denominator, rounding)),
      };
    });

  const tax = breakdown.reduce((sum, entry) => sum + entry.taxAmount, 0);
  const subtotal = Number(roundRatio(subtotalScaled, SCALE, "round_down"));
  const threshold = BigInt(1_000_000) * SCALE;
  const base = withholdingBase > BigInt(0) ? withholdingBase : BigInt(0);
  const lower = base < threshold ? base : threshold;
  const excess = base > threshold ? base - threshold : BigInt(0);
  const basisPoints = withholdingType === "with_recovery" ? BigInt(1021) : BigInt(1000);
  const withholding = withholdingType === "none" ? 0 : Number(
    (lower * basisPoints + excess * basisPoints * BigInt(2)) / (SCALE * BigInt(10_000)),
  );
  const addedTax = taxDisplay === "included" ? 0 : tax;
  return { subtotal, tax, withholding, total: subtotal + addedTax - withholding, breakdown };
}
