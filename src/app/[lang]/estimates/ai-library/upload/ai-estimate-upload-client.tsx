"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck, UploadCloud } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { aiEstimateErrorMessage } from "@/components/ai-estimates/error-message";
import { useLanguage } from "@/contexts/language-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { completeAiEstimateUpload, createAiEstimateUploadTicket, createAiEstimateManualSource } from "@/lib/actions/ai-estimates";

import { SourceMetadataFields, SourceWorkFields, sourceCopy, isContextSource, type SourceMetadata, type SourceWorkDetails } from "@/components/ai-estimates/source-fields";

const copy = {
  ja: { fileError: "PDF・JPG・PNG・CSV・XLSX・TXT・MDの0MBより大きく20MB以下のファイルを選んでください。", preparing: "準備中…", uploading: "アップロード中…", completing: "資料を登録中…", failed: "処理に失敗しました。接続を確認して再試行してください。", retry: "再試行", external: "自動抽出が有効です。原本のPDF・画像は外部AIに送信されます。送信してよい資料だけを選んでください。", manual: "PDF・画像の自動抽出は利用できないため、原本を見ながら手入力で確認できます。CSV・XLSX・TXT・MDは外部AIへ送信せず自動で読み込みます。内容を確認した後、管理者が承認します。", readOnly: "資料登録が無効か、登録できる権限がありません。", recover: "登録済み資料の状態を確認", title: "見積資料を登録", desc: "PDF・JPG・PNG・CSV・XLSX・TXT・MD（最大20MB）", name: "資料名", file: "原本ファイル", visibility: "公開範囲", org: "組織で共有", private: "自分と管理者のみ", submit: "アップロードして確認へ", cancel: "キャンセル", safety: "原本は非公開ストレージに保存され、承認前は推薦に使われません。", error: "ファイルを選択してください。" },
  ko: { fileError: "0MB보다 크고 20MB 이하인 PDF·JPG·PNG·CSV·XLSX·TXT·MD 파일을 선택해 주세요.", preparing: "준비 중…", uploading: "업로드 중…", completing: "자료 등록 중…", failed: "처리에 실패했습니다. 연결 상태를 확인하고 다시 시도해 주세요.", retry: "다시 시도", external: "자동 추출이 활성화되어 원본 PDF·이미지가 외부 AI로 전송됩니다. 전송 가능한 자료만 선택해 주세요.", manual: "PDF·이미지는 자동 추출 없이 원본을 보며 직접 입력해 검수할 수 있습니다. CSV·XLSX·TXT·MD는 외부 AI로 전송하지 않고 자동으로 읽어 들입니다. 내용을 검수한 뒤 관리자 승인을 받으세요.", readOnly: "자료 등록이 비활성화되어 있거나 등록 권한이 없습니다.", recover: "등록된 자료 상태 확인", title: "견적 자료 등록", desc: "PDF·JPG·PNG·CSV·XLSX·TXT·MD (최대 20MB)", name: "자료 이름", file: "원본 파일", visibility: "공개 범위", org: "조직 공용", private: "나와 관리자만", submit: "업로드 후 검수하기", cancel: "취소", safety: "원본은 비공개 저장소에 보관되며 승인 전에는 추천에 사용되지 않습니다.", error: "파일을 선택해 주세요." },
  en: { fileError: "Choose a PDF, JPG, PNG, CSV, XLSX, TXT, or MD larger than 0MB and no larger than 20MB.", preparing: "Preparing…", uploading: "Uploading…", completing: "Registering source…", failed: "The request failed. Check your connection and try again.", retry: "Retry", external: "Automatic extraction is enabled. The original PDF or image is sent to an external AI provider. Only upload documents you may send externally.", manual: "PDFs and images require manual review and entry. CSV, XLSX, TXT and MD are parsed automatically without external AI. Review the content before administrator approval.", readOnly: "Source uploads are disabled, or your role does not allow uploads.", recover: "Check the registered source", title: "Add estimate source", desc: "PDF, JPG, PNG, CSV, XLSX, TXT or MD (up to 20MB)", name: "Source name", file: "Original file", visibility: "Visibility", org: "Organization", private: "Me and admins", submit: "Upload and review", cancel: "Cancel", safety: "The original stays private and is never used for recommendations before approval.", error: "Select a file." },
} as const;

const formatCopy = {
  ja: { tableKind: "CSV・XLSXを選ぶ場合、資料の種類を単価表か過去の見積にしてください。", title: "表・テキストの書式", csv: "CSVサンプルをダウンロード", headers: "表の必須列：品目名・単位・単価・税率。数量は過去見積では必須、単価表では空欄なら1です。税込区分（included / excluded）・備考は任意です。", rules: "CSVはUTF-8。XLSXは最大10シート、使用する各シートにヘッダーが必要です。合計80行まで。単価は円の整数、数量は小数4桁まで。数式は値に置き換えてください。税率は10%、5%、0%、reduced_8、standard_8。", text: "TXT・MDは設計資料・作業詳細用です。UTF-8、本文16,000文字まで。単価は別の単価表に登録してください。", textKind: "TXT・MDを選ぶ場合、資料の種類を設計資料か作業詳細にしてください。" },
  ko: { tableKind: "CSV·XLSX를 선택할 때는 자료 종류를 단가표 또는 과거 견적으로 지정해 주세요.", title: "표·텍스트 파일 규격", csv: "CSV 샘플 다운로드", headers: "표 필수 열: 품목명·단위·단가·세율. 수량은 과거 견적에서는 필수이며 단가표에서는 공란이면 1입니다. 세금포함(included / excluded)·비고는 선택입니다.", rules: "CSV는 UTF-8, XLSX는 최대 10개 시트이며 사용하는 각 시트에 헤더가 필요합니다. 합계 80행까지 지원합니다. 단가는 엔 정수, 수량은 소수 4자리까지. 수식은 값으로 붙여넣어 주세요. 세율은 10%, 5%, 0%, reduced_8, standard_8입니다.", text: "TXT·MD는 설계 자료·작업 상세용입니다. UTF-8, 본문 16,000자까지 지원합니다. 단가는 별도 단가표에 등록해 주세요.", textKind: "TXT·MD를 선택할 때는 자료 종류를 설계 자료 또는 작업 상세로 지정해 주세요." },
  en: { tableKind: "Select Price list or Past estimate when uploading CSV/XLSX.", title: "Table and text formats", csv: "Download sample CSV", headers: "Required columns: Item, Unit, Unit price, Tax rate. Quantity is required for past estimates; a blank quantity in a price list defaults to 1. Tax mode (included / excluded) and Notes are optional.", rules: "CSV must use UTF-8. XLSX supports up to 10 sheets with headers on every used sheet, and 80 price rows in total. Prices are whole yen; quantities support 4 decimals. Paste formulas as values. Tax rates: 10%, 5%, 0%, reduced_8, standard_8.", text: "TXT/MD are for design and work sources: UTF-8, up to 16,000 characters. Register prices in a separate price list.", textKind: "Select Design document or Work scope when uploading TXT/MD." },
} as const;

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function AiEstimateUploadClient({ canUpload, allowPrivate, automaticExtraction }: { canUpload: boolean; allowPrivate: boolean; automaticExtraction: boolean }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const sourceUi = sourceCopy[lang];
  const formatUi = formatCopy[lang];
  const [mode, setMode] = useState<"file" | "text">("file");
  const [metadata, setMetadata] = useState<SourceMetadata>({ documentKind: "estimate", projectName: "", revision: "", validFrom: null, validUntil: null });
  const [work, setWork] = useState<SourceWorkDetails>({ workDetails: "", assumptions: "", exclusions: "" });
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "organization">("organization");
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<{ sourceId: string; path: string; token: string } | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload() {
    if (!canUpload || pending) return;
    if (metadata.validFrom && metadata.validUntil && metadata.validFrom > metadata.validUntil) { setError(sourceUi.datesError); return; }
    if (mode === "text") {
      if (!title.trim() || !work.workDetails.trim() || !isContextSource(metadata.documentKind)) { setError(sourceUi.requiredDetails); return; }
      setError(null);
      startTransition(async () => {
        try {
          const result = await createAiEstimateManualSource({ title: title.trim(), visibility, ...metadata, documentKind: metadata.documentKind as "design" | "work_scope", ...work });
          if (!result.ok) { setError(aiEstimateErrorMessage(result.error, lang, ui.failed)); return; }
          router.push(`/${lang}/estimates/ai-library/${result.data}`); router.refresh();
        } catch { setError(ui.failed); }
      });
      return;
    }
    if (!file) { setError(ui.error); return; }
    if (["txt", "md"].includes(file.name.split(".").pop()?.toLowerCase() ?? "") && !isContextSource(metadata.documentKind)) { setError(formatUi.textKind); return; }
    if (["csv", "xlsx"].includes(file.name.split(".").pop()?.toLowerCase() ?? "") && isContextSource(metadata.documentKind)) { setError(formatUi.tableKind); return; }
    const mimeType = sourceFileMimeType(file);
    if (!mimeType || file.size <= 0 || file.size > 20 * 1024 * 1024) { setError(ui.fileError); return; }
    setError(null);
    startTransition(async () => {
      try {
        setStage(ui.preparing);
        let currentTicket = ticket;
        if (!currentTicket) {
          const result = await createAiEstimateUploadTicket({ fileName: file.name, mimeType, fileSize: file.size, fileHash: await sha256(file), title: (title.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0,255), visibility, ...metadata });
          if (!result.ok) { setError(aiEstimateErrorMessage(result.error, lang, ui.failed)); return; }
          currentTicket = result.data;
          setTicket(result.data);
        }
        if (!uploaded) {
          setStage(ui.uploading);
          const supabase = createSupabaseBrowserClient();
          const { error: uploadError } = await supabase.storage.from("ai-estimate-sources").uploadToSignedUrl(currentTicket.path, currentTicket.token, file, { contentType: mimeType });
          if (uploadError) { setError(aiEstimateErrorMessage(uploadError.message, lang, ui.failed)); return; }
          setUploaded(true);
        }
        setStage(ui.completing);
        const completed = await completeAiEstimateUpload(currentTicket.sourceId);
        if (!completed.ok) { setError(aiEstimateErrorMessage(completed.error, lang, ui.failed)); return; }
        router.push(`/${lang}/estimates/ai-library/${currentTicket.sourceId}`);
        router.refresh();
      } catch { setError(ui.failed); }
      finally { setStage(null); }
    });
  }

  return (
    <SalesFlowShell activeItem="estimates">
      <main className="mx-auto w-full min-w-0 max-w-3xl [overflow-wrap:anywhere] px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold sm:text-3xl text-slate-900">{ui.title}</h1><p className="mt-2 text-slate-500">{ui.desc}</p>
        <div className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label={sourceUi.kind}>{(["file", "text"] as const).map(tab => <button type="button" key={tab} disabled={pending || Boolean(ticket)} aria-pressed={mode === tab} onClick={() => { setMode(tab); setError(null); if (tab === "text" && !isContextSource(metadata.documentKind)) setMetadata({ ...metadata, documentKind: "work_scope" }); }} className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold ${mode === tab ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}>{tab === "file" ? sourceUi.fileTab : sourceUi.textTab}</button>)}</div>
          <SourceMetadataFields value={metadata} onChange={setMetadata} lang={lang} disabled={!canUpload || pending || Boolean(ticket)} contextOnly={mode === "text"} />
          <label className="block"><span className="mb-2 block font-semibold text-slate-800">{ui.name}</span><input className="field" disabled={!canUpload || pending || Boolean(ticket)} maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={file?.name.replace(/\.[^.]+$/, "") ?? ""} /></label>
          {mode === "file" ? <label className="block"><span className="mb-2 block font-semibold text-slate-800">{ui.file}</span><div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center sm:p-8"><UploadCloud className="mx-auto h-10 w-10 text-violet-500" /><input className="mt-4 block w-full min-w-0 max-w-full text-sm" type="file" disabled={!canUpload || pending || Boolean(ticket)} accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.txt,.md,application/pdf,image/png,image/jpeg,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown" onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, "").slice(0,255)); }} />{file ? <p className="mt-3 flex min-w-0 items-start gap-2 text-left text-sm text-slate-600"><FileText className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-all">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</span></p> : null}</div></label> : <SourceWorkFields value={work} onChange={setWork} lang={lang} required disabled={!canUpload || pending} />}
          {mode === "file" && <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><summary className="cursor-pointer font-semibold text-slate-800">{formatUi.title}</summary><div className="mt-3 space-y-3 text-slate-600"><p>{formatUi.headers}</p><p>{formatUi.rules}</p><a className="inline-block min-h-11 py-3 font-semibold text-violet-700 underline" download="salesflow-price-list-sample.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent("\uFEFFItem,Unit,Unit price,Tax rate,Quantity,Tax mode,Notes\r\nScreen design,screen,30000,10%,1,excluded,Example price - replace before approval\r\n")}`}>{formatUi.csv}</a><p>{formatUi.text}</p></div></details>}
          <fieldset disabled={!canUpload || pending || Boolean(ticket)}><legend className="mb-2 font-semibold text-slate-800">{ui.visibility}</legend><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"><label className="flex min-h-11 items-center gap-2"><input type="radio" checked={visibility === "organization"} onChange={() => setVisibility("organization")} />{ui.org}</label>{allowPrivate ? <label className="flex min-h-11 items-center gap-2"><input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} />{ui.private}</label> : null}</div></fieldset>
          <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="h-5 w-5 shrink-0" /><div className="min-w-0"><p>{ui.safety}</p><p className="mt-2">{mode === "text" || (file && ["csv", "xlsx", "txt", "md"].includes(file.name.split(".").pop()?.toLowerCase() ?? "")) ? ({ ja: "テキスト・表は外部AIへ送信せず読み込みます。登録後に内容を確認してください。", ko: "텍스트와 표는 외부 AI로 전송하지 않고 읽어 들입니다. 등록 후 내용을 검수해 주세요.", en: "Text and tables are parsed without sending them to external AI. Review the content after registration." }[lang]) : automaticExtraction ? ui.external : ui.manual}</p></div></div>
          {!canUpload ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{ui.readOnly}</p> : null}
          {ticket && error ? <Link className="block text-sm text-violet-700 underline" href={`/${lang}/estimates/ai-library/${ticket.sourceId}`}>{ui.recover}</Link> : null}
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end"><Link href={`/${lang}/estimates/ai-library`} className="rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700">{ui.cancel}</Link><button type="button" disabled={pending || !canUpload || (mode === "file" ? !file : !title.trim() || !work.workDetails.trim())} onClick={upload} className="rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? stage ?? ui.preparing : ticket ? ui.retry : mode === "text" ? sourceUi.textSubmit : ui.submit}</button></div>
        </div>
      </main>
    </SalesFlowShell>
  );
}

function sourceFileMimeType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeTypes = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain", md: "text/markdown" } as const;
  return extension && extension in mimeTypes ? mimeTypes[extension as keyof typeof mimeTypes] : null;
}
