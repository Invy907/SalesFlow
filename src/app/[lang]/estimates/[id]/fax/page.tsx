"use client";

import Link from "next/link";
import { use } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getEstimateContent } from "../../content";

const copy = {
  ja: "FAX送信にはまだ対応していません。見積書の詳細画面からPDFを保存し、ご利用のFAXサービスで送信してください。",
  ko: "FAX 전송은 아직 지원하지 않습니다. 견적서 상세 화면에서 PDF를 저장한 뒤 사용 중인 FAX 서비스로 전송해 주세요.",
  en: "FAX sending is not available yet. Save a PDF from the estimate details and send it through your own FAX service.",
} as const;

export default function EstimateFaxPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { id } = use(params);
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  return <SalesFlowShell activeItem="estimates">
    <div className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">{ui.faxPage.title}</h1>
      <p className="mt-6 max-w-2xl rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">{copy[lang]}</p>
      <Link href={`/${lang}/estimates/${id}`} className="mt-6 inline-flex max-w-full rounded-lg bg-[#0A4D34] px-5 py-3 font-semibold text-white">← {ui.detailTitle}</Link>
    </div>
  </SalesFlowShell>;
}
