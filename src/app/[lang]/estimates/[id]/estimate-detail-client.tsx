"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  issueEstimate,
  revokeShareEstimate,
  saveEstimateMemo,
  shareEstimate,
} from "@/lib/actions/estimates";
import { getEstimateContent } from "../content";

export type EstimateDetail = {
  id: string;
  documentNumber: string;
  clientId: string | null;
  clientName: string;
  subject: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  internalMemo: string;
  templateMessage: string;
  remarks: string;
  subtotal: number;
  tax: number;
  total: number;
  shareToken: string | null;
  lines: Array<{
    lineNo: number;
    name: string;
    qty: number;
    unit: string;
    unitPrice: number;
  }>;
  sender: {
    companyName: string;
    tel: string;
    email: string;
  };
};

function yen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

export function EstimateDetailClient({ detail }: { detail: EstimateDetail }) {
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const router = useRouter();
  const [memo, setMemo] = useState(detail.internalMemo);
  const [shareToken, setShareToken] = useState(detail.shareToken);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<"share" | null>(null);
  const [pending, startTransition] = useTransition();

  const shareUrl = useMemo(() => {
    if (!shareToken || typeof window === "undefined") return "";
    return `${window.location.origin}/${lang}/estimates/shared/${shareToken}`;
  }, [shareToken, lang]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function copyToClipboard(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
    setToast(message);
  }

  function handleIssue() {
    startTransition(async () => {
      const result = await issueEstimate(detail.id);
      setToast(result.ok ? ui.issueAction : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleSaveMemo() {
    startTransition(async () => {
      const result = await saveEstimateMemo(detail.id, memo);
      setToast(result.ok ? ui.saveMini : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleShare() {
    startTransition(async () => {
      const result = await shareEstimate(detail.id);
      if (!result.ok) {
        setToast(result.error);
        return;
      }
      setShareToken(result.data);
      const url = `${window.location.origin}/${lang}/estimates/shared/${result.data}`;
      await copyToClipboard(url, ui.shareModal.copied);
      setModal("share");
    });
  }

  function handleRevokeShare() {
    startTransition(async () => {
      const result = await revokeShareEstimate(detail.id);
      if (!result.ok) {
        setToast(result.error);
        return;
      }
      setShareToken(null);
      setToast("共有を取り消しました");
    });
  }

  const statusLabel =
    detail.status === "confirmed"
      ? ui.statusPending
      : detail.status === "draft"
        ? ui.statusDraft
        : detail.status;

  return (
    <SalesFlowShell activeItem="estimates">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-[34px] font-bold tracking-tight text-slate-900">{ui.detailTitle}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              disabled={pending}
              className="rounded bg-[#14a7bb] px-6 py-3 text-[18px] font-semibold text-white transition hover:bg-[#1096a8] disabled:opacity-60"
            >
              {ui.issueMenu.share}
            </button>
            <Link
              href={`/${lang}/estimates/${detail.id}/edit`}
              className="rounded border border-slate-300 bg-white px-6 py-3 text-[18px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {ui.editAction}
            </Link>
            {detail.status === "draft" ? (
              <button
                type="button"
                onClick={handleIssue}
                disabled={pending}
                className="rounded border border-slate-300 bg-white px-6 py-3 text-[18px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {ui.issueAction}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="grid grid-cols-1 gap-y-3 text-base sm:grid-cols-[160px_1fr] sm:text-[18px]">
            <div className="text-slate-700">{ui.estimateNumber}</div>
            <div className="font-medium">{detail.documentNumber}</div>
            <div className="text-slate-700">{ui.client}</div>
            <div>
              {detail.clientName ? (
                <span>{detail.clientName} {ui.companyHonorific || ""}</span>
              ) : (
                "—"
              )}
            </div>
            <div className="text-slate-700">{ui.subject}</div>
            <div>{detail.subject || "—"}</div>
            <div className="text-slate-700">{ui.estimateAmount}</div>
            <div className="tabular-nums">{yen(detail.total)}</div>
            <div className="text-slate-700">{ui.issueDate}</div>
            <div>{detail.issueDate}</div>
            <div className="text-slate-700">{ui.expiryDate}</div>
            <div>{detail.expiryDate || ui.noDate}</div>
            <div className="text-slate-700">{ui.status}</div>
            <div>
              <span className="rounded border border-slate-300 bg-white px-4 py-1 text-sm text-slate-600">
                {statusLabel}
              </span>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[18px] font-semibold text-slate-800">{ui.internalMemo}</h2>
            <textarea
              className="min-h-[180px] w-full rounded border border-slate-300 px-5 py-4 text-[16px] outline-none"
              placeholder={ui.memoPlaceholder}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSaveMemo}
              disabled={pending}
              className="mt-3 rounded border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {ui.saveMini}
            </button>
          </div>
        </div>

        {shareToken ? (
          <div className="mt-8 rounded border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-semibold text-slate-800">{ui.shareModal.title}</p>
            <p className="mt-2 break-all text-sm text-cyan-700">{shareUrl}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(shareUrl, ui.shareModal.copied)}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                コピー
              </button>
              <button
                type="button"
                onClick={handleRevokeShare}
                disabled={pending}
                className="rounded border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
              >
                共有を取り消す
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-10 overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                {ui.itemHeaders.map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line) => (
                <tr key={line.lineNo} className="border-b border-slate-100">
                  <td className="px-4 py-3">{line.name}</td>
                  <td className="px-4 py-3 tabular-nums">{line.qty}</td>
                  <td className="px-4 py-3">{line.unit}</td>
                  <td className="px-4 py-3 tabular-nums">{yen(line.unitPrice)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {yen(Math.floor(line.qty * line.unitPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-8 border-t border-slate-200 px-6 py-4 text-[15px]">
            <span>{ui.subtotal}: {yen(detail.subtotal)}</span>
            <span>{ui.tax}: {yen(detail.tax)}</span>
            <span className="font-semibold">{ui.total}: {yen(detail.total)}</span>
          </div>
        </div>

        <div className="mt-8 text-sm text-slate-600">
          <p>{detail.sender.companyName}</p>
          {detail.sender.tel ? <p>TEL: {detail.sender.tel}</p> : null}
          {detail.sender.email ? <p>{detail.sender.email}</p> : null}
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-slate-800 px-6 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {modal === "share" && shareUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">{ui.shareModal.title}</h3>
            <p className="mt-3 break-all text-sm text-slate-600">{shareUrl}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SalesFlowShell>
  );
}
