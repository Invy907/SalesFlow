"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { getEstimateContent } from "../content";

type Props = {
  id: string;
};

type IssueAction = "email" | "fax" | "download" | "print" | "share";
type ModalType = "email" | "share" | null;

export function EstimateDetailClient({ id }: Props) {
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const [isIssueMenuOpen, setIsIssueMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [email, setEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [toast, setToast] = useState("");
  const issueMenuRef = useRef<HTMLDivElement>(null);

  const shareUrl = useMemo(
    () => `https://salesflow.local/estimates/${id}/shared-preview`,
    [id],
  );

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        issueMenuRef.current &&
        !issueMenuRef.current.contains(event.target as Node)
      ) {
        setIsIssueMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsIssueMenuOpen(false);
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
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openModal(nextModal: ModalType) {
    setIsIssueMenuOpen(false);
    setModal(nextModal);
  }

  async function copyToClipboard(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(message);
    } catch {
      setToast(message);
    }
  }

  function handlePrint() {
    setIsIssueMenuOpen(false);
    setToast(ui.actions.printing);
    window.print();
  }

  function handleDownloadPdf() {
    setIsIssueMenuOpen(false);
    const blob = createSimplePdfBlob({
      title: ui.listTitle,
      estimateNumber: ui.estimateNumberValue,
      client: ui.clientValue,
      company: ui.companyValue,
      issueDate: ui.issueDateJapanese,
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ui.estimateNumberValue}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(ui.actions.downloaded);
  }

  function handleIssueAction(action: IssueAction) {
    switch (action) {
      case "email":
        openModal("email");
        return;
      case "fax":
        window.location.href = `/estimates/${id}/fax`;
        return;
      case "download":
        handleDownloadPdf();
        return;
      case "print":
        handlePrint();
        return;
      case "share":
        openModal("share");
        return;
    }
  }

  function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModal(null);
    setToast(ui.emailModal.success);
  }

  async function submitShare() {
    await copyToClipboard(shareUrl, ui.shareModal.copied);
    setModal(null);
  }

  return (
    <>
      <div className="mx-auto max-w-[1260px] px-8 py-10">
        <div className="space-y-3">
          <div className="rounded border border-emerald-200 bg-emerald-50 px-5 py-4 text-[17px] text-emerald-700">
            ✓ {ui.successClient} (
            <a href="#" className="underline">
              取引先とは？
            </a>
            )
          </div>
          <div className="rounded border border-emerald-200 bg-emerald-50 px-5 py-4 text-[17px] text-emerald-700">
            ✓ {ui.successEstimate}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <h1 className="text-[34px] font-bold tracking-tight text-slate-900">
            {ui.detailTitle}
          </h1>

          <div className="relative flex flex-wrap items-center gap-3" ref={issueMenuRef}>
            <button
              type="button"
              onClick={() => setIsIssueMenuOpen((prev) => !prev)}
              className="rounded bg-[#14a7bb] px-6 py-3 text-[18px] font-semibold text-white shadow-sm transition hover:bg-[#1096a8]"
            >
              DOC {ui.issueAction} ▼
            </button>
            <Link
              href={`/estimates/${id}/edit`}
              className="rounded border border-slate-300 bg-white px-6 py-3 text-[18px] font-semibold text-slate-700"
            >
              EDIT {ui.editAction}
            </Link>
            <button className="rounded border border-slate-300 bg-white px-6 py-3 text-[18px] font-semibold text-slate-700">
              {ui.moreAction} ▼
            </button>

            {isIssueMenuOpen ? (
              <div className="absolute right-[172px] top-[72px] z-30 w-[420px] rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.18)]">
                <IssueMenuItem
                  icon="MAIL"
                  label={ui.issueMenu.email}
                  badge={ui.issueMenu.emailRecommended}
                  onClick={() => handleIssueAction("email")}
                />
                <IssueMenuItem
                  icon="FAX"
                  label={ui.issueMenu.fax}
                  onClick={() => handleIssueAction("fax")}
                />
                <IssueMenuItem
                  icon="PDF"
                  label={ui.issueMenu.download}
                  onClick={() => handleIssueAction("download")}
                />
                <IssueMenuItem
                  icon="PRT"
                  label={ui.issueMenu.print}
                  onClick={() => handleIssueAction("print")}
                />
                <IssueMenuItem
                  icon="URL"
                  label={ui.issueMenu.share}
                  onClick={() => handleIssueAction("share")}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex gap-8 border-b border-slate-200 text-[18px]">
          <button className="border-b-[3px] border-cyan-500 px-2 pb-3 font-semibold text-slate-900">
            {ui.previewTab}
          </button>
          <button className="border-b-[3px] border-transparent px-2 pb-3 text-slate-500">
            {ui.historyTab}
          </button>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="grid grid-cols-[160px_1fr] gap-y-3 text-[18px]">
            <div className="text-slate-700">{ui.estimateNumber}</div>
            <div className="font-medium">{ui.estimateNumberValue}</div>
            <div className="text-slate-700">{ui.client}</div>
            <div>
              <a href="#" className="text-cyan-600 hover:text-cyan-700">
                {ui.clientValue} {ui.companyHonorific || ""}
              </a>
            </div>
            <div className="text-slate-700">{ui.subject}</div>
            <div>ー</div>
            <div className="text-slate-700">{ui.estimateAmount}</div>
            <div>0円</div>
            <div className="text-slate-700">{ui.issueDate}</div>
            <div>{ui.issueDateValue}</div>
            <div className="text-slate-700">{ui.status}</div>
            <div className="flex gap-3">
              <span className="rounded border border-slate-300 bg-white px-4 py-1 text-sm text-slate-600">
                {ui.statusDraft}
              </span>
              <span className="rounded border border-slate-300 bg-white px-4 py-1 text-sm text-slate-600">
                {ui.statusPending}
              </span>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[18px] font-semibold text-slate-800">
              {ui.internalMemo}
            </h2>
            <textarea
              className="min-h-[180px] w-full rounded border border-slate-300 px-5 py-4 text-[16px] outline-none placeholder:text-slate-300"
              placeholder={ui.memoPlaceholder}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
            <button className="mt-3 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              {ui.saveMini}
            </button>
          </div>
        </div>

        <div className="mt-12 rounded bg-[#dfe7f2] p-10">
          <div className="mx-auto w-full max-w-[980px] bg-white px-14 py-16 shadow-sm">
            <div className="flex justify-end">
              <div className="space-y-2 text-right text-[16px] font-semibold text-slate-900">
                <p>{ui.issueDateJapanese}</p>
                <p>
                  {ui.estimateNumber}: {ui.estimateNumberValue}
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-[54px] font-bold tracking-[0.08em] text-slate-900">
                {ui.listTitle}
              </h2>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-[18px] font-semibold underline underline-offset-4">
                  {ui.clientValue} {ui.companyHonorific || ""}
                </p>
                <p className="mt-5 text-[16px] text-slate-800">{ui.previewLead}</p>

                <div className="mt-10 max-w-[320px] border-b border-slate-800 pb-2">
                  <div className="flex items-end justify-between">
                    <span className="text-[18px] font-semibold">{ui.estimateAmount}</span>
                    <span className="text-[34px] font-semibold">¥ 0 -</span>
                  </div>
                </div>
              </div>

              <div className="self-start text-[16px] leading-8 text-slate-800">
                <p className="text-[20px] font-semibold">{ui.companyValue}</p>
                <p className="mt-6">{ui.phone}</p>
                <p>{ui.email}</p>
              </div>
            </div>

            <div className="mt-10 overflow-hidden border border-slate-800">
              <table className="w-full border-collapse text-[15px]">
                <thead>
                  <tr className="bg-[#ededed]">
                    {["品番・品名", "数量", "単価", "金額"].map((header) => (
                      <th
                        key={header}
                        className="border-r border-slate-800 px-4 py-3 text-center font-semibold last:border-r-0"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index} className="h-[52px]">
                      <td className="border-t border-r border-slate-800" />
                      <td className="border-t border-r border-slate-800" />
                      <td className="border-t border-r border-slate-800" />
                      <td className="border-t border-slate-800" />
                    </tr>
                  ))}
                  <tr className="h-[52px]">
                    <td className="border-t border-r border-slate-800" colSpan={2} />
                    <td className="border-t border-r border-slate-800 px-4 text-right font-semibold">
                      {ui.subtotal}
                    </td>
                    <td className="border-t border-slate-800 px-4 text-right font-semibold">
                      0
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/estimates"
            className="text-[16px] font-semibold text-cyan-600 hover:text-cyan-700"
          >
            ← {ui.backToList}
          </Link>
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="w-full max-w-[840px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            {modal === "email" ? (
              <form onSubmit={submitEmail}>
                <ModalHeader
                  title={ui.emailModal.title}
                  onClose={() => setModal(null)}
                />
                <div className="px-9 py-10">
                  <p className="text-[18px] text-slate-800">
                    {ui.emailModal.description}
                  </p>
                  <label className="mt-8 block">
                    <span className="mb-3 block text-[18px] font-semibold text-slate-800">
                      {ui.emailModal.fieldLabel}
                    </span>
                    <input
                      className="field"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-9 py-5">
                  <button className="rounded bg-[#14a7bb] px-7 py-4 text-[18px] font-semibold text-white">
                    {ui.emailModal.submit}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <ModalHeader
                  title={ui.shareModal.title}
                  onClose={() => setModal(null)}
                />
                <div className="px-9 py-10">
                  <p className="text-[18px] text-slate-800">
                    {ui.shareModal.description}
                  </p>
                  <p className="mt-4 text-[15px] text-slate-400">
                    {ui.shareModal.caution}
                  </p>
                  <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {shareUrl}
                  </div>
                </div>
                <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-9 py-5">
                  <button
                    type="button"
                    onClick={submitShare}
                    className="rounded bg-[#14a7bb] px-7 py-4 text-[18px] font-semibold text-white"
                  >
                    {ui.shareModal.submit}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}

function IssueMenuItem({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: string;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-md px-4 py-4 text-left text-[18px] text-slate-900 transition hover:bg-slate-50"
    >
      <span className="w-10 text-center text-xs font-bold tracking-[0.14em] text-slate-500">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded bg-slate-500 px-2 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-9 py-5">
      <h2 className="text-[22px] font-bold text-slate-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="text-[30px] leading-none text-slate-400 transition hover:text-slate-600"
      >
        x
      </button>
    </div>
  );
}

function createSimplePdfBlob({
  title,
  estimateNumber,
  client,
  company,
  issueDate,
}: {
  title: string;
  estimateNumber: string;
  client: string;
  company: string;
  issueDate: string;
}) {
  const lines = [
    title,
    `Estimate No: ${estimateNumber}`,
    `Client: ${client}`,
    `Company: ${company}`,
    `Issue Date: ${issueDate}`,
  ];

  const stream = lines
    .map((line, index) => {
      const safeLine = line.replace(/[()\\]/g, "\\$&");
      return `BT /F1 16 Tf 50 ${760 - index * 28} Td (${safeLine}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
