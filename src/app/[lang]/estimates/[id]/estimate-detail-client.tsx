"use client";

import Link from "next/link";
import { documentSummaryRows } from "@/lib/documents/summary-rows";
import type { SalesDocumentDetail } from "@/lib/documents/detail-types";
import type { TaxDisplay, TaxCategory, DocumentTotals } from "@/lib/tax";
import { ModalDialog } from "@/components/modal-dialog";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  issueEstimate,
  revokeShareEstimate,
  saveEstimateMemo,
  sendEstimateEmail,
  shareEstimate,
} from "@/lib/actions/estimates";
import { aiEstimateErrorMessage } from "@/components/ai-estimates/error-message";
import { importEstimateAsAiSource } from "@/lib/actions/ai-estimates";
import { formatSalesDocumentStatus } from "@/lib/document-status";
import { getEstimateContent } from "../content";
import { EstimateDocumentPreview } from "../estimate-document-preview";
import { downloadSalesDocumentXlsx } from "@/lib/documents/export-spreadsheet";
import { printSalesDocument } from "@/lib/documents/print-sales-document";
import type { DocumentOutputLocale } from "@/lib/documents/output-locale";
import {
  clientHonorificSuffix,
  formatClientNameWithHonorific,
  type ClientHonorific,
} from "@/lib/documents/client-honorific";

export type EstimateDetail = {
  id: string;
  documentNumber: string;
  clientId: string | null;
  clientEmail: string;
  clientName: string;
  subject: string;
  issueDate: string;
  issueMarkedAt?: string | null;
  expiryDate: string;
  status: string;
  outputLocale: DocumentOutputLocale;
  clientHonorific: ClientHonorific;
  internalMemo: string;
  templateMessage: string;
  remarks: string;
  subtotal: number;
  tax: number;
  taxDisplay?: TaxDisplay;
  withholding?: number;
  taxBreakdown?: DocumentTotals["breakdown"];
  total: number;
  shareToken: string | null;
  shareExpiresAt: string | null;
  lines: Array<{ lineNo: number; name: string; qty: number; unit: string; unitPrice: number; taxCategory?: TaxCategory }>;
  recipient?: SalesDocumentDetail["recipient"];
  showSeal?: boolean;
  sender: SalesDocumentDetail["sender"];
};

type IssueAction = "email" | "fax" | "download" | "excel" | "print" | "share";
type ModalType = "email" | "share" | null;

const yen = (value: number) => `¥ ${value.toLocaleString("ja-JP")}`;

export function EstimateDetailClient({ detail }: { detail: EstimateDetail }) {
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const documentUi = getEstimateContent(detail.outputLocale);
  const router = useRouter();

  const [isIssueMenuOpen, setIsIssueMenuOpen] = useState(false);
  const [isConvertMenuOpen, setIsConvertMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [email, setEmail] = useState(detail.clientEmail);
  const [memo, setMemo] = useState(detail.internalMemo);
  const [toast, setToast] = useState("");
  const [shareToken, setShareToken] = useState(detail.shareToken);
  const [shareExpiresAt, setShareExpiresAt] = useState(detail.shareExpiresAt);
  const [pending, startTransition] = useTransition();
  const issueMenuRef = useRef<HTMLDivElement>(null);

  const shareUrl = useMemo(() => {
    if (!shareToken) return "";
    const base = typeof window === "undefined" ? "" : window.location.origin;
    return `${base}/${lang}/estimates/shared/${shareToken}`;
  }, [shareToken, lang]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (issueMenuRef.current && !issueMenuRef.current.contains(event.target as Node)) {
        setIsIssueMenuOpen(false);
        setIsConvertMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsIssueMenuOpen(false);
        setIsConvertMenuOpen(false);
        setModal(null);
      }
    }
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function copyToClipboard(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(message);
    } catch {
      setToast(lang === "ko" ? "클립보드에 복사하지 못했습니다. 표시된 링크를 직접 복사해 주세요." : lang === "en" ? "Could not copy the link. Please copy the displayed link manually." : "コピーできませんでした。表示されたリンクを手動でコピーしてください。");
    }
  }

  function handleIssue() {
    startTransition(async () => {
      const result = await issueEstimate(detail.id);
      setToast(result.ok ? ui.issued : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleSaveMemo() {
    startTransition(async () => {
      const result = await saveEstimateMemo(detail.id, memo);
      setToast(result.ok ? ui.memoSaved : result.error);
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
      setShareToken(result.data.token);
      setShareExpiresAt(result.data.expiresAt);
      const base = typeof window === "undefined" ? "" : window.location.origin;
      await copyToClipboard(
        `${base}/${lang}/estimates/shared/${result.data.token}`,
        ui.shareModal.copied,
      );
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
      setShareExpiresAt(null);
      setToast(ui.shareRevoked);
    });
  }

  function handleRegisterAiSource() {
    if (!canRegisterAiSource || pending) return;
    startTransition(async () => {
      try {
        const result = await importEstimateAsAiSource(detail.id);
        if (!result.ok) { setToast(aiEstimateErrorMessage(result.error, lang, aiImportError)); return; }
        router.push(`/${lang}/estimates/ai-library/${result.data}`);
        router.refresh();
      } catch { setToast(aiImportError); }
    });
  }

  function downloadEstimateExcel() {
    downloadSalesDocumentXlsx({
      title: documentUi.listTitle,
      outputLocale: detail.outputLocale,
      taxDisplay: detail.taxDisplay,
      filenameBase: detail.documentNumber || detail.id,
      fields: [
        [documentUi.estimateNumber, detail.documentNumber],
        [
          documentUi.client,
          formatClientNameWithHonorific(
            detail.clientName,
            clientHonorificSuffix(detail.clientHonorific, detail.outputLocale),
            detail.clientHonorific !== "none",
          ),
        ],
        [documentUi.subject, detail.subject || "—"],
        [documentUi.issueDate, detail.issueDate],
        [documentUi.expiryDate, detail.expiryDate || documentUi.noDate],
        [documentUi.companyName, detail.sender.companyName],
      ],
      lineHeaders: [
        documentUi.itemHeaders[0],
        documentUi.itemHeaders[1],
        documentUi.itemHeaders[2],
        documentUi.itemHeaders[3],
        documentUi.itemHeaders[4],
        documentUi.itemHeaders[5],
      ],
      lines: detail.lines,
      summaryRows: documentSummaryRows(detail, documentUi),
      remarks: detail.remarks,
      remarksLabel: documentUi.remarks,
    });
    setToast(ui.actions.excelDownloaded);
  }

  function handleSendEmail() {
    startTransition(async () => {
      const result = await sendEstimateEmail(detail.id, email);
      if (!result.ok) {
        setToast(result.error);
        return;
      }
      setShareToken(result.data.shareToken);
      setShareExpiresAt(result.data.shareExpiresAt);
      setModal(null);
      setToast(ui.emailModal.success);
      router.refresh();
    });
  }

  function handleIssueAction(action: IssueAction) {
    setIsIssueMenuOpen(false);
    switch (action) {
      case "email":
        setModal("email");
        return;
      case "fax":
        router.push(`/${lang}/estimates/${detail.id}/fax`);
        return;
      case "download":
        setToast(ui.actions.downloaded);
        printSalesDocument();
        return;
      case "excel":
        downloadEstimateExcel();
        return;
      case "print":
        setToast(ui.actions.printing);
        printSalesDocument();
        return;
      case "share":
        setModal("share");
        return;
    }
  }

  const statusLabel = formatSalesDocumentStatus(lang, detail.status);

  const canRegisterAiSource = detail.status !== "archived" && (["issued", "sent", "confirmed", "overdue"].includes(detail.status) || Boolean(detail.issueMarkedAt));
  const aiIssueRequired = lang === "ko" ? "발행 후 AI 자료로 등록할 수 있습니다." : lang === "en" ? "Issue this estimate before adding it to the AI library." : "発行後にAI資料として登録できます。";
  const aiImportError = lang === "ko" ? "AI 자료로 등록하지 못했습니다. 다시 시도해 주세요." : lang === "en" ? "Could not add this estimate to the AI library. Please try again." : "AI資料に登録できませんでした。再試行してください。";
  const aiButtonLabel =
    lang === "ko" ? "AI 자료로 등록" : lang === "en" ? "Add to AI library" : "AI資料に登録";

  return (
    <SalesFlowShell activeItem="estimates">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="no-print mb-4">
          <Link
            href={`/${lang}/estimates`}
            className="text-[16px] font-semibold text-[#0A4D34] hover:text-[#083D29]"
          >
            ← {ui.backToList}
          </Link>
        </div>
        <div className="no-print mt-2 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight sm:text-[34px] text-slate-900">{ui.detailTitle}</h1>

          <div className="relative flex flex-wrap items-center gap-3" ref={issueMenuRef}>
            <div className="max-w-xs">
            <button
              type="button"
              onClick={handleRegisterAiSource}
              disabled={pending || !canRegisterAiSource}
              aria-describedby={!canRegisterAiSource ? "ai-import-issue-required" : undefined}
              className="rounded border border-violet-200 bg-violet-50 px-5 py-3 text-[16px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
            >
              {aiButtonLabel}
            </button>
            {!canRegisterAiSource ? <p id="ai-import-issue-required" className="mt-1 text-sm text-slate-500">{aiIssueRequired}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsIssueMenuOpen((prev) => !prev);
                setIsConvertMenuOpen(false);
              }}
              className="rounded bg-[#0A4D34] px-6 py-3 text-[18px] font-semibold text-white shadow-sm transition hover:bg-[#083D29]"
            >
              {ui.exportAction} ▼
            </button>
            <Link
              href={`/${lang}/estimates/${detail.id}/edit`}
              className="rounded border border-slate-300 bg-white px-6 py-3 text-[18px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {ui.editAction}
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsConvertMenuOpen((prev) => !prev);
                setIsIssueMenuOpen(false);
              }}
              className="rounded border border-slate-300 bg-white px-6 py-3 text-[18px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {lang === "ko" ? "변환" : lang === "en" ? "Convert" : "変換"} ▼
            </button>
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

            {isIssueMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(420px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.18)]">
                <IssueMenuItem
                  label={ui.issueMenu.email}
                  badge={ui.issueMenu.emailRecommended}
                  onClick={() => handleIssueAction("email")}
                />
                <IssueMenuItem label={ui.issueMenu.fax} onClick={() => handleIssueAction("fax")} />
                <IssueMenuItem
                  label={ui.issueMenu.download}
                  onClick={() => handleIssueAction("download")}
                />
                <IssueMenuItem
                  label={ui.issueMenu.excel}
                  onClick={() => handleIssueAction("excel")}
                />
                <IssueMenuItem label={ui.issueMenu.print} onClick={() => handleIssueAction("print")} />
                <IssueMenuItem label={ui.issueMenu.share} onClick={() => handleIssueAction("share")} />
              </div>
            ) : null}

            {isConvertMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(260px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-2 shadow-[0_12px_35px_rgba(15,23,42,0.18)]">
                <ConvertMenuItem
                  label={lang === "ko" ? "납품서로 변환" : lang === "en" ? "Convert to delivery note" : "納品書に変換"}
                  href={`/${lang}/delivery-notes/new?fromEstimate=${detail.id}`}
                />
                <ConvertMenuItem
                  label={lang === "ko" ? "청구서로 변환" : lang === "en" ? "Convert to invoice" : "請求書に変換"}
                  href={`/${lang}/invoices/new?fromEstimate=${detail.id}`}
                />
                <ConvertMenuItem
                  label={lang === "ko" ? "수주정보로 변환" : lang === "en" ? "Convert to order" : "受注情報に変換"}
                  href={`/${lang}/orders?fromEstimate=${detail.id}&openCreate=1`}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="no-print mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <div className="grid min-w-0 grid-cols-1 gap-y-3 text-base [overflow-wrap:anywhere] sm:grid-cols-[160px_minmax(0,1fr)] sm:text-[18px]">
            <div className="text-slate-700">{ui.estimateNumber}</div>
            <div className="font-medium">{detail.documentNumber}</div>
            <div className="text-slate-700">{ui.client}</div>
            <div>
              {detail.clientName ? (
                <span>
                  {formatClientNameWithHonorific(
                    detail.clientName,
                    clientHonorificSuffix(detail.clientHonorific, detail.outputLocale),
                    detail.clientHonorific !== "none",
                  )}
                </span>
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
            <div className="flex gap-3">
              <span className="rounded border border-slate-300 bg-white px-4 py-1 text-sm text-slate-600">
                {statusLabel}
              </span>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[18px] font-semibold text-slate-800">{ui.internalMemo}</h2>
            <textarea
              className="min-h-[180px] w-full rounded border border-slate-300 px-5 py-4 text-[16px] outline-none placeholder:text-slate-300"
              placeholder={ui.memoPlaceholder}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
            <button
              type="button"
              onClick={handleSaveMemo}
              disabled={pending}
              className="mt-3 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {ui.saveMini}
            </button>

            {shareToken ? (
              <div className="mt-6 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[14px]">
                <p className="break-all text-slate-700">{shareUrl}</p>
                {shareExpiresAt ? (
                  <p className="mt-1 text-slate-500">
                    {ui.shareExpires}: {shareExpiresAt.slice(0, 10)}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleRevokeShare}
                  disabled={pending}
                  className="mt-2 text-red-600 hover:underline disabled:opacity-60"
                >
                  {ui.shareRevoke}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-12">
          <EstimateDocumentPreview
            detail={{ ...detail, outputLocale: detail.outputLocale }}
            ui={documentUi}
          />
        </div>

      </div>

      {modal ? (
        <ModalDialog feedback={toast} label={modal === "email" ? ui.emailModal.title : ui.shareModal.title} onClose={() => setModal(null)} className="max-w-[720px]">
          <div className="w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            {modal === "email" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSendEmail();
                }}
              >
                <ModalHeader title={ui.emailModal.title} onClose={() => setModal(null)} />
                <div className="px-4 py-6 sm:px-9 sm:py-10">
                  <p className="text-[18px] text-slate-800">{ui.emailModal.description}</p>
                  <label htmlFor="estimate-recipient-email" className="mt-6 block text-[15px] font-semibold text-slate-700">
                    {ui.emailModal.fieldLabel}
                  </label>
                  <input
                    id="estimate-recipient-email"
                    className="field mt-2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-4 py-4 sm:px-9 sm:py-5">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded bg-[#0A4D34] px-8 py-3 text-[15px] font-semibold text-white hover:bg-[#083D29] disabled:opacity-60"
                  >
                    {ui.emailModal.submit}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <ModalHeader title={ui.shareModal.title} onClose={() => setModal(null)} />
                <div className="px-4 py-6 sm:px-9 sm:py-10">
                  <p className="text-[18px] text-slate-800">{ui.shareModal.description}</p>
                  <p className="mt-3 text-[14px] text-slate-500">{ui.shareModal.caution}</p>
                  {shareToken ? (
                    <p className="mt-6 break-all rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-700">
                      {shareUrl}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-4 py-4 sm:px-9 sm:py-5">
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={pending}
                    className="rounded bg-[#0A4D34] px-8 py-3 text-[15px] font-semibold text-white hover:bg-[#083D29] disabled:opacity-60"
                  >
                    {ui.shareModal.submit}
                  </button>
                </div>
              </div>
            )}
          </div>
        </ModalDialog>
      ) : null}

      {toast && !modal ? (
        <div
          role="status"
          className="no-print fixed bottom-4 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg [overflow-wrap:anywhere] sm:bottom-8 sm:rounded-full bg-slate-900/90 px-6 py-3 text-[15px] text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </SalesFlowShell>
  );
}

function ConvertMenuItem({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="block w-full rounded px-3 py-3 text-left text-[16px] text-slate-800 transition hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

function IssueMenuItem({
  label,
  badge,
  onClick,
}: {
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded px-3 py-3 text-left text-[16px] text-slate-800 transition hover:bg-slate-50"
    >
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded bg-[#0A4D34] px-2 py-0.5 text-xs font-bold text-white">{badge}</span>
      ) : null}
    </button>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-9 sm:py-5">
      <h2 className="min-w-0 text-lg font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-[20px]">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none text-slate-400 hover:text-slate-600"
      >
        ×
      </button>
    </div>
  );
}
