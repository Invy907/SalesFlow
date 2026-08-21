"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck, UploadCloud } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { completeAiEstimateUpload, createAiEstimateUploadTicket } from "@/lib/actions/ai-estimates";

const copy = {
  ja: { title: "見積資料を登録", desc: "PDF・JPG・PNG（最大20MB）", name: "資料名", file: "原本ファイル", visibility: "公開範囲", org: "組織で共有", private: "自分と管理者のみ", submit: "アップロードして確認へ", cancel: "キャンセル", safety: "原本は非公開ストレージに保存され、承認前は推薦に使われません。", error: "ファイルを選択してください。" },
  ko: { title: "견적 자료 등록", desc: "PDF·JPG·PNG (최대 20MB)", name: "자료 이름", file: "원본 파일", visibility: "공개 범위", org: "조직 공용", private: "나와 관리자만", submit: "업로드 후 검수하기", cancel: "취소", safety: "원본은 비공개 저장소에 보관되며 승인 전에는 추천에 사용되지 않습니다.", error: "파일을 선택해 주세요." },
  en: { title: "Add estimate source", desc: "PDF, JPG or PNG (up to 20MB)", name: "Source name", file: "Original file", visibility: "Visibility", org: "Organization", private: "Me and admins", submit: "Upload and review", cancel: "Cancel", safety: "The original stays private and is never used for recommendations before approval.", error: "Select a file." },
} as const;

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function AiEstimateUploadClient() {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "organization">("organization");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload() {
    if (!file) { setError(ui.error); return; }
    setError(null);
    startTransition(async () => {
      const ticket = await createAiEstimateUploadTicket({ fileName: file.name, mimeType: file.type as "application/pdf" | "image/png" | "image/jpeg", fileSize: file.size, fileHash: await sha256(file), title: title.trim() || file.name.replace(/\.[^.]+$/, ""), visibility });
      if (!ticket.ok) { setError(ticket.error); return; }
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage.from("ai-estimate-sources").uploadToSignedUrl(ticket.data.path, ticket.data.token, file, { contentType: file.type });
      if (uploadError) { setError(uploadError.message); return; }
      const completed = await completeAiEstimateUpload(ticket.data.sourceId);
      if (!completed.ok) { setError(completed.error); return; }
      router.push(`/${lang}/estimates/ai-library/${ticket.data.sourceId}`);
      router.refresh();
    });
  }

  return (
    <SalesFlowShell activeItem="estimates">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">{ui.title}</h1><p className="mt-2 text-slate-500">{ui.desc}</p>
        <div className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block"><span className="mb-2 block font-semibold text-slate-800">{ui.name}</span><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={file?.name.replace(/\.[^.]+$/, "") ?? ""} /></label>
          <label className="block"><span className="mb-2 block font-semibold text-slate-800">{ui.file}</span><div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center"><UploadCloud className="mx-auto h-10 w-10 text-violet-500" /><input className="mt-4 block w-full text-sm" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, "")); }} />{file ? <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><FileText className="h-4 w-4" />{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</p> : null}</div></label>
          <fieldset><legend className="mb-2 font-semibold text-slate-800">{ui.visibility}</legend><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2"><input type="radio" checked={visibility === "organization"} onChange={() => setVisibility("organization")} />{ui.org}</label><label className="flex items-center gap-2"><input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} />{ui.private}</label></div></fieldset>
          <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="h-5 w-5 shrink-0" /><p>{ui.safety}</p></div>
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-3"><Link href={`/${lang}/estimates/ai-library`} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700">{ui.cancel}</Link><button type="button" disabled={pending} onClick={upload} className="rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "…" : ui.submit}</button></div>
        </div>
      </main>
    </SalesFlowShell>
  );
}
