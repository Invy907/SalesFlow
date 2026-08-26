export const DOCUMENT_OUTPUT_LOCALES = ["ko", "ja", "en"] as const;

export type DocumentOutputLocale = (typeof DOCUMENT_OUTPUT_LOCALES)[number];

export function normalizeDocumentOutputLocale(
  value: unknown,
  fallback: unknown = "ja",
): DocumentOutputLocale {
  return DOCUMENT_OUTPUT_LOCALES.includes(value as DocumentOutputLocale)
    ? (value as DocumentOutputLocale)
    : DOCUMENT_OUTPUT_LOCALES.includes(fallback as DocumentOutputLocale)
      ? (fallback as DocumentOutputLocale)
      : "ja";
}
