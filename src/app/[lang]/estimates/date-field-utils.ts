export function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toDateInputValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.replace(/\//g, "-");
}

export function toIsoDate(value: string): string {
  return value.replace(/\//g, "-");
}

/** 문서 프리뷰·메일 등 화면 표시용. YYYY-MM-DD / YYYY/MM/DD → 로케일 날짜. */
export function formatDisplayDate(value: string, locale: string): string {
  if (!value) return "";
  const normalized = value.replace(/\//g, "-");
  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) return value;

  const localeMap: Record<string, string> = {
    ja: "ja-JP",
    ko: "ko-KR",
    en: "en-US",
  };
  const lang = locale === "ko" || locale === "en" ? locale : "ja";

  return new Intl.DateTimeFormat(localeMap[lang], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(year, month - 1, day));
}
