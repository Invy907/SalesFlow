"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { LOCALE_COOKIE_NAME } from "@/lib/locale";

export type AppLocale = "ja" | "ko" | "en";

interface LanguageContextValue {
  lang: AppLocale;
  setLang: (lang: AppLocale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ja",
  setLang: () => {},
});

function persistLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_COOKIE_NAME, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=31536000;samesite=lax`;
}

export function LanguageProvider({
  children,
  initialLang = "ja",
}: {
  children: ReactNode;
  initialLang?: AppLocale;
}) {
  const [lang, setLangState] = useState<AppLocale>(initialLang);

  useEffect(() => {
    setLangState(initialLang);
    persistLocale(initialLang);
  }, [initialLang]);

  const setLang = (newLang: AppLocale) => {
    persistLocale(newLang);
    setLangState(newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
