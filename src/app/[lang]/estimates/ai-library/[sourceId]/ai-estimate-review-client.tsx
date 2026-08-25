"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSearch, Plus, Save, Trash2 } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { AiSourceStatusBadge } from "@/components/ai-estimates/ai-source-status-badge";
import { useLanguage } from "@/contexts/language-context";
import type { AiEstimateSourceDetail } from "@/lib/db/ai-estimates";
import type { AiEstimateExtraction } from "@/lib/ai/estimates/schemas";
import { batchReviewHints, extractionConfidenceLabel } from "@/lib/ai/estimates/review-batch-hints";
import { approveAiEstimateSource, deleteAiEstimateSource, saveAiEstimateExtraction } from "@/lib/actions/ai-estimates";

const copy = {
  ja: { title: "抽出結果の確認", original: "原本", extracted: "見積データ", client: "取引先", subject: "件名", date: "見積日", item: "品目", qty: "数量", unit: "単位", price: "単価", tax: "税区分", reason: "根拠・メモ", remarks: "備考", message: "定型文", add: "行を追加", save: "一時保存", approve: "AI資料として承認", delete: "資料を削除", back: "資料一覧", admin: "組織共有資料の承認は管理者のみ可能です。", processing: "資料を準備しています。数秒後に更新します。", noOriginal: "既存のSalesFlow見積から登録された資料です。" },
  ko: { title: "추출 결과 검수", original: "원본", extracted: "견적 데이터", client: "거래처", subject: "제목", date: "견적일", item: "품목", qty: "수량", unit: "단위", price: "단가", tax: "세금", reason: "근거·메모", remarks: "비고", message: "안내 문구", add: "행 추가", save: "임시 저장", approve: "AI 자료 승인", delete: "자료 삭제", back: "자료 목록", admin: "조직 공용 자료 승인은 관리자만 할 수 있습니다.", processing: "자료를 준비 중입니다. 잠시 후 자동으로 새로고침됩니다.", noOriginal: "기존 SalesFlow 견적에서 등록한 자료입니다." },
  en: { title: "Review extraction", original: "Original", extracted: "Estimate data", client: "Client", subject: "Subject", date: "Estimate date", item: "Item", qty: "Qty", unit: "Unit", price: "Unit price", tax: "Tax", reason: "Evidence / note", remarks: "Remarks", message: "Message", add: "Add line", save: "Save draft", approve: "Approve AI source", delete: "Delete source", back: "Library", admin: "Only an organization admin can approve shared sources.", processing: "Preparing this source. The page will refresh shortly.", noOriginal: "This source was imported from an existing SalesFlow estimate." },
} as const;

const emptyLine: AiEstimateExtraction["lines"][number] = { name: "", qty: 1, unit: "", unitPrice: 0, taxCategory: "standard_10", confidence: 1, reason: "" };

export function AiEstimateReviewClient({ source, initialExtraction, originalUrl, canEdit, canApprove, batchReviewReasons = [], extractionConfidence = null }: { source: AiEstimateSourceDetail; initialExtraction: AiEstimateExtraction | null; originalUrl: string | null; canEdit: boolean; canApprove: boolean; batchReviewReasons?: string[]; extractionConfidence?: number | null }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const router = useRouter();
  const [data, setData] = useState<AiEstimateExtraction>(initialExtraction ?? { clientName: "", clientId: null, subject: source.title, issueDate: null, templateMessage: "", remarks: "", rawText: "", confidence: 0, lines: [{ ...emptyLine }], warnings: [] });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPending = source.status === "uploaded" || source.status === "processing";

  const batchHints = batchReviewHints(batchReviewReasons, lang);
  const confidenceLabel = extractionConfidenceLabel(extractionConfidence, lang);

  useEffect(() => {
    if (!isPending) return;
    const timer = window.setInterval(() => router.refresh(), 3500);
    return () => window.clearInterval(timer);
  }, [isPending, router]);

  function updateLine(index: number, key: keyof AiEstimateExtraction["lines"][number], value: string | number) {
    setData((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));
  }

  function run(action: "save" | "approve") {
    setError(null); setMessage(null);
    startTransition(async () => {
      const result = action === "approve" ? await approveAiEstimateSource(source.id, data) : await saveAiEstimateExtraction(source.id, data);
      if (!result.ok) { setError(result.error); return; }
      setMessage(action === "approve" ? ui.approve : ui.save);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(ui.delete)) return;
    startTransition(async () => {
      const result = await deleteAiEstimateSource(source.id);
      if (!result.ok) { setError(result.error); return; }
      router.push(`/${lang}/estimates/ai-library`); router.refresh();
    });
  }

  return (
    <SalesFlowShell activeItem="estimates">
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-3"><FileSearch className="h-7 w-7 text-violet-600" /><h1 className="text-3xl font-bold text-slate-900">{ui.title}</h1><AiSourceStatusBadge status={source.status} lang={lang} /></div><p className="mt-2 text-slate-500">{source.title}</p></div><Link href={`/${lang}/estimates/ai-library`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">{ui.back}</Link></div>
        {isPending ? <div className="mt-8 rounded-xl bg-blue-50 p-5 text-blue-800">{ui.processing}</div> : null}
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><h2 className="border-b border-slate-200 bg-white px-5 py-4 text-lg font-bold">{ui.original}</h2><div className="h-[720px] p-3">{originalUrl ? source.mime_type === "application/pdf" ? <iframe title={ui.original} src={originalUrl} className="h-full w-full rounded-lg bg-white" /> : <div className="flex h-full items-start justify-center overflow-auto rounded-lg bg-white p-3"><Image src={originalUrl} alt={source.title} width={1200} height={1600} unoptimized className="h-auto max-w-full object-contain" /></div> : <div className="flex h-full items-center justify-center text-slate-500">{ui.noOriginal}</div>}</div></section>
          <section className="rounded-xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold">{ui.extracted}</h2><div className="space-y-5 p-5">
            {confidenceLabel ? <p className="text-sm font-semibold text-slate-600">{confidenceLabel}</p> : null}
            {batchHints.length ? <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900">{batchHints.map((hint) => <p key={hint}>• {hint}</p>)}</div> : null}
            {data.warnings.length ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{data.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div> : null}
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">{ui.client}</span><input disabled={!canEdit} className="field" value={data.clientName} onChange={(event) => setData({ ...data, clientName: event.target.value })} /></label><label><span className="mb-1 block text-sm font-semibold">{ui.date}</span><input disabled={!canEdit} type="date" className="field" value={data.issueDate ?? ""} onChange={(event) => setData({ ...data, issueDate: event.target.value || null })} /></label></div>
            <label className="block"><span className="mb-1 block text-sm font-semibold">{ui.subject}</span><input disabled={!canEdit} className="field" value={data.subject} onChange={(event) => setData({ ...data, subject: event.target.value })} /></label>
            <div className="space-y-4">{data.lines.map((line, index) => <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_90px_90px_minmax(120px,1fr)]"><label><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.item}</span><input disabled={!canEdit} className="field" value={line.name} onChange={(event) => updateLine(index, "name", event.target.value)} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.qty}</span><input disabled={!canEdit} type="number" min="0" step="0.01" className="field" value={line.qty} onChange={(event) => updateLine(index, "qty", Number(event.target.value))} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.unit}</span><input disabled={!canEdit} className="field" value={line.unit} onChange={(event) => updateLine(index, "unit", event.target.value)} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.price}</span><input disabled={!canEdit} type="number" min="0" className="field" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", Number(event.target.value))} /></label></div><div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto]"><label><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.tax}</span><select disabled={!canEdit} className="field bg-white" value={line.taxCategory} onChange={(event) => updateLine(index, "taxCategory", event.target.value)}><option value="standard_10">10%</option><option value="reduced_8">軽減8%</option><option value="standard_8">8%</option><option value="exempt">対象外</option><option value="standard_5">5%</option></select></label><label><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.reason}</span><input disabled={!canEdit} className="field" value={line.reason} onChange={(event) => updateLine(index, "reason", event.target.value)} /></label>{canEdit && data.lines.length > 1 ? <button type="button" aria-label="Remove" onClick={() => setData((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))} className="self-end rounded-lg p-3 text-red-600 hover:bg-red-50"><Trash2 className="h-5 w-5" /></button> : null}</div></div>)}</div>
            {canEdit ? <button type="button" onClick={() => setData((current) => ({ ...current, lines: [...current.lines, { ...emptyLine }] }))} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><Plus className="h-4 w-4" />{ui.add}</button> : null}
            <label className="block"><span className="mb-1 block text-sm font-semibold">{ui.message}</span><textarea disabled={!canEdit} className="field min-h-20" value={data.templateMessage} onChange={(event) => setData({ ...data, templateMessage: event.target.value })} /></label><label className="block"><span className="mb-1 block text-sm font-semibold">{ui.remarks}</span><textarea disabled={!canEdit} className="field min-h-24" value={data.remarks} onChange={(event) => setData({ ...data, remarks: event.target.value })} /></label>
            {!canApprove ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{ui.admin}</p> : null}{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
            <div className="flex flex-wrap justify-between gap-3"><button type="button" disabled={!canEdit || pending} onClick={remove} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" />{ui.delete}</button><div className="flex gap-3"><button type="button" disabled={!canEdit || pending} onClick={() => run("save")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"><Save className="h-4 w-4" />{ui.save}</button><button type="button" disabled={!canApprove || pending || isPending} onClick={() => run("approve")} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />{ui.approve}</button></div></div>
          </div></section>
        </div>
      </main>
    </SalesFlowShell>
  );
}
