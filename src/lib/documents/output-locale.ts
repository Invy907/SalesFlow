export const DOCUMENT_OUTPUT_LOCALES = ["ko", "ja", "en"] as const;

export type DocumentOutputLocale = (typeof DOCUMENT_OUTPUT_LOCALES)[number];

/**
 * 서류는 일본 거래처에 보내는 것이 기본이라, 화면 언어와 무관하게 일본어로 출력한다.
 * (화면을 한국어로 쓰면서 일본어 서류를 만드는 것이 일반적인 사용 방식)
 */
export const DEFAULT_DOCUMENT_OUTPUT_LOCALE: DocumentOutputLocale = "ja";

export function normalizeDocumentOutputLocale(
  value: unknown,
  fallback: unknown = DEFAULT_DOCUMENT_OUTPUT_LOCALE,
): DocumentOutputLocale {
  return DOCUMENT_OUTPUT_LOCALES.includes(value as DocumentOutputLocale)
    ? (value as DocumentOutputLocale)
    : DOCUMENT_OUTPUT_LOCALES.includes(fallback as DocumentOutputLocale)
      ? (fallback as DocumentOutputLocale)
      : DEFAULT_DOCUMENT_OUTPUT_LOCALE;
}
