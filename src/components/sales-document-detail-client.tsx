"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SalesFlowShell, type ActiveItem } from "@/components/salesflow-shell";
import type { SalesDocumentDetail, SalesDocumentDetailUi } from "@/lib/documents/detail-types";
import { downloadSalesDocumentXlsx } from "@/lib/documents/export-spreadsheet";
import { SalesDocumentPreview } from "./sales-document-preview";

type ExportAction = "download" | "excel" | "print";

const yen = (value: number) => `¥ ${value.toLocaleString("ja-JP")}`;

export function SalesDocumentDetailClient({
  detail,
  ui,
  documentUi,
  shellActiveItem,
  listHref,
}: {
  detail: SalesDocumentDetail;
  ui: SalesDocumentDetailUi;
  documentUi: SalesDocumentDetailUi;
  shellActiveItem: ActiveItem;
  listHref: string;
}) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const exportMenuRef = useRef<HTMLDivElement>(null);

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
      [documentUi.client, detail.clientName],
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

  function handleExportAction(action: ExportAction) {
    setIsExportMenuOpen(false);
    switch (action) {
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
    </SalesFlowShell>
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
