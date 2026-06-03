import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, FileText, Users } from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "請求書の作成",
    description: "テンプレートからすぐに発行",
  },
  {
    icon: Users,
    title: "顧客管理",
    description: "取引先を一元で把握",
  },
  {
    icon: BarChart3,
    title: "売上レポート",
    description: "数字をひと目で確認",
  },
] as const;

function FeatureCards({ compact }: { compact?: boolean }) {
  return (
    <ul
      className={
        compact
          ? "mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3"
          : "mt-10 space-y-3"
      }
      aria-label="主な機能"
    >
      {FEATURES.map(({ icon: Icon, title, description }) => (
        <li
          key={title}
          className={
            compact
              ? "flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-3.5 py-3 shadow-sm backdrop-blur-sm"
              : "flex gap-4 rounded-2xl border border-white/70 bg-white/55 px-4 py-4 shadow-sm backdrop-blur-md transition-colors hover:bg-white/75"
          }
        >
          <span
            className={
              compact
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-teal-500/20 text-cyan-700"
                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-teal-500/20 text-cyan-700"
            }
            aria-hidden
          >
            <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {!compact && (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
            )}
            {compact && (
              <p className="mt-0.5 hidden text-[11px] leading-snug text-slate-500 sm:block">
                {description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BrandMark({ lang }: { lang: string }) {
  return (
    <Link
      href={`/${lang}`}
      className="inline-flex items-center gap-3 rounded-xl outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-md shadow-cyan-500/25">
        <Image
          src="/salesflow-sf-mark.svg"
          alt=""
          width={22}
          height={22}
          className="brightness-0 invert"
          aria-hidden
        />
      </span>
      <span className="text-xl font-bold tracking-tight text-slate-800">SalesFlow</span>
    </Link>
  );
}

function MarketingCopy() {
  return (
    <>
      <p className="mt-6 text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-[1.65rem] lg:text-[1.85rem] lg:leading-tight">
        請求書・見積書・顧客管理を、
        <br className="hidden sm:block" />
        もっとシンプルに。
      </p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
        SalesFlowは、日々の請求業務をすばやく整理できるクラウドサービスです。
      </p>
    </>
  );
}

export function SignInMarketingPanel({ lang }: { lang: string }) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:justify-center lg:py-4" aria-labelledby="sign-in-marketing-heading">
      <BrandMark lang={lang} />
      <h2 id="sign-in-marketing-heading" className="sr-only">
        SalesFlowについて
      </h2>
      <MarketingCopy />
      <FeatureCards />
    </aside>
  );
}

export function SignInMobileHero({ lang }: { lang: string }) {
  return (
    <div className="mb-6 lg:hidden">
      <BrandMark lang={lang} />
      <p className="mt-4 text-lg font-bold leading-snug text-slate-900">
        請求書・見積書・顧客管理を、もっとシンプルに。
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        日々の請求業務をすばやく整理できるクラウドサービスです。
      </p>
      <FeatureCards compact />
    </div>
  );
}

export function SignInPageShell({
  lang,
  children,
}: {
  lang: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-[1120px]">
      <SignInMobileHero lang={lang} />
      <div className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:gap-14 xl:gap-16">
        <SignInMarketingPanel lang={lang} />
        <div className="flex w-full flex-col justify-center">{children}</div>
      </div>
    </div>
  );
}
