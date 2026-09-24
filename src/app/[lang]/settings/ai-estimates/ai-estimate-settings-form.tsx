"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bot, Database, ShieldCheck } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { aiEstimateErrorMessage } from "@/components/ai-estimates/error-message";
import { sourceCopy } from "@/components/ai-estimates/source-fields";
import { useLanguage } from "@/contexts/language-context";
import { saveAiEstimateSettings } from "@/lib/actions/ai-estimates";
import { SettingsSectionHeader, SettingsSubNav } from "../settings-shared";

type SettingsValue = { allowExternalProcessing: boolean; dailyGenerationLimit: number; enabled: boolean; allowPrivateSources: boolean; minimumPriceSamples: number; autoImportIssuedEstimates: boolean; sourceRetentionDays: number | null; allowWebMarketResearch: boolean };

const copy = {
  ja: { retentionHelp: "承認済み・除外済み資料の原本ファイルに適用します。確認データと推薦の根拠は保持され、確認待ち資料の原本は削除しません。", localHelp: "外部処理の許可とAPI設定がそろうまで、原本の手動確認と内部資料検索を使用します。公開Web調査は別の許可設定です。", extractionUnavailable: "自動抽出API：未設定。", extractionReady: "自動抽出API：設定済み。", modelUnavailable: "下書き生成API：未設定。", modelReady: "下書き生成API：設定済み。", error: "保存できませんでした。再試行してください。", invalid: "最小資料数は1〜20、生成上限は1〜1,000、保存日数は30〜36,500の整数を入力してください。", daily: "1日の下書き生成上限（1〜1,000回）", external: "資料の外部AI処理を許可する", title: "AI見積設定", desc: "組織の見積資料と自動入力ルールを管理します。", general: "利用設定", enabled: "AI見積アシストを有効にする", private: "個人資料を本人の推薦に使用する", samples: "価格統計を単価候補に使う最小資料数", auto: "発行済み見積を自動で確認待ちに追加", retention: "原本の保存日数（空欄は無期限）", web: "公開Webの市場価格調査を許可する", webHelp: "利用者が入力した公開検索語・国・通貨だけをWeb調査AIに送信します。顧客名、社内見積、原本は送信しません。", save: "保存", saved: "保存しました。", admin: "組織管理者のみ変更できます。", provider: "外部データの境界", safe: "有効にすると、PDF・画像の自動抽出には原本、検索には資料テキスト、下書き生成には要件・前提・対象外と承認済みの品目・単価・文面・作業資料を外部AIへ送信します。各機能にはサーバー側のAPI設定も必要です。", library: "AI見積資料を開く" },
  ko: { retentionHelp: "승인·제외된 자료의 원본 파일에 적용합니다. 검수 데이터와 추천 근거는 유지하며, 검수 대기 자료의 원본은 삭제하지 않습니다.", localHelp: "외부 처리 허용과 API 설정이 모두 갖춰지기 전에는 원본 수동 검수와 내부 자료 검색을 사용합니다. 공개 웹 조사는 별도로 허용합니다.", extractionUnavailable: "자동 추출 API: 미설정.", extractionReady: "자동 추출 API: 설정됨.", modelUnavailable: "초안 생성 API: 미설정.", modelReady: "초안 생성 API: 설정됨.", error: "저장하지 못했습니다. 다시 시도해 주세요.", invalid: "최소 자료 수는 1~20, 생성 한도는 1~1,000, 보관 일수는 30~36,500의 정수로 입력해 주세요.", daily: "일일 초안 생성 한도 (1~1,000회)", external: "자료의 외부 AI 처리 허용", title: "AI 견적 설정", desc: "조직의 견적 자료와 자동입력 규칙을 관리합니다.", general: "사용 설정", enabled: "AI 견적 도우미 사용", private: "개인 자료를 본인 추천에 사용", samples: "가격 통계를 단가 후보에 사용할 최소 자료 수", auto: "발행 견적을 자동으로 검수 대기에 추가", retention: "원본 보관 일수 (비우면 무기한)", web: "공개 웹 시중가 조사 허용", webHelp: "사용자가 입력한 공개 검색어·국가·통화만 웹 조사 AI로 전송합니다. 고객명, 내부 견적, 원본은 전송하지 않습니다.", save: "저장", saved: "저장했습니다.", admin: "조직 관리자만 변경할 수 있습니다.", provider: "외부 데이터 전송 범위", safe: "활성화하면 PDF·이미지 자동 추출에는 원본을, 검색에는 자료 텍스트를, 초안 생성에는 요구사항·전제·제외 조건과 승인된 품목·단가·문구·작업 자료를 외부 AI로 전송합니다. 각 기능은 서버 API 설정도 필요합니다.", library: "AI 견적 자료함 열기" },
  en: { retentionHelp: "Applies to original files of approved or excluded sources. Reviewed data and suggestion evidence are retained. Originals awaiting review are kept.", localHelp: "Until external processing is allowed and APIs are configured, use manual source review and internal source search. Public-web research requires separate permission.", extractionUnavailable: "Extraction API: not configured.", extractionReady: "Extraction API: configured.", modelUnavailable: "Draft generation API: not configured.", modelReady: "Draft generation API: configured.", error: "Could not save settings. Please try again.", invalid: "Enter whole numbers: 1–20 sources, 1–1,000 daily generations, and 30–36,500 retention days.", daily: "Daily draft generation limit (1–1,000)", external: "Allow external AI processing of sources", title: "AI estimate settings", desc: "Manage source and autofill rules for this organization.", general: "Usage settings", enabled: "Enable AI estimate assistant", private: "Use private sources for their owner", samples: "Minimum sources for statistical price suggestions", auto: "Add issued estimates to review automatically", retention: "Original retention days (blank means unlimited)", web: "Allow public-web market price research", webHelp: "Only the user's explicit query, country, and currency are sent to the web-research model. Client names, internal estimates, and originals are not sent.", save: "Save", saved: "Saved.", admin: "Only organization admins can change these settings.", provider: "External data boundary", safe: "When enabled, automatic extraction sends original PDFs and images, search sends source text, and generation sends requirements, assumptions, exclusions and approved items, prices, wording and work references to external AI. Each feature also requires server API configuration.", library: "Open AI estimate library" },
} as const;

export function AiEstimateSettingsForm({ initial, canEdit, providerConfigured, extractionConfigured, providerOptions }: { providerOptions: Array<{ provider: "gemini" | "anthropic"; model: string }>; initial: SettingsValue; canEdit: boolean; providerConfigured: boolean; extractionConfigured: boolean }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const [value, setSettings] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function setValue(next: SettingsValue) { setSettings(next); setSaved(false); setError(null); }

  function submit() {
    if (!canEdit || pending) return;
    if (!Number.isInteger(value.minimumPriceSamples) || value.minimumPriceSamples < 1 || value.minimumPriceSamples > 20 || !Number.isInteger(value.dailyGenerationLimit) || value.dailyGenerationLimit < 1 || value.dailyGenerationLimit > 1000 || (value.sourceRetentionDays !== null && (!Number.isInteger(value.sourceRetentionDays) || value.sourceRetentionDays < 30 || value.sourceRetentionDays > 36500))) { setError(ui.invalid); return; }
    setError(null); setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveAiEstimateSettings(value);
        if (!result.ok) { setError(aiEstimateErrorMessage(result.error, lang, ui.error)); return; }
        setSaved(true);
      } catch { setError(ui.error); }
    });
  }

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="ai-estimates" />
      <main className="mx-auto w-full min-w-0 [overflow-wrap:anywhere] max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><Bot className="h-8 w-8 shrink-0 text-violet-600" /><h1 className="text-2xl font-bold sm:text-3xl text-slate-900">{ui.title}</h1></div><p className="mt-2 text-slate-600">{sourceCopy[lang].sourceHelp}</p></div><Link href={`/${lang}/estimates/ai-library`} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700"><Database className="h-4 w-4" />{ui.library}</Link></div>
        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white"><SettingsSectionHeader title={ui.general} /><div className="divide-y divide-slate-100 p-4 sm:p-6">
          <label className="flex items-center justify-between gap-5 py-4"><span className="font-semibold text-slate-800">{ui.enabled}</span><input type="checkbox" checked={value.enabled} disabled={!canEdit || pending} onChange={(event) => setValue({ ...value, enabled: event.target.checked })} className="h-5 w-5 shrink-0" /></label>
          <label className="flex items-center justify-between gap-5 py-4"><span className="font-semibold text-slate-800">{ui.private}</span><input type="checkbox" checked={value.allowPrivateSources} disabled={!canEdit || pending} onChange={(event) => setValue({ ...value, allowPrivateSources: event.target.checked })} className="h-5 w-5 shrink-0" /></label>
          <label className="grid items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_160px]"><span className="font-semibold text-slate-800">{ui.samples}</span><input type="number" min="1" max="20" step="1" className="field" disabled={!canEdit || pending} value={Number.isNaN(value.minimumPriceSamples) ? "" : value.minimumPriceSamples} onChange={(event) => setValue({ ...value, minimumPriceSamples: event.target.value === "" ? NaN : Number(event.target.value) })} /></label>
          <label className="flex items-center justify-between gap-5 py-4"><span className="font-semibold text-slate-800">{ui.auto}</span><input type="checkbox" checked={value.autoImportIssuedEstimates} disabled={!canEdit || pending} onChange={(event) => setValue({ ...value, autoImportIssuedEstimates: event.target.checked })} className="h-5 w-5 shrink-0" /></label>
          <label className="grid items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_160px]"><span><span className="font-semibold text-slate-800">{ui.retention}</span><span className="mt-1 block text-sm leading-6 text-slate-500">{ui.retentionHelp}</span></span><input type="number" min="30" max="36500" step="1" className="field" disabled={!canEdit || pending} value={value.sourceRetentionDays ?? ""} onChange={(event) => setValue({ ...value, sourceRetentionDays: event.target.value ? Number(event.target.value) : null })} /></label>
          <label className="flex items-start justify-between gap-5 py-4"><span><span className="block font-semibold text-slate-800">{ui.external}</span><span className="mt-1 block text-sm leading-6 text-slate-500">{ui.safe}</span></span><input type="checkbox" checked={value.allowExternalProcessing} disabled={!canEdit || pending} onChange={(event) => setValue({ ...value, allowExternalProcessing: event.target.checked })} className="mt-1 h-5 w-5 shrink-0" /></label>
          <label className="grid items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_160px]"><span className="font-semibold text-slate-800">{ui.daily}</span><input type="number" min="1" max="1000" step="1" className="field" disabled={!canEdit || pending} value={Number.isNaN(value.dailyGenerationLimit) ? "" : value.dailyGenerationLimit} onChange={(event) => setValue({ ...value, dailyGenerationLimit: event.target.value === "" ? NaN : Number(event.target.value) })} /></label>
          <label className="flex items-start justify-between gap-5 py-4"><span><span className="block font-semibold text-slate-800">{ui.web}</span><span className="mt-1 block max-w-3xl text-sm leading-6 text-slate-500">{ui.webHelp}</span></span><input type="checkbox" checked={value.allowWebMarketResearch} disabled={!canEdit || pending} onChange={(event) => setValue({ ...value, allowWebMarketResearch: event.target.checked })} className="mt-1 h-5 w-5 shrink-0" /></label>
        </div></section>
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-emerald-700" /><div className="min-w-0"><h2 className="font-bold text-emerald-900">{ui.provider}</h2><p className="mt-1 text-sm leading-6 text-emerald-800">{providerConfigured ? ui.modelReady : ui.modelUnavailable} {extractionConfigured ? ui.extractionReady : ui.extractionUnavailable}</p><p className="mt-2 text-sm leading-6 text-emerald-800">{ui.localHelp}</p><p className="mt-2 text-sm leading-6 text-emerald-800">{{ ja: "CSV・XLSXの表、TXT・MDと直接入力した作業詳細は、外部AIへ送信せず読み込み・確認できます。設計・作業資料は価格統計には使用しません。", ko: "CSV·XLSX 표, TXT·MD와 직접 입력한 작업 상세는 외부 AI로 전송하지 않고 읽어 검수할 수 있습니다. 설계·작업 자료는 가격 통계에 사용하지 않습니다.", en: "CSV/XLSX tables, TXT/MD and entered work details can be parsed and reviewed without external AI. Design and work sources are excluded from price statistics." }[lang]}</p>{providerOptions.length > 0 && <ul className="mt-3 space-y-1 text-sm text-emerald-900">{providerOptions.map(option => <li key={option.provider}>{option.provider === "gemini" ? "Gemini" : "Claude"} · {option.model}</li>)}</ul>}</div></div></section>
        {!canEdit ? <p className="mt-4 text-sm text-amber-700">{ui.admin}</p> : null}{error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{saved ? <p role="status" className="mt-4 text-sm text-emerald-700">{ui.saved}</p> : null}
        <div className="mt-6 flex justify-end"><button type="button" disabled={!canEdit || pending} onClick={submit} className="rounded-lg bg-[#0A4D34] px-6 py-3 font-semibold text-white disabled:opacity-40">{pending ? "…" : ui.save}</button></div>
      </main>
    </SalesFlowShell>
  );
}
