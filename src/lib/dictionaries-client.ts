import type { AppLocale } from "@/contexts/language-context";
import en from "@/app/[lang]/dictionaries/en.json";
import ja from "@/app/[lang]/dictionaries/ja.json";
import ko from "@/app/[lang]/dictionaries/ko.json";

const dictionaries = { ja, ko, en } as const;

export function getDictionaryClient(locale: AppLocale) {
  return dictionaries[locale];
}

export type Dictionary = ReturnType<typeof getDictionaryClient>;
