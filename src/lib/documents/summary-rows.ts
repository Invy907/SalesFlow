import type { TaxDisplay, TaxCategory, DocumentTotals } from "@/lib/tax";

type SummaryDocument = {
  subtotal: number;
  tax: number;
  total: number;
  withholding?: number;
  taxBreakdown?: DocumentTotals["breakdown"];
  taxDisplay?: TaxDisplay;
  outputLocale: string;
};

/** Shared by on-screen documents, print/PDF, and spreadsheet exports. */
export function documentSummaryRows(
  detail: SummaryDocument,
  labels: { subtotal: string; tax: string; total: string },
): Array<[string, number]> {
  const copy = detail.outputLocale === "ko"
    ? { included: "포함 소비세", withholding: "원천징수세" }
    : detail.outputLocale === "en"
      ? { included: "Tax included", withholding: "Withholding tax" }
      : { included: "うち消費税", withholding: "源泉徴収税" };
  const rows: Array<[string, number]> = [[labels.subtotal, detail.subtotal]];
  if (detail.taxDisplay !== "exempt" && !(detail.taxDisplay === "separate_on_invoice" && detail.tax === 0)) {
    for (const group of detail.taxBreakdown ?? []) {
      const rate = documentTaxCategoryLabel(group.taxCategory, detail.outputLocale);
      const amountLabel = detail.outputLocale === "ko" ? "대상액" : detail.outputLocale === "en" ? "amount" : "対象額";
      rows.push([`${rate} ${amountLabel}`, group.taxableAmount]);
      if (group.rate > 0) rows.push([`${rate} ${detail.taxDisplay === "included" ? copy.included : labels.tax}`, group.taxAmount]);
    }
    rows.push([detail.taxDisplay === "included" ? copy.included : labels.tax, detail.tax]);
  }
  if (detail.withholding) rows.push([copy.withholding, -detail.withholding]);
  rows.push([labels.total, detail.total]);
  return rows;
}

export function documentTaxCategoryLabel(category: TaxCategory | undefined, locale: string): string {
  if (category === "exempt") return locale === "ko" ? "대상 외" : locale === "en" ? "Exempt" : "対象外";
  if (category === "reduced_8") return "8% ※";
  if (category === "standard_8") return "8%";
  if (category === "standard_5") return "5%";
  return "10%";
}
