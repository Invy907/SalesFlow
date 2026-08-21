"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, Library, Sparkles } from "lucide-react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { AiSourceStatusBadge } from "@/components/ai-estimates/ai-source-status-badge";
import { useLanguage } from "@/contexts/language-context";
import type { AiEstimateSourceListItem, AiPriceStat } from "@/lib/db/ai-estimates";

const copy = {
  ja: { title: "AI見積資料", desc: "承認した過去の見積だけが自動入力の根拠になります。", upload: "紙・PDF見積を登録", back: "見積一覧", empty: "まだAI資料がありません。", source: "資料", type: "種類", status: "状態", date: "登録日", uploadType: "ファイル", estimateType: "既存見積", stats: "よく使う品目と価格", samples: "件", median: "中央値" },
  ko: { title: "AI 견적 자료함", desc: "승인된 과거 견적만 자동입력의 근거로 사용됩니다.", upload: "종이·PDF 견적 등록", back: "견적 목록", empty: "아직 AI 자료가 없습니다.", source: "자료", type: "종류", status: "상태", date: "등록일", uploadType: "파일", estimateType: "기존 견적", stats: "자주 쓰는 품목과 가격", samples: "건", median: "중앙값" },
  en: { title: "AI estimate library", desc: "Only approved estimates are used as autofill evidence.", upload: "Upload estimate", back: "Estimates", empty: "No AI sources yet.", source: "Source", type: "Type", status: "Status", date: "Added", uploadType: "File", estimateType: "Estimate", stats: "Frequent items and prices", samples: "samples", median: "Median" },
} as const;

export function AiEstimateLibraryClient({ sources, priceStats }: { sources: AiEstimateSourceListItem[]; priceStats: AiPriceStat[] }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const router = useRouter();
  const hasPending = sources.some((source) => source.status === "uploaded" || source.status === "processing");

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [hasPending, router]);

  return (
    <SalesFlowShell activeItem="estimates">
      <main className="mx-auto w-full max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-violet-100 p-2 text-violet-700"><Library className="h-6 w-6" /></span>
              <h1 className="text-3xl font-bold text-slate-900">{ui.title}</h1>
            </div>
            <p className="mt-3 text-slate-600">{ui.desc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${lang}/estimates`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">{ui.back}</Link>
            <Link href={`/${lang}/estimates/ai-library/upload`} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><FileUp className="h-4 w-4" />{ui.upload}</Link>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {sources.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">{ui.source}</th><th className="px-5 py-3">{ui.type}</th><th className="px-5 py-3">{ui.status}</th><th className="px-5 py-3">{ui.date}</th></tr></thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="px-5 py-4"><Link href={`/${lang}/estimates/ai-library/${source.id}`} className="font-semibold text-cyan-700 hover:underline">{source.title}</Link>{source.original_file_name ? <p className="mt-1 text-xs text-slate-400">{source.original_file_name}</p> : null}{source.error_message ? <p className="mt-1 text-xs text-red-600">{source.error_message}</p> : null}</td>
                      <td className="px-5 py-4 text-slate-600">{source.source_type === "upload" ? ui.uploadType : ui.estimateType}</td>
                      <td className="px-5 py-4"><AiSourceStatusBadge status={source.status} lang={lang} /></td>
                      <td className="px-5 py-4 text-slate-500">{new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(source.created_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="p-14 text-center text-slate-500">{ui.empty}</div>}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" /><h2 className="text-xl font-bold text-slate-900">{ui.stats}</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {priceStats.map((stat) => (
              <div key={stat.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{stat.display_name}</p>
                <p className="mt-3 text-2xl font-bold text-violet-700">¥{Number(stat.median_price).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500">{ui.median} · ¥{Number(stat.p25_price).toLocaleString()}–¥{Number(stat.p75_price).toLocaleString()} · {stat.sample_count}{ui.samples}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </SalesFlowShell>
  );
}
