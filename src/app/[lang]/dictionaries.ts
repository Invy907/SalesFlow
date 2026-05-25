import "server-only";

import en from "./dictionaries/en.json";
import ja from "./dictionaries/ja.json";
import ko from "./dictionaries/ko.json";

export const locales = ["ja", "ko", "en"] as const;

export type Locale = (typeof locales)[number];

const dictionaries = {
  en,
  ja,
  ko,
} as const;

export function hasLocale(locale: string): locale is Locale {
  return locale in dictionaries;
}

export async function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
