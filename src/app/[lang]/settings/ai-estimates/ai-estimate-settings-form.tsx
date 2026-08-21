"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bot, Database, ShieldCheck } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { saveAiEstimateSettings } from "@/lib/actions/ai-estimates";
import { SettingsSectionHeader, SettingsSubNav } from "../settings-shared";

type SettingsValue = { enabled: boolean; allowPrivateSources: boolean; minimumPriceSamples: number; autoImportIssuedEstimates: boolean; sourceRetentionDays: number | null; allowWebMarketResearch: boolean };

const copy = {
  ja: { title: "AI見積設定", desc: "組織の見積資料と自動入力ルールを管理します。", general: "利用設定", enabled: "AI見積アシストを有効にする", private: "個人資料を本人の推薦に使用する", samples: "単価を自動適用する最小サンプル数", auto: "発行済み見積を自動で確認待ちに追加", retention: "原本の保存日数（空欄は無期限）", web: "公開Webの市場価格調査を許可する", webHelp: "利用者が入力した公開検索語・国・通貨だけを外部AIに送信します。顧客名、社内見積、アップロード原本は送信しません。", save: "保存", saved: "保存しました。", admin: "組織管理者のみ変更できます。", provider: "外部データの境界", safe: "PDF・画像原本の外部AI送信は無効です。Web調査は上の許可と利用者ごとの明示選択がある場合だけ実行します。", library: "AI見積資料を開く" },
  ko: { title: "AI 견적 설정", desc: "조직의 견적 자료와 자동입력 규칙을 관리합니다.", general: "사용 설정", enabled: "AI 견적 도우미 사용", private: "개인 자료를 본인 추천에 사용", samples: "단가 자동적용 최소 표본 수", auto: "발행 견적을 자동으로 검수 대기에 추가", retention: "원본 보관 일수 (비우면 무기한)", web: "공개 웹 시중가 조사 허용", webHelp: "사용자가 입력한 공개 검색어·국가·통화만 외부 AI로 전송합니다. 고객명, 내부 견적, 업로드 원본은 전송하지 않습니다.", save: "저장", saved: "저장했습니다.", admin: "조직 관리자만 변경할 수 있습니다.", provider: "외부 데이터 전송 범위", safe: "PDF·이미지 원본의 외부 AI 전송은 꺼져 있습니다. 웹 조사는 위 조직 허용과 사용자별 명시적 선택이 모두 있을 때만 실행됩니다.", library: "AI 견적 자료함 열기" },
  en: { title: "AI estimate settings", desc: "Manage source and autofill rules for this organization.", general: "Usage settings", enabled: "Enable AI estimate assistant", private: "Use private sources for their owner", samples: "Minimum samples before applying median price", auto: "Add issued estimates to review automatically", retention: "Original retention days (blank means unlimited)", web: "Allow public-web market price research", webHelp: "Only the user's explicit public query, country, and currency are sent externally. Client names, internal estimates, and uploaded originals are never sent.", save: "Save", saved: "Saved.", admin: "Only organization admins can change these settings.", provider: "External data boundary", safe: "External processing of PDF/image originals is disabled. Web research runs only when the organization allows it and the user explicitly opts in for that request.", library: "Open AI estimate library" },
} as const;

export function AiEstimateSettingsForm({ initial, canEdit }: { initial: SettingsValue; canEdit: boolean }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null); setSaved(false);
    startTransition(async () => {
      const result = await saveAiEstimateSettings(value);
      if (!result.ok) { setError(result.error); return; }
      setSaved(true);
    });
  }

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="ai-estimates" />
      <main className="mx-auto w-full max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><Bot className="h-8 w-8 text-violet-600" /><h1 className="text-3xl font-bold text-slate-900">{ui.title}</h1></div><p className="mt-2 text-slate-600">{ui.desc}</p></div><Link href={`/${lang}/estimates/ai-library`} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700"><Database className="h-4 w-4" />{ui.library}</Link></div>
        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white"><SettingsSectionHeader title={ui.general} /><div className="divide-y divide-slate-100 p-6">
          <label className="flex items-center justify-between gap-5 py-4"><span className="font-semibold text-slate-800">{ui.enabled}</span><input type="checkbox" checked={value.enabled} disabled={!canEdit} onChange={(event) => setValue({ ...value, enabled: event.target.checked })} className="h-5 w-5" /></label>
          <label className="flex items-center justify-between gap-5 py-4"><span className="font-semibold text-slate-800">{ui.private}</span><input type="checkbox" checked={value.allowPrivateSources} disabled={!canEdit} onChange={(event) => setValue({ ...value, allowPrivateSources: event.target.checked })} className="h-5 w-5" /></label>
          <label className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_160px]"><span className="font-semibold text-slate-800">{ui.samples}</span><input type="number" min="1" max="20" className="field" disabled={!canEdit} value={value.minimumPriceSamples} onChange={(event) => setValue({ ...value, minimumPriceSamples: Number(event.target.value) })} /></label>
          <label className="flex items-center justify-between gap-5 py-4"><span className="font-semibold text-slate-800">{ui.auto}</span><input type="checkbox" checked={value.autoImportIssuedEstimates} disabled={!canEdit} onChange={(event) => setValue({ ...value, autoImportIssuedEstimates: event.target.checked })} className="h-5 w-5" /></label>
          <label className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_160px]"><span className="font-semibold text-slate-800">{ui.retention}</span><input type="number" min="30" className="field" disabled={!canEdit} value={value.sourceRetentionDays ?? ""} onChange={(event) => setValue({ ...value, sourceRetentionDays: event.target.value ? Number(event.target.value) : null })} /></label>
          <label className="flex items-start justify-between gap-5 py-4"><span><span className="block font-semibold text-slate-800">{ui.web}</span><span className="mt-1 block max-w-3xl text-sm leading-6 text-slate-500">{ui.webHelp}</span></span><input type="checkbox" checked={value.allowWebMarketResearch} disabled={!canEdit} onChange={(event) => setValue({ ...value, allowWebMarketResearch: event.target.checked })} className="mt-1 h-5 w-5 shrink-0" /></label>
        </div></section>
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-emerald-700" /><div><h2 className="font-bold text-emerald-900">{ui.provider}</h2><p className="mt-1 text-sm leading-6 text-emerald-800">{ui.safe}</p></div></div></section>
        {!canEdit ? <p className="mt-4 text-sm text-amber-700">{ui.admin}</p> : null}{error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{saved ? <p className="mt-4 text-sm text-emerald-700">{ui.saved}</p> : null}
        <div className="mt-6 flex justify-end"><button type="button" disabled={!canEdit || pending} onClick={submit} className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white disabled:opacity-40">{pending ? "…" : ui.save}</button></div>
      </main>
    </SalesFlowShell>
  );
}
