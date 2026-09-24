"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSearch, Plus, Save, Trash2 } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { AiSourceStatusBadge } from "@/components/ai-estimates/ai-source-status-badge";
import { localizeManualScaffold } from "@/components/ai-estimates/presentation";
import { aiEstimateErrorMessage, isAiReviewConflict } from "@/components/ai-estimates/error-message";
import { useLanguage } from "@/contexts/language-context";
import type { AiEstimateSourceDetail } from "@/lib/db/ai-estimates";
import { aiEstimateExtractionSchema, type AiEstimateExtraction } from "@/lib/ai/estimates/schemas";
import { batchReviewHints, extractionConfidenceLabel } from "@/lib/ai/estimates/review-batch-hints";
import { approveAiEstimateSource, deleteAiEstimateSource, saveAiEstimateExtraction, retryAiEstimateSource, restoreAiEstimateSource } from "@/lib/actions/ai-estimates";

import { SourceWorkFields, sourceCopy, sourceKindLabel, isContextSource } from "@/components/ai-estimates/source-fields";

const copy = {
  ja: { reload: "最新の資料を読み直す", reloadConfirm: "保存していない入力内容を破棄して、最新の資料を読み直しますか？", amountRequired: "承認する明細は、数量を0より大きく、単価を0以外にしてください。", line: "行", numberHelp: "数量は小数点以下4桁まで、単価は円単位の整数です。値引きには負の単価を入力できます。", restore: "確認待ちに戻す", purged: "保存期間を過ぎたため原本ファイルは削除されました。確認済みの内容と推薦の根拠は保持されています。", excluded: "推薦から除外されています。確認待ちに戻して再承認すると検索に戻せます。", retry: "資料の準備を再試行", invalid: "入力を確認してください。", taxRequired: "承認前に原本の単価が税込か税抜かを確認し、各行の税率を明示してください。「会社設定」のままでは承認できません。", error: "処理に失敗しました。再試行してください。", approved: "承認済みです。見積アシストの検索に利用できます。", saved: "保存しました。承認までは推薦に使われません。", deleteConfirm: "この資料を推薦対象から除外しますか？原本と確認データは保持され、再承認できます。", openOriginal: "別のタブで開く", missingOriginal: "原本を表示できません。ページを更新するか、資料の登録状態を確認してください。", createEstimate: "見積を作成", followCompany: "会社設定", reducedTax: "軽減8%", exemptTax: "対象外", removeLine: "行を削除", taxMode: "原本の単価", unknownTax: "未確認", excludedTax: "税抜", includedTax: "税込", reviewConfirm: "原本と品目・数量・単価・税区分を照合しました。承認すると推薦の根拠になります。", title: "抽出結果の確認", original: "原本", extracted: "見積データ", client: "取引先", subject: "件名", date: "見積日", item: "品目", qty: "数量", unit: "単位", price: "単価", tax: "税区分", reason: "根拠・メモ", remarks: "備考", message: "定型文", add: "行を追加", save: "一時保存", approve: "AI資料として承認", delete: "資料を除外", back: "資料一覧", admin: "資料の承認は管理者のみ可能です。", processing: "資料を準備しています。数秒後に更新します。", noOriginal: "既存のSalesFlow見積から登録された資料です。" },
  ko: { reload: "최신 자료 다시 불러오기", reloadConfirm: "저장하지 않은 입력 내용을 버리고 최신 자료를 불러올까요?", amountRequired: "승인할 명세의 수량은 0보다 크게, 단가는 0이 아닌 값으로 입력해 주세요.", line: "행", numberHelp: "수량은 소수점 4자리까지, 단가는 엔 단위 정수로 입력합니다. 할인은 음수 단가를 사용할 수 있습니다.", restore: "검수 대기로 복원", purged: "보관 기간이 지나 원본 파일이 삭제되었습니다. 검수한 내용과 추천 근거는 유지됩니다.", excluded: "추천에서 제외된 자료입니다. 검수 대기로 복원한 뒤 다시 승인하면 검색에 포함됩니다.", retry: "자료 준비 다시 시도", invalid: "입력 내용을 확인해 주세요.", taxRequired: "승인 전에 원본 단가의 세금 포함 여부와 각 행의 세율을 확인해 주세요. 세율이 회사 설정인 행은 승인할 수 없습니다.", error: "처리에 실패했습니다. 다시 시도해 주세요.", approved: "승인되었습니다. 견적 도우미의 검색에 사용할 수 있습니다.", saved: "저장했습니다. 승인 전에는 추천에 사용되지 않습니다.", deleteConfirm: "이 자료를 추천 대상에서 제외할까요? 원본과 검수 데이터는 보존되며 다시 승인할 수 있습니다.", openOriginal: "새 탭에서 열기", missingOriginal: "원본을 표시할 수 없습니다. 새로고침하거나 자료 등록 상태를 확인해 주세요.", createEstimate: "견적 만들기", followCompany: "회사 설정", reducedTax: "경감 8%", exemptTax: "대상 외", removeLine: "행 삭제", taxMode: "원본 단가", unknownTax: "미확인", excludedTax: "세금 별도", includedTax: "세금 포함", reviewConfirm: "원본과 품목·수량·단가·세금 구분을 대조했습니다. 승인하면 추천 근거로 사용됩니다.", title: "추출 결과 검수", original: "원본", extracted: "견적 데이터", client: "거래처", subject: "제목", date: "견적일", item: "품목", qty: "수량", unit: "단위", price: "단가", tax: "세금", reason: "근거·메모", remarks: "비고", message: "안내 문구", add: "행 추가", save: "임시 저장", approve: "AI 자료 승인", delete: "자료 제외", back: "자료 목록", admin: "자료 승인은 관리자만 할 수 있습니다.", processing: "자료를 준비 중입니다. 잠시 후 자동으로 새로고침됩니다.", noOriginal: "기존 SalesFlow 견적에서 등록한 자료입니다." },
  en: { reload: "Reload the latest source", reloadConfirm: "Discard unsaved edits and reload the latest source?", amountRequired: "To approve, every line needs a positive quantity and a nonzero unit price.", line: "Line", numberHelp: "Quantities support up to 4 decimal places. Unit prices are whole yen; use a negative price for discounts.", restore: "Restore for review", purged: "The original file was deleted after its retention period. Reviewed data and suggestion evidence are retained.", excluded: "Excluded from suggestions. Restore for review, then approve again to include it in search.", retry: "Retry source preparation", invalid: "Check the input fields.", taxRequired: "Before approval, verify whether the original prices include tax and choose an explicit tax rate for every line. Company-default tax is not accepted.", error: "The request failed. Please try again.", approved: "Approved and available as evidence in the estimate assistant.", saved: "Saved. The source is not used for suggestions until approved.", deleteConfirm: "Exclude this source from suggestions? The original and reviewed data are retained, and it can be approved again.", openOriginal: "Open in new tab", missingOriginal: "The original could not be displayed. Refresh the page or check the upload status.", createEstimate: "Create estimate", followCompany: "Company default", reducedTax: "Reduced 8%", exemptTax: "Exempt", removeLine: "Remove line", taxMode: "Original unit prices", unknownTax: "Not verified", excludedTax: "Tax excluded", includedTax: "Tax included", reviewConfirm: "I checked the items, quantities, unit prices, and tax categories against the original. Approval makes this source available as evidence.", title: "Review extraction", original: "Original", extracted: "Estimate data", client: "Client", subject: "Subject", date: "Estimate date", item: "Item", qty: "Qty", unit: "Unit", price: "Unit price", tax: "Tax", reason: "Evidence / note", remarks: "Remarks", message: "Message", add: "Add line", save: "Save draft", approve: "Approve AI source", delete: "Exclude source", back: "Library", admin: "Only an organization admin can approve sources.", processing: "Preparing this source. The page will refresh shortly.", noOriginal: "This source was imported from an existing SalesFlow estimate." },
} as const;

const emptyLine: AiEstimateExtraction["lines"][number] = { name: "", qty: 1, unit: "", unitPrice: 0, taxCategory: "follow_company", confidence: 0, reason: "" };

export function AiEstimateReviewClient({ source, initialExtraction, originalUrl, canEdit, canApprove, extractionProvider = null, batchReviewReasons = [], extractionConfidence = null, clients }: { clients: Array<{ id: string; name: string }>; source: AiEstimateSourceDetail; initialExtraction: AiEstimateExtraction | null; originalUrl: string | null; canEdit: boolean; canApprove: boolean; extractionProvider?: string | null; batchReviewReasons?: string[]; extractionConfidence?: number | null }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const sourceUi = sourceCopy[lang];
  const contextSource = isContextSource(source.document_kind);
  const sourceDateLabel = source.document_kind === "estimate" ? ui.date : { ja: "資料作成日", ko: "자료 작성일", en: "Source date" }[lang];
  const router = useRouter();
  const [data, setCurrentData] = useState<AiEstimateExtraction>(initialExtraction ? localizeManualScaffold(initialExtraction, extractionProvider, lang) : { documentKind: source.document_kind, workDetails: "", assumptions: "", exclusions: "", currency: "JPY", taxMode: "unknown", clientName: "", clientId: null, subject: source.title.slice(0, 70), issueDate: null, templateMessage: "", remarks: "", rawText: "", confidence: 0, lines: contextSource ? [] : [{ ...emptyLine }], warnings: [] });
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Keep the revision that these editable values were loaded from. A background refresh must not silently accept another reviewer's newer edits.
  const [revision, setRevision] = useState(source.updated_at);
  const [reviewed, setReviewed] = useState(false);
  const isPending = source.status === "uploaded" || source.status === "processing";

  const readOnly = !canEdit || pending || isPending || source.status === "excluded";
  function setData(next: AiEstimateExtraction | ((current: AiEstimateExtraction) => AiEstimateExtraction)) { setReviewed(false); setCurrentData(next); }

  const batchHints = batchReviewHints(batchReviewReasons, lang);
  const confidenceLabel = source.source_type === "manual"
    ? { ja: "直接入力した資料", ko: "직접 입력한 자료", en: "Manually entered source" }[lang]
    : extractionConfidenceLabel(extractionConfidence, lang);

  useEffect(() => {
    if (!isPending) return;
    const timer = window.setInterval(() => router.refresh(), 3500);
    return () => window.clearInterval(timer);
  }, [isPending, router]);

  function updateLine(index: number, key: keyof AiEstimateExtraction["lines"][number], value: string | number) {
    setReviewed(false);
    setData((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));
  }

  function run(action: "save" | "approve") {
    if (readOnly || (action === "approve" && (!canApprove || !reviewed))) return;
    setError(null); setMessage(null); setConflict(false);
    const parsed = aiEstimateExtractionSchema.safeParse({ ...data, documentKind: source.document_kind, ...(contextSource ? { lines: [], taxMode: "unknown" } : {}) });
    if (!parsed.success) { setError(`${ui.invalid} ${parsed.error.issues.map((issue) => { const field = String(issue.path.at(-1)); const labels: Record<string, string> = { name: ui.item, qty: ui.qty, unit: ui.unit, unitPrice: ui.price, taxCategory: ui.tax, reason: ui.reason, clientName: ui.client, subject: ui.subject, issueDate: sourceDateLabel, templateMessage: ui.message, remarks: ui.remarks, taxMode: ui.taxMode, workDetails: sourceUi.workDetails, assumptions: sourceUi.assumptions, exclusions: sourceUi.exclusions }; return `${issue.path[0] === "lines" ? `${ui.line} ${Number(issue.path[1]) + 1}: ` : ""}${labels[field] ?? ui.extracted}`; }).join(", ")}`); return; }
    if (action === "approve" && !contextSource && (!parsed.data.lines.length || parsed.data.lines.some((line) => line.qty <= 0 || line.unitPrice === 0))) { setError(ui.amountRequired); return; }
    if (action === "approve" && source.document_kind === "price_list" && parsed.data.lines.some(line => line.unitPrice <= 0)) { setError(sourceUi.positivePrice); return; }
    if (action === "approve" && !contextSource && (data.taxMode === "unknown" || data.lines.some((line) => line.taxCategory === "follow_company"))) { setError(ui.taxRequired); return; }
    if (action === "approve" && contextSource && !parsed.data.workDetails.trim()) { setError(sourceUi.requiredDetails); return; }
    startTransition(async () => {
      try {
        const result = action === "approve" ? await approveAiEstimateSource(source.id, parsed.data, revision) : await saveAiEstimateExtraction(source.id, parsed.data, revision);
        if (!result.ok) { setConflict(isAiReviewConflict(result.error)); setError(aiEstimateErrorMessage(result.error, lang, ui.error)); return; }
        if (result.data && "updatedAt" in result.data && typeof result.data.updatedAt === "string") setRevision(result.data.updatedAt);
        setMessage(action === "approve" ? ui.approved : ui.saved);
        router.refresh();
      } catch { setError(ui.error); }
    });
  }

  function restore() {
    if (!canEdit || pending) return;
    setError(null); setMessage(null); setConflict(false);
    startTransition(async () => {
      try {
        const result = await restoreAiEstimateSource(source.id);
        if (!result.ok) { setConflict(isAiReviewConflict(result.error)); setError(aiEstimateErrorMessage(result.error, lang, ui.error)); return; }
        setReviewed(false); router.refresh();
      } catch { setError(ui.error); }
    });
  }

  function retry() {
    if (!canEdit || pending) return;
    setError(null); setMessage(null); setConflict(false);
    startTransition(async () => {
      try {
        const result = await retryAiEstimateSource(source.id);
        if (!result.ok) { setConflict(isAiReviewConflict(result.error)); setError(aiEstimateErrorMessage(result.error, lang, ui.error)); return; }
        router.refresh();
      } catch { setError(ui.error); }
    });
  }

  function remove() {
    if (readOnly || !window.confirm(ui.deleteConfirm)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAiEstimateSource(source.id);
        if (!result.ok) { setConflict(isAiReviewConflict(result.error)); setError(aiEstimateErrorMessage(result.error, lang, ui.error)); return; }
        router.push(`/${lang}/estimates/ai-library`); router.refresh();
      } catch { setError(ui.error); }
    });
  }

  return (
    <SalesFlowShell activeItem="estimates">
      <main className="mx-auto w-full min-w-0 max-w-[1500px] [overflow-wrap:anywhere] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><FileSearch className="h-7 w-7 shrink-0 text-violet-600" /><h1 className="text-2xl font-bold sm:text-3xl text-slate-900">{ui.title}</h1><AiSourceStatusBadge status={source.status} lang={lang} /></div><p className="mt-2 text-slate-500">{source.title}</p><p className="mt-2 text-sm text-slate-600">{[sourceKindLabel(source.document_kind, lang), source.project_name, source.revision && `${sourceUi.revision}: ${source.revision}`, source.valid_from && `${sourceUi.validFrom}: ${source.valid_from}`, source.valid_until && `${sourceUi.validUntil}: ${source.valid_until}`].filter(Boolean).join(" · ")}</p></div><Link href={`/${lang}/estimates/ai-library`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">{ui.back}</Link></div>
        {source.error_message ? <p role="alert" className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{aiEstimateErrorMessage(source.error_message, lang, ui.error)}</p> : null}
        {source.status === "excluded" ? <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{ui.excluded}{canEdit ? <button type="button" disabled={pending} onClick={restore} className="ml-3 underline">{ui.restore}</button> : null}</p> : null}
        {source.status === "approved" ? <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{ui.approved}<Link href={`/${lang}/estimates/new?aiSource=${source.id}${initialExtraction?.clientId ? `&clientId=${initialExtraction.clientId}` : ""}`} className="ml-3 inline-block font-semibold underline">{sourceUi.ready}</Link></div> : null}
        {canEdit && (source.status === "failed" || source.status === "uploaded") ? <button type="button" disabled={pending} onClick={retry} className="mt-3 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-40">{ui.retry}</button> : null}
        {isPending ? <div className="mt-8 rounded-xl bg-blue-50 p-5 text-blue-800">{ui.processing}</div> : null}
        <div className={originalUrl ? "mt-8 grid min-w-0 gap-6 xl:grid-cols-2" : "mx-auto mt-8 grid max-w-4xl gap-5"}>
          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><h2 className="border-b border-slate-200 bg-white px-5 py-4 text-lg font-bold">{ui.original}{originalUrl ? <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="ml-3 text-sm font-normal text-violet-700 underline">{ui.openOriginal}</a> : null}</h2><div className={originalUrl ? "h-[360px] p-3 sm:h-[600px] xl:h-[720px]" : "p-2"}>{originalUrl ? source.mime_type === "application/pdf" ? <iframe title={ui.original} src={originalUrl} className="h-full w-full rounded-lg bg-white" /> : source.mime_type?.startsWith("image/") ? <div className="flex h-full items-start justify-center overflow-auto rounded-lg bg-white p-3"><Image src={originalUrl} alt={source.title} width={1200} height={1600} unoptimized className="h-auto max-w-full object-contain" /></div> : <div className="h-full overflow-auto rounded-lg bg-white p-4"><a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">{source.original_file_name ?? source.title} · {ui.openOriginal} ↗</a><pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm text-slate-600">{data.rawText}</pre></div> : <div className="flex h-full items-center justify-center text-slate-500">{source.file_purged_at ? <p className="p-4 text-center">{ui.purged}</p> : source.imported_estimate_id ? <Link href={`/${lang}/estimates/${source.imported_estimate_id}`} target="_blank" rel="noopener noreferrer" className="p-4 text-center text-violet-700 underline">{ui.noOriginal}<span className="mt-1 block text-sm">{ui.openOriginal} ↗</span></Link> : <p className="p-4 text-center">{source.source_type === "manual" ? sourceUi.manual : ui.missingOriginal}</p>}</div>}</div></section>
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold">{sourceKindLabel(source.document_kind, lang)}</h2><div className="space-y-5 p-3 sm:p-5">
            {confidenceLabel ? <p className="text-sm font-semibold text-slate-600">{confidenceLabel}</p> : null}
            {batchHints.length ? <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900">{batchHints.map((hint) => <p key={hint}>• {hint}</p>)}</div> : null}
            {data.warnings.length ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{data.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div> : null}
            <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-800">{contextSource ? sourceUi.contextHelp : sourceUi.priceHelp}</p>
            <label className="block"><span className="mb-1 block text-sm font-semibold">{sourceUi.linkedClient}</span><select disabled={readOnly} className="field" value={data.clientId ?? ""} onChange={event => { const client = clients.find(item => item.id === event.target.value); setData({ ...data, clientId: client?.id ?? null, clientName: client?.name ?? data.clientName }); }}><option value="">{sourceUi.noClient}</option>{data.clientId && !clients.some(client => client.id === data.clientId) ? <option value={data.clientId}>{data.clientName}</option> : null}{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="min-w-0"><span className="mb-1 block text-sm font-semibold">{ui.client}</span><input disabled={readOnly} className="field" maxLength={255} value={data.clientName} onChange={(event) => setData({ ...data, clientId: null, clientName: event.target.value })} /></label><label className="min-w-0"><span className="mb-1 block text-sm font-semibold">{sourceDateLabel}</span><input disabled={readOnly} type="date" className="field" value={data.issueDate ?? ""} onChange={(event) => setData({ ...data, issueDate: event.target.value || null })} /></label></div>
            <label className="block"><span className="mb-1 block text-sm font-semibold">{ui.subject}</span><input disabled={readOnly} className="field" maxLength={70} value={data.subject} onChange={(event) => setData({ ...data, subject: event.target.value })} /></label>
            {!contextSource && <>
            <label className="block"><span className="mb-1 block text-sm font-semibold">{ui.taxMode} · JPY</span><select className="field" disabled={readOnly} value={data.taxMode} onChange={(event) => { setReviewed(false); setData({ ...data, taxMode: event.target.value as AiEstimateExtraction["taxMode"] }); }}><option value="unknown">{ui.unknownTax}</option><option value="excluded">{ui.excludedTax}</option><option value="included">{ui.includedTax}</option></select><span className="mt-1 block text-xs text-slate-500">{ui.taxRequired}</span></label>
            <p className="text-xs text-slate-500">{source.document_kind === "price_list" ? sourceUi.positivePrice : ui.numberHelp}</p>
            <div className="space-y-4">{data.lines.map((line, index) => <div key={index} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"><div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]"><label className="min-w-0 sm:col-span-2 2xl:col-span-1"><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.item}</span><input disabled={readOnly} className="field" maxLength={255} value={line.name} onChange={(event) => updateLine(index, "name", event.target.value)} /></label><label className="min-w-0"><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.qty}</span><input disabled={readOnly} type="number" min="0" max="999999" step="0.0001" className="field" value={line.qty} onChange={(event) => updateLine(index, "qty", event.target.value)} /></label><label className="min-w-0"><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.unit}</span><input disabled={readOnly} className="field" maxLength={50} value={line.unit} onChange={(event) => updateLine(index, "unit", event.target.value)} /></label><label className="min-w-0 sm:col-span-2 2xl:col-span-1"><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.price}</span><input disabled={readOnly} type="number" min={source.document_kind === "price_list" ? 1 : -999999999999} max="999999999999" step="1" className="field" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} /></label></div><div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><label className="min-w-0 sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.tax}</span><select disabled={readOnly} className="field bg-white" value={line.taxCategory} onChange={(event) => updateLine(index, "taxCategory", event.target.value)}><option value="follow_company">{ui.followCompany}</option><option value="standard_10">10%</option><option value="reduced_8">{ui.reducedTax}</option><option value="standard_8">8%</option><option value="exempt">{ui.exemptTax}</option><option value="standard_5">5%</option></select></label><label className="min-w-0"><span className="mb-1 block text-xs font-semibold text-slate-500">{ui.reason}</span><input disabled={readOnly} className="field" maxLength={500} value={line.reason} onChange={(event) => updateLine(index, "reason", event.target.value)} /></label>{canEdit && data.lines.length > 1 ? <button type="button" disabled={readOnly} aria-label={`${ui.removeLine} ${index + 1}`} onClick={() => setData((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))} className="min-h-11 min-w-11 justify-self-end self-end rounded-lg p-3 text-red-600 hover:bg-red-50"><Trash2 className="h-5 w-5" /></button> : null}</div></div>)}</div>
            {canEdit ? <button type="button" disabled={readOnly || data.lines.length >= 80} onClick={() => setData((current) => current.lines.length >= 80 ? current : ({ ...current, lines: [...current.lines, { ...emptyLine }] }))} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><Plus className="h-4 w-4 shrink-0" />{ui.add} ({data.lines.length}/80)</button> : null}
            </>}
            <SourceWorkFields value={{ workDetails: data.workDetails, assumptions: data.assumptions, exclusions: data.exclusions }} onChange={work => setData({ ...data, ...work })} lang={lang} disabled={readOnly} required={contextSource} />
            <label className="block"><span className="mb-1 block text-sm font-semibold">{ui.message}</span><textarea disabled={readOnly} className="field min-h-20" maxLength={2000} value={data.templateMessage} onChange={(event) => setData({ ...data, templateMessage: event.target.value })} /></label><label className="block"><span className="mb-1 block text-sm font-semibold">{ui.remarks}</span><textarea disabled={readOnly} className="field min-h-24" maxLength={5000} value={data.remarks} onChange={(event) => setData({ ...data, remarks: event.target.value })} /></label>
            {!canApprove ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{ui.admin}</p> : null}{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}{conflict ? <button type="button" className="ml-3 underline" onClick={() => { if (window.confirm(ui.reloadConfirm)) window.location.reload(); }}>{ui.reload}</button> : null}</p> : null}{message ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
            {canApprove && source.status !== "approved" && source.status !== "excluded" ? <label className="flex items-start gap-2 rounded-lg bg-violet-50 p-3 text-sm"><input type="checkbox" disabled={readOnly} className="mt-1 shrink-0" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />{contextSource ? sourceUi.contextConfirm : ui.reviewConfirm}</label> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between"><button type="button" disabled={readOnly || source.status === "excluded"} onClick={remove} className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4 shrink-0" />{ui.delete}</button><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><button type="button" disabled={readOnly} onClick={() => run("save")} className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"><Save className="h-4 w-4 shrink-0" />{ui.save}</button><button type="button" disabled={!canApprove || readOnly || !reviewed || source.status === "approved"} onClick={() => run("approve")} className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4 shrink-0" />{ui.approve}</button></div></div>
          </div></section>
        </div>
      </main>
    </SalesFlowShell>
  );
}
