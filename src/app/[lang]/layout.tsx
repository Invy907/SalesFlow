import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDictionary, hasLocale, locales, type Locale } from "./dictionaries";
import { LanguageProvider, type AppLocale } from "@/contexts/language-context";

type RouteParams = {
  lang: string;
};

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(
  props: {
    params: Promise<RouteParams>;
  },
): Promise<Metadata> {
  const { lang } = await props.params;

  if (!hasLocale(lang)) {
    return {
      title: "Salesflow",
    };
  }

  const dict = await getDictionary(lang);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<RouteParams>;
}) {
  const { lang } = await props.params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <html
      lang={lang}
      className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLang={lang as AppLocale}>
          {props.children}
        </LanguageProvider>
      </body>
    </html>
  );
}

export function getLocaleLabel(locale: Locale) {
  switch (locale) {
    case "ja":
      return "日本語";
    case "ko":
      return "한국어";
    case "en":
      return "English";
  }
}
