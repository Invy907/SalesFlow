import type { AiEstimateDraft, AiEstimateExtraction } from "./schemas";

export function normalizeItemName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function extractionSearchText(value: AiEstimateExtraction) {
  return [
    value.clientName,
    value.subject,
    value.templateMessage,
    value.remarks,
    ...value.lines.flatMap((line) => [line.name, line.reason]),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 50_000);
}

export function taxLabelFromCategory(category: AiEstimateDraft["lines"][number]["taxCategory"]) {
  if (category === "reduced_8") return "軽減8%";
  if (category === "standard_8") return "8%";
  if (category === "standard_5") return "5%";
  if (category === "exempt") return "対象外";
  return "10%";
}
