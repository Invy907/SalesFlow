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
  clientEmailCc = [],
  senderName = "",
  replyTo = "",
}: {
  detail: SalesDocumentDetail;
  ui: SalesDocumentDetailUi;
  documentUi: SalesDocumentDetailUi;
  shellActiveItem: ActiveItem;
  listHref: string;
  clientEmail?: string;
  clientEmailCc?: string[];
  senderName?: string;
  replyTo?: string;
}) {
  const router = useRouter();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail);
  const [cc, setCc] = useState(clientEmailCc.join(", "));
  const [mailSenderName, setMailSenderName] = useState(senderName || detail.sender.companyName);
  const [mailReplyTo, setMailReplyTo] = useState(replyTo || detail.sender.email);
  const [mailSubject, setMailSubject] = useState(() =>
    fillMailTemplate(ui.emailModal?.subjectTemplate ?? "", detail),
  );
  const [mailBody, setMailBody] = useState(() =>
    fillMailTemplate(ui.emailModal?.bodyTemplate ?? "", detail),
  );
  const [attachment, setAttachment] = useState<File | null>(null);
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
      if (attachment && attachment.size > 5 * 1024 * 1024) {
        setToast(ui.emailModal!.attachmentTooLarge);
        return;
      }
      const result = await sendInvoiceEmail(detail.id, {
        recipientEmail: email,
        cc: cc.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean),
        senderName: mailSenderName,
        replyTo: mailReplyTo,
        subject: mailSubject,
        body: mailBody,
        attachment: attachment
          ? {
              filename: attachment.name,
              mimeType: attachment.type || "application/octet-stream",
              base64: await fileToBase64(attachment),
            }
          : null,
      });
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
          cc={cc}
          senderName={mailSenderName}
          replyTo={mailReplyTo}
          subject={mailSubject}
          body={mailBody}
          attachment={attachment}
          pending={pending}
          onClose={() => setIsEmailModalOpen(false)}
          onEmailChange={setEmail}
          onCcChange={setCc}
          onSenderNameChange={setMailSenderName}
          onReplyToChange={setMailReplyTo}
          onSubjectChange={setMailSubject}
          onBodyChange={setMailBody}
          onAttachmentChange={setAttachment}
          onSubmit={handleSendEmail}
        />
      ) : null}
    </SalesFlowShell>
  );
}

function InvoiceEmailModal({
  ui,
  email,
  cc,
  senderName,
  replyTo,
  subject,
  body,
  attachment,
  pending,
  onClose,
  onEmailChange,
  onCcChange,
  onSenderNameChange,
  onReplyToChange,
  onSubjectChange,
  onBodyChange,
  onAttachmentChange,
  onSubmit,
}: {
  ui: SalesDocumentDetailUi;
  email: string;
  cc: string;
  senderName: string;
  replyTo: string;
  subject: string;
  body: string;
  attachment: File | null;
  pending: boolean;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onCcChange: (value: string) => void;
  onSenderNameChange: (value: string) => void;
  onReplyToChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onAttachmentChange: (value: File | null) => void;
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
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-9 py-8">
            <p className="text-[18px] text-slate-800">{ui.emailModal.description}</p>
            <MailField label={ui.emailModal.toLabel}>
              <input className="field" type="email" required value={email} onChange={(e) => onEmailChange(e.target.value)} />
            </MailField>
            <MailField label={ui.emailModal.ccLabel}>
              <input className="field" value={cc} onChange={(e) => onCcChange(e.target.value)} />
            </MailField>
            <div className="grid gap-4 sm:grid-cols-2">
              <MailField label={ui.emailModal.senderNameLabel}>
                <input className="field" value={senderName} onChange={(e) => onSenderNameChange(e.target.value)} />
              </MailField>
              <MailField label={ui.emailModal.replyToLabel}>
                <input className="field" type="email" value={replyTo} onChange={(e) => onReplyToChange(e.target.value)} />
              </MailField>
            </div>
            <MailField label={ui.emailModal.subjectLabel}>
              <input className="field" required maxLength={200} value={subject} onChange={(e) => onSubjectChange(e.target.value)} />
            </MailField>
            <MailField label={ui.emailModal.bodyLabel}>
              <textarea className="field min-h-[180px]" required maxLength={20000} value={body} onChange={(e) => onBodyChange(e.target.value)} />
            </MailField>
            <MailField label={ui.emailModal.attachmentLabel}>
              <input
                className="block w-full text-[14px] text-slate-700 file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold"
                type="file"
                onChange={(event) => onAttachmentChange(event.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-[12px] text-slate-500">
                {attachment ? `${attachment.name} (${Math.ceil(attachment.size / 1024)} KB)` : ui.emailModal.attachmentHint}
              </p>
            </MailField>
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

function MailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[15px] font-semibold text-slate-700">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function fillMailTemplate(template: string, detail: SalesDocumentDetail) {
  return template
    .replace(/\{client_name\}/g, detail.clientName)
    .replace(/\{invoice_number\}|\{document_number\}/g, detail.documentNumber);
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
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
