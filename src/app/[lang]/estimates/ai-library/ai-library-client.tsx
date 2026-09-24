"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, Library, Sparkles } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { AiSourceStatusBadge } from "@/components/ai-estimates/ai-source-status-badge";
import { aiTaxCategoryLabel } from "@/components/ai-estimates/presentation";
import { aiEstimateErrorMessage } from "@/components/ai-estimates/error-message";
import { useLanguage } from "@/contexts/language-context";
import type { AiEstimateSourceListItem, AiPriceStat } from "@/lib/db/ai-estimates";

import { sourceCopy, sourceKindLabel, sourceKinds } from "@/components/ai-estimates/source-fields";

const copy = {
  ja: { included: "税込", excludedTax: "税抜", unknownTax: "税込・税抜未確認", loadError: "資料の処理に問題が発生しました。資料を開いて状態を確認してください。", stepUpload: "資料を登録", stepReview: "原本を確認し、管理者が承認", stepApply: "見積フォームで検索・選択反映", createEstimate: "承認資料を使って見積を作成", search: "資料名・ファイル名・案件で検索", all: "すべて", review: "確認待ち", approved: "承認済み", processing: "処理中", uploaded: "アップロード済み", failed: "処理失敗", excluded: "除外", noMatch: "条件に一致する資料がありません。", statsHelp: "承認済みの組織共有資料に基づく参考単価です。明細の単位・税区分を確認して利用してください。", emptyStats: "承認済みの価格データがまだありません。", insufficient: "サンプルが少ないため、参考値として確認してください。", title: "AI見積資料", desc: "承認した過去の見積だけが自動入力の根拠になります。", upload: "資料を登録", back: "見積一覧", empty: "まだAI資料がありません。", source: "資料", type: "種類", status: "状態", date: "登録日", uploadType: "ファイル", estimateType: "既存見積", stats: "よく使う品目と価格", samples: "件", median: "中央値" },
  ko: { included: "세금 포함", excludedTax: "세금 별도", unknownTax: "세금 포함 여부 미확인", loadError: "자료 처리 중 문제가 발생했습니다. 자료를 열어 상태를 확인해 주세요.", stepUpload: "자료 등록", stepReview: "원본 검수 후 관리자 승인", stepApply: "견적 폼에서 검색·선택 적용", createEstimate: "승인된 자료로 견적 만들기", search: "자료명·파일명·프로젝트 검색", all: "전체", review: "검수 대기", approved: "승인됨", processing: "처리 중", uploaded: "업로드됨", failed: "처리 실패", excluded: "제외됨", noMatch: "조건에 맞는 자료가 없습니다.", statsHelp: "승인된 조직 공용 자료의 참고 단가입니다. 명세의 단위와 세금 구분을 확인해 사용하세요.", emptyStats: "승인된 가격 데이터가 아직 없습니다.", insufficient: "표본이 적으므로 참고값으로 확인해 주세요.", title: "AI 견적 자료함", desc: "승인된 과거 견적만 자동입력의 근거로 사용됩니다.", upload: "자료 등록", back: "견적 목록", empty: "아직 AI 자료가 없습니다.", source: "자료", type: "종류", status: "상태", date: "등록일", uploadType: "파일", estimateType: "기존 견적", stats: "자주 쓰는 품목과 가격", samples: "건", median: "중앙값" },
  en: { included: "Tax included", excludedTax: "Tax excluded", unknownTax: "Tax inclusion unverified", loadError: "Source processing encountered a problem. Open the source to review its status.", stepUpload: "Upload a source", stepReview: "Review the original; admin approves", stepApply: "Search and apply selections in an estimate", createEstimate: "Create an estimate using approved sources", search: "Search source, file or project", all: "All sources", review: "Awaiting review", approved: "Approved", processing: "Processing", uploaded: "Uploaded", failed: "Failed", excluded: "Excluded", noMatch: "No sources match these filters.", statsHelp: "Reference prices from approved organization sources. Check the unit and tax category before using them.", emptyStats: "No approved price data yet.", insufficient: "Few samples: verify this reference price.", title: "AI estimate library", desc: "Only approved estimates are used as autofill evidence.", upload: "Add source", back: "Estimates", empty: "No AI sources yet.", source: "Source", type: "Type", status: "Status", date: "Added", uploadType: "File", estimateType: "Estimate", stats: "Frequent items and prices", samples: "samples", median: "Median" },
} as const;

export function AiEstimateLibraryClient({ sources, priceStats, canWrite, minimumPriceSamples }: { sources: AiEstimateSourceListItem[]; priceStats: AiPriceStat[]; canWrite: boolean; minimumPriceSamples: number }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const sourceUi = sourceCopy[lang];
  const [kind, setKind] = useState("all");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const matchingSources = sources.filter((source) => (status === "all" || source.status === status) && (kind === "all" || source.document_kind === kind) && [source.title, source.original_file_name ?? "", source.project_name, source.revision].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const hasPending = sources.some((source) => source.status === "uploaded" || source.status === "processing");

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [hasPending, router]);

  return (
    <SalesFlowShell activeItem="estimates">
      <main className="mx-auto w-full min-w-0 [overflow-wrap:anywhere] max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 rounded-xl bg-violet-100 p-2 text-violet-700"><Library className="h-6 w-6" /></span>
              <h1 className="text-2xl font-bold sm:text-3xl text-slate-900">{ui.title}</h1>
            </div>
            <p className="mt-3 text-slate-600">{sourceUi.sourceHelp}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${lang}/estimates`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">{ui.back}</Link>
            {canWrite ? <Link href={`/${lang}/estimates/ai-library/upload`} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><FileUp className="h-4 w-4 shrink-0" />{ui.upload}</Link> : null}
          </div>
        </div>

        <ol className="mt-6 grid gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-950 sm:grid-cols-3"><li>1. {ui.stepUpload}</li><li>2. {ui.stepReview}</li><li>3. {ui.stepApply}</li></ol>
        {canWrite && sources.some((source) => source.status === "approved") ? <Link href={`/${lang}/estimates/new`} className="mt-4 inline-block text-sm font-semibold text-violet-700 underline">{ui.createEstimate}</Link> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_190px_190px]"><label className="text-sm font-semibold sm:col-span-2 lg:col-span-1">{ui.search}<input type="search" className="field mt-1" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="text-sm font-semibold">{sourceUi.kind}<select className="field mt-1" value={kind} onChange={event => setKind(event.target.value)}><option value="all">{ui.all}</option>{sourceKinds.map(item => <option key={item} value={item}>{sourceKindLabel(item, lang)}</option>)}</select></label><label className="text-sm font-semibold">{ui.status}<select className="field mt-1" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{ui.all}</option><option value="review_required">{ui.review}</option><option value="approved">{ui.approved}</option><option value="processing">{ui.processing}</option><option value="uploaded">{ui.uploaded}</option><option value="failed">{ui.failed}</option><option value="excluded">{ui.excluded}</option></select></label></div>
        <p role="status" className="mt-3 text-sm text-slate-500">{matchingSources.length} / {sources.length}</p>
        <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {matchingSources.length ? (
            <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={ui.source}>
              <table className="w-full min-w-[300px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">{ui.source}</th><th className="hidden px-5 py-3 md:table-cell">{ui.type}</th><th className="px-5 py-3">{ui.status}</th><th className="hidden px-5 py-3 sm:table-cell">{ui.date}</th></tr></thead>
                <tbody>
                  {matchingSources.map((source) => (
                    <tr key={source.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="max-w-[190px] break-words px-4 py-4 sm:max-w-none"><Link href={`/${lang}/estimates/ai-library/${source.id}`} className="font-semibold text-[#083D29] hover:underline">{source.title}</Link><p className="mt-1 text-xs text-slate-600">{[sourceKindLabel(source.document_kind, lang), source.project_name, source.revision].filter(Boolean).join(" · ")}</p>{(source.valid_from || source.valid_until) ? <p className="mt-1 text-xs text-slate-500">{source.valid_from ?? "…"} – {source.valid_until ?? "…"}</p> : null}{source.original_file_name ? <p className="mt-1 break-all text-xs text-slate-400">{source.original_file_name}</p> : null}{source.error_message ? <p className="mt-1 text-xs text-red-600">{aiEstimateErrorMessage(source.error_message, lang, ui.loadError)}</p> : null}{canWrite && source.status === "approved" ? <Link href={`/${lang}/estimates/new?aiSource=${source.id}${source.linked_client_id ? `&clientId=${source.linked_client_id}` : ""}`} className="mt-2 inline-block py-1 text-xs font-semibold text-violet-700 underline">{sourceUi.ready}</Link> : null}</td>
                      <td className="hidden px-5 py-4 text-slate-600 md:table-cell">{source.source_type === "upload" ? ui.uploadType : source.source_type === "manual" ? sourceUi.manual : ui.estimateType}</td>
                      <td className="px-5 py-4"><AiSourceStatusBadge status={source.status} lang={lang} /></td>
                      <td className="hidden px-5 py-4 text-slate-500 sm:table-cell">{new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(source.created_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="p-8 text-center text-slate-500">{sources.length ? ui.noMatch : ui.empty}</div>}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 shrink-0 text-violet-600" /><h2 className="text-xl font-bold text-slate-900">{ui.stats}</h2></div>
          <p className="mb-4 text-sm text-slate-500">{ui.statsHelp}</p>
          {!priceStats.length ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{ui.emptyStats}</p> : null}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {priceStats.map((stat) => (
              <div key={stat.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{stat.display_name}</p>
                <p className="mt-3 text-xl font-bold sm:text-2xl text-violet-700">{new Intl.NumberFormat(lang, { style: "currency", currency: stat.currency }).format(Number(stat.median_price))}<span className="ml-2 text-sm font-normal">{stat.unit ? `/ ${stat.unit}` : ""}</span></p><p className="mt-1 text-xs text-slate-500">{stat.tax_mode === "included" ? ui.included : stat.tax_mode === "excluded" ? ui.excludedTax : ui.unknownTax} · {aiTaxCategoryLabel(stat.tax_category, lang)}</p>
                <p className="mt-1 text-xs text-slate-500">{ui.median} · ¥{Number(stat.p25_price).toLocaleString()}–¥{Number(stat.p75_price).toLocaleString()} · {stat.sample_count}{ui.samples}</p>
                {stat.sample_count < minimumPriceSamples ? <p className="mt-2 text-xs text-amber-800">{ui.insufficient}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </main>
    </SalesFlowShell>
  );
}
