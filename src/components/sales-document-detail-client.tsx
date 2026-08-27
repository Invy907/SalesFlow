"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell, type ActiveItem } from "@/components/salesflow-shell";
import type { SalesDocumentDetail, SalesDocumentDetailUi } from "@/lib/documents/detail-types";
import { downloadSalesDocumentXlsx } from "@/lib/documents/export-spreadsheet";
import { SalesDocumentPreview } from "./sales-document-preview";
import {
  clientHonorificSuffix,
  formatClientNameWithHonorific,
} from "@/lib/documents/client-honorific";
import { sendInvoiceEmail } from "@/lib/actions/invoices";

type ExportAction = "download" | "excel" | "print" | "email";

const yen = (value: number) => `¥ ${value.toLocaleString("ja-JP")}`;

export function SalesDocumentDetailClient({
  detail,
  ui,
  documentUi,
  shellActiveItem,
  listHref,
  clientEmail = "",
}: {
  detail: SalesDocumentDetail;
  ui: SalesDocumentDetailUi;
  documentUi: SalesDocumentDetailUi;
  shellActiveItem: ActiveItem;
  listHref: string;
  clientEmail?: string;
}) {
  const router = useRouter();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail);
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const isInvoice = shellActiveItem === "invoices";

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsExportMenuOpen(false);
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

  function downloadExcel() {
    const fields: Array<[string, string | number]> = [
      [documentUi.documentNumberLabel, detail.documentNumber],
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
    ];
    if (documentUi.secondaryDateLabel) {
      fields.push([
        documentUi.secondaryDateLabel,
        detail.secondaryDate || documentUi.noDate,
      ]);
    }
    fields.push([documentUi.documentAmountLabel, detail.total]);

    downloadSalesDocumentXlsx({
      title: documentUi.listTitle,
      filenameBase: detail.documentNumber || detail.id,
      fields,
      lineHeaders: [
        documentUi.itemHeaders[0],
        documentUi.itemHeaders[1],
        documentUi.itemHeaders[2],
        documentUi.itemHeaders[3],
        documentUi.itemHeaders[5],
      ],
      lines: detail.lines,
      summaryRows: [
        [documentUi.subtotal, detail.subtotal],
        [documentUi.tax, detail.tax],
        [documentUi.total, detail.total],
      ],
      remarks: detail.remarks,
      remarksLabel: documentUi.remarks,
    });
    setToast(ui.actions.excelDownloaded);
  }

  function handleSendEmail() {
    if (!isInvoice || !ui.emailModal) return;
    startTransition(async () => {
      const result = await sendInvoiceEmail(detail.id, email);
      if (!result.ok) {
        setToast(result.error);
        return;
      }
      setIsEmailModalOpen(false);
      setToast(ui.emailModal!.success);
      router.refresh();
    });
  }

  function handleExportAction(action: ExportAction) {
    setIsExportMenuOpen(false);
    switch (action) {
      case "email":
        setIsEmailModalOpen(true);
        return;
      case "download":
        setToast(ui.actions.downloaded);
        window.print();
        return;
      case "excel":
        downloadExcel();
        return;
      case "print":
        setToast(ui.actions.printing);
        window.print();
        return;
    }
  }

  return (
    <SalesFlowShell activeItem={shellActiveItem}>
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="no-print mt-2 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-[34px] font-bold tracking-tight text-slate-900">{ui.detailTitle}</h1>

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="rounded bg-[#14a7bb] px-6 py-3 text-[18px] font-semibold text-white shadow-sm transition hover:bg-[#1096a8]"
            >
              {ui.exportAction}
            </button>

            {isExportMenuOpen ? (
              <div className="absolute right-0 top-[72px] z-30 w-[320px] rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.18)]">
                <ExportMenuItem
                  label={ui.exportMenu.download}
                  onClick={() => handleExportAction("download")}
                />
                <ExportMenuItem label={ui.exportMenu.excel} onClick={() => handleExportAction("excel")} />
                <ExportMenuItem label={ui.exportMenu.print} onClick={() => handleExportAction("print")} />
                {isInvoice && ui.exportMenu.email ? (
                  <ExportMenuItem
                    label={ui.exportMenu.email}
                    onClick={() => handleExportAction("email")}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="no-print mt-8 grid grid-cols-1 gap-y-3 text-base sm:grid-cols-[160px_1fr] sm:text-[18px]">
          <div className="text-slate-700">{ui.documentNumberLabel}</div>
          <div className="font-medium">{detail.documentNumber}</div>
          <div className="text-slate-700">{ui.client}</div>
          <div>{detail.clientName || "—"}</div>
          <div className="text-slate-700">{ui.subject}</div>
          <div>{detail.subject || "—"}</div>
          <div className="text-slate-700">{ui.documentAmountLabel}</div>
          <div className="tabular-nums">{yen(detail.total)}</div>
          <div className="text-slate-700">{ui.issueDate}</div>
          <div>{detail.issueDate}</div>
          {ui.secondaryDateLabel ? (
            <>
              <div className="text-slate-700">{ui.secondaryDateLabel}</div>
              <div>{detail.secondaryDate || ui.noDate}</div>
            </>
          ) : null}
          <div className="text-slate-700">{ui.status}</div>
          <div>{detail.status}</div>
        </div>

        <div className="mt-12">
          <SalesDocumentPreview detail={detail} ui={documentUi} />
        </div>

        <div className="no-print mt-8">
          <Link
            href={listHref}
            className="text-[16px] font-semibold text-cyan-600 hover:text-cyan-700"
          >
            ← {ui.backToList}
          </Link>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="no-print fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/90 px-6 py-3 text-[15px] text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {isEmailModalOpen ? (
        <InvoiceEmailModal
          ui={ui}
          email={email}
          pending={pending}
          onClose={() => setIsEmailModalOpen(false)}
          onEmailChange={setEmail}
          onSubmit={handleSendEmail}
        />
      ) : null}
    </SalesFlowShell>
  );
}

function InvoiceEmailModal({
  ui,
  email,
  pending,
  onClose,
  onEmailChange,
  onSubmit,
}: {
  ui: SalesDocumentDetailUi;
  email: string;
  pending: boolean;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!ui.emailModal) return null;

  return (
    <div className="no-print fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-6">
      <div className="w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <ModalHeader title={ui.emailModal.title} onClose={onClose} />
          <div className="px-9 py-10">
            <p className="text-[18px] text-slate-800">{ui.emailModal.description}</p>
            <label className="mt-6 block text-[15px] font-semibold text-slate-700">
              {ui.emailModal.fieldLabel}
            </label>
            <input
              className="field mt-2"
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-9 py-5">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white hover:bg-[#1096a8] disabled:opacity-60"
            >
              {ui.emailModal.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-9 py-5">
      <h2 className="text-[22px] font-bold text-slate-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded px-3 py-1 text-[15px] text-slate-500 hover:bg-slate-100"
      >
        ✕
      </button>
    </div>
  );
}

function ExportMenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center rounded px-3 py-3 text-left text-[16px] text-slate-800 transition hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
