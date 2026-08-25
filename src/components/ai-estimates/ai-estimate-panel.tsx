"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Globe2, Sparkles, WandSparkles } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { AiEstimateDraft, AiMarketResearchResult } from "@/lib/ai/estimates/schemas";
import {
  generateAiEstimateDraft,
  getAiEstimateCapabilities,
  getAiEstimateRecommendations,
  markAiEstimateSuggestionApplied,
} from "@/lib/actions/ai-estimates";

type Recommendation = { name: string; sampleCount: number; medianPrice: number; p25Price: number; p75Price: number };

const copy = {
  ja: { title: "AI見積アシスト", desc: "承認済みの過去見積から品目と価格を提案します。", model: "生成AI", fallback: "ルールベース", work: "今回の作業内容", aiNotice: "作業内容と承認済みの品目・価格・文面は生成AIに送信されます。顧客名と内部ID、原本ファイルは除外されます。", placeholder: "例：採用サイトを5ページ制作。デザインと実装を含む", create: "AI下書きを作成", instant: "すぐ使える価格候補", samples: "件の根拠", result: "提案された下書き", apply: "フォームに反映", evidence: "参照した見積", empty: "承認済み資料を追加すると候補が表示されます。", library: "AI資料を管理", hide: "閉じる", show: "開く", web: "公開Webで市場価格も調べる", webQuery: "外部に送信する公開検索語", webPlaceholder: "例：日本 Webサイト制作 5ページ 相場 2026", webNotice: "この検索語・国・通貨だけを外部AIに送信します。顧客名や社内情報は入力しないでください。", webDisabled: "管理者の許可またはAPI設定が必要です。", market: "Web市場価格", sources: "公開情報源", caveats: "確認事項", country: "市場", currency: "通貨" },
  ko: { title: "AI 견적 도우미", desc: "승인된 과거 견적에서 품목과 가격을 제안합니다.", model: "생성형 AI", fallback: "규칙 기반", work: "이번 작업 설명", aiNotice: "작업 설명과 승인된 품목·가격·문구는 생성형 AI로 전송됩니다. 거래처명·내부 ID·원본 파일은 제외됩니다.", placeholder: "예: 채용 사이트 5페이지 제작, 디자인과 구현 포함", create: "AI 초안 만들기", instant: "바로 쓰는 가격 후보", samples: "건 근거", result: "제안된 초안", apply: "폼에 적용", evidence: "참고한 견적", empty: "승인된 자료를 추가하면 추천이 표시됩니다.", library: "AI 자료 관리", hide: "닫기", show: "열기", web: "공개 웹에서 시중가도 조사", webQuery: "외부로 전송할 공개 검색어", webPlaceholder: "예: 일본 웹사이트 제작 5페이지 시중가 2026", webNotice: "이 검색어·국가·통화만 외부 AI로 전송됩니다. 고객명이나 내부 정보는 입력하지 마세요.", webDisabled: "관리자 허용 또는 API 설정이 필요합니다.", market: "웹 시중가", sources: "공개 출처", caveats: "확인 사항", country: "시장", currency: "통화" },
  en: { title: "AI estimate assistant", desc: "Suggest items and prices from approved past estimates.", model: "Generative AI", fallback: "Rule based", work: "Describe this job", aiNotice: "The work description and approved items, prices, and wording are sent to the generative model. Client names, internal IDs, and original files are excluded.", placeholder: "Example: Five-page recruiting site including design and implementation", create: "Create draft", instant: "Instant price suggestions", samples: "samples", result: "Suggested draft", apply: "Apply to form", evidence: "Evidence", empty: "Add and approve sources to see suggestions.", library: "Manage AI sources", hide: "Close", show: "Open", web: "Also research public-web market prices", webQuery: "Public query sent externally", webPlaceholder: "Example: Japan five-page website design market price 2026", webNotice: "Only this query, country, and currency are sent externally. Do not enter client or internal data.", webDisabled: "Admin permission or API configuration is required.", market: "Web market prices", sources: "Public sources", caveats: "Caveats", country: "Market", currency: "Currency" },
} as const;

export function AiEstimatePanel({
  clientId,
  clientName,
  subject,
  onApply,
}: {
  clientId: string | null;
  clientName: string;
  subject: string;
  onApply: (draft: AiEstimateDraft) => void;
}) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const [open, setOpen] = useState(true);
  const [description, setDescription] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [suggestion, setSuggestion] = useState<{ id: string; draft: AiEstimateDraft; marketResearch: AiMarketResearchResult | null } | null>(null);
  const [capabilities, setCapabilities] = useState({
    modelGenerationConfigured: false,
    modelGenerationModel: null as string | null,
    webMarketResearchAllowed: false,
    webMarketResearchConfigured: false,
  });
  const [useWebMarketResearch, setUseWebMarketResearch] = useState(false);
  const [publicSearchQuery, setPublicSearchQuery] = useState("");
  const [marketCountryCode, setMarketCountryCode] = useState<"JP" | "KR" | "US" | "GLOBAL">("JP");
  const [marketCurrency, setMarketCurrency] = useState<"JPY" | "KRW" | "USD">("JPY");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getAiEstimateRecommendations(clientId).then((result) => {
      if (!cancelled && result.ok) setRecommendations(result.data);
    });
    getAiEstimateCapabilities().then((result) => {
      if (!cancelled && result.ok) setCapabilities(result.data);
    });
    return () => { cancelled = true; };
  }, [clientId]);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateAiEstimateDraft({ clientId, clientName, subject, workDescription: description, useWebMarketResearch, publicSearchQuery, marketCountryCode, marketCurrency });
      if (!result.ok) { setError(result.error); return; }
      setSuggestion({ id: result.data.suggestionId, draft: result.data.draft, marketResearch: result.data.marketResearch });
    });
  }

  const webAvailable = capabilities.webMarketResearchAllowed && capabilities.webMarketResearchConfigured;

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 shadow-sm">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-600 p-2 text-white"><WandSparkles className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{ui.title}</h2><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${capabilities.modelGenerationConfigured ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{capabilities.modelGenerationConfigured ? `${ui.model} · ${capabilities.modelGenerationModel}` : ui.fallback}</span></div><p className="text-sm text-slate-600">{ui.desc}</p></div></div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg p-2 text-slate-600 hover:bg-white" aria-label={open ? ui.hide : ui.show}>{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>
      </div>
      {open ? <div className="border-t border-violet-100 p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
          <div><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">{ui.work}</span><textarea className="field min-h-28 bg-white" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={ui.placeholder} /><span className="mt-2 block text-xs leading-5 text-slate-500">{ui.aiNotice}</span></label>
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4"><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={useWebMarketResearch} disabled={!webAvailable} onChange={(event) => setUseWebMarketResearch(event.target.checked)} /><span><span className="flex items-center gap-2 text-sm font-bold text-sky-900"><Globe2 className="h-4 w-4" />{ui.web}</span>{!webAvailable ? <span className="mt-1 block text-xs text-amber-700">{ui.webDisabled}</span> : null}</span></label>{useWebMarketResearch ? <div className="mt-3 space-y-3"><label className="block"><span className="mb-1 block text-xs font-semibold text-sky-900">{ui.webQuery}</span><input className="field bg-white" value={publicSearchQuery} onChange={(event) => setPublicSearchQuery(event.target.value)} placeholder={ui.webPlaceholder} /></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-1 block text-xs font-semibold text-sky-900">{ui.country}</span><select className="field bg-white" value={marketCountryCode} onChange={(event) => setMarketCountryCode(event.target.value as typeof marketCountryCode)}><option value="JP">Japan</option><option value="KR">Korea</option><option value="US">USA</option><option value="GLOBAL">Global</option></select></label><label><span className="mb-1 block text-xs font-semibold text-sky-900">{ui.currency}</span><select className="field bg-white" value={marketCurrency} onChange={(event) => setMarketCurrency(event.target.value as typeof marketCurrency)}><option value="JPY">JPY</option><option value="KRW">KRW</option><option value="USD">USD</option></select></label></div><p className="text-xs leading-5 text-sky-800">{ui.webNotice}</p></div> : null}</div>
            <button type="button" disabled={pending || (!description.trim() && !subject.trim() && !(useWebMarketResearch && publicSearchQuery.trim().length >= 3))} onClick={generate} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Sparkles className="h-4 w-4" />{pending ? "…" : ui.create}</button>{error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}</div>
          <div><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">{ui.instant}</h3><Link href={`/${lang}/estimates/ai-library`} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700"><BookOpen className="h-3.5 w-3.5" />{ui.library}</Link></div>{recommendations.length ? <div className="mt-3 space-y-2">{recommendations.slice(0, 4).map((item) => <div key={item.name} className="rounded-lg border border-white bg-white/80 p-3"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-800">{item.name}</span><span className="font-bold text-violet-700">¥{item.medianPrice.toLocaleString()}</span></div><p className="mt-1 text-xs text-slate-500">¥{item.p25Price.toLocaleString()}–¥{item.p75Price.toLocaleString()} · {item.sampleCount}{ui.samples}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">{ui.empty}</p>}</div>
        </div>
        {suggestion ? <div className="mt-6 rounded-xl border border-violet-200 bg-white p-5"><h3 className="font-bold text-slate-900">{ui.result}: {suggestion.draft.subject}</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><tbody>{suggestion.draft.lines.map((line, index) => <tr key={`${line.name}-${index}`} className="border-t border-slate-100 first:border-0"><td className="py-3 font-semibold text-slate-800">{line.name}</td><td className="px-3 py-3 text-right text-slate-600">{line.qty} {line.unit}</td><td className="py-3 text-right font-semibold">¥{line.unitPrice.toLocaleString()}</td><td className="pl-4 py-3 text-xs text-slate-500">{line.reason}</td></tr>)}</tbody></table></div>{suggestion.draft.warnings.length ? <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{suggestion.draft.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div> : null}
          {suggestion.marketResearch ? <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4"><h4 className="flex items-center gap-2 font-bold text-sky-950"><Globe2 className="h-4 w-4" />{ui.market}</h4><p className="mt-2 text-sm leading-6 text-sky-900">{suggestion.marketResearch.summary}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{suggestion.marketResearch.items.map((item) => <div key={`${item.name}-${item.unit}`} className="rounded-lg bg-white p-3 text-sm"><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 font-bold text-sky-800">{item.lowPrice.toLocaleString()}–{item.highPrice.toLocaleString()} {suggestion.marketResearch?.currency}</p><p className="mt-1 text-xs text-slate-500">Median {item.medianPrice.toLocaleString()} · {item.basis}</p></div>)}</div><div className="mt-3"><p className="text-xs font-bold text-sky-950">{ui.sources}</p>{suggestion.marketResearch.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline">{source.title}<ExternalLink className="h-3 w-3" /></a>)}</div>{suggestion.marketResearch.caveats.length ? <div className="mt-3"><p className="text-xs font-bold text-sky-950">{ui.caveats}</p>{suggestion.marketResearch.caveats.map((caveat) => <p key={caveat} className="mt-1 text-xs text-sky-800">• {caveat}</p>)}</div> : null}</section> : null}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">{ui.evidence}</p>{suggestion.draft.evidence.map((item) => <p key={item.exampleId} className="mt-1 text-xs text-slate-600">{item.label} · {Math.round(item.similarity * 100)}%</p>)}</div><button type="button" onClick={() => { onApply(suggestion.draft); void markAiEstimateSuggestionApplied(suggestion.id); }} className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">{ui.apply}</button></div></div> : null}
      </div> : null}
    </section>
  );
}
