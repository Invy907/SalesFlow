"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type AppLocale = "ja" | "ko" | "en";

interface LanguageContextValue {
  lang: AppLocale;
  setLang: (lang: AppLocale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ja",
  setLang: () => {},
});

export function LanguageProvider({
  children,
  initialLang = "ja",
}: {
  children: ReactNode;
  initialLang?: AppLocale;
}) {
  const [lang, setLangState] = useState<AppLocale>(initialLang);

  useEffect(() => {
    const stored = localStorage.getItem("salesflow-lang") as AppLocale | null;
    if (stored && ["ja", "ko", "en"].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = (newLang: AppLocale) => {
    localStorage.setItem("salesflow-lang", newLang);
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
