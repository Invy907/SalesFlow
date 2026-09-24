"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import { SettingsSubNav } from "../settings-shared";

const copy = {
  ja: { unavailable: "未提供", available: "利用可能", note: "以下は提供状況です。未提供の機能は現在ご利用いただけません。", open: "品目管理を開く" },
  ko: { unavailable: "미지원", available: "사용 가능", note: "현재 제공 상태입니다. 미지원 기능은 아직 사용할 수 없습니다.", open: "품목 관리 열기" },
  en: { unavailable: "Not available", available: "Available", note: "Current feature availability. Features marked as unavailable cannot be used yet.", open: "Open item management" },
} as const;

export default function SettingsOtherPage() {
  const { lang } = useLanguage();
  const other = getSettingsContent(lang).other;
  const ui = copy[lang];
  return <SalesFlowShell activeItem="settings">
    <SettingsSubNav active="other" />
    <div className="mx-auto w-full min-w-0 [overflow-wrap:anywhere] max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-2xl font-bold sm:text-[30px] text-slate-900">{other.title}</h1>
      <p className="mt-4 text-sm text-slate-600">{ui.note}</p>
      <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {other.features.map((feature, index) => <div key={feature.title} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><h2 className="font-semibold text-slate-800">{feature.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{feature.desc}</p></div>
          {index === 3 ? <Link href="/items" className="max-w-full shrink-0 rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-[#0A4D34]">{ui.open}</Link> : <span className="shrink-0 text-sm text-slate-500">{ui.unavailable}</span>}
        </div>)}
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="font-semibold">{other.calendar.title}</h2><p className="mt-2 text-sm text-slate-500">{other.calendar.desc}</p></div><span className="shrink-0 text-sm text-slate-500">{ui.unavailable}</span></div>
      </div>
    </div>
  </SalesFlowShell>;
}
