"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { pageContainerClass } from "@/components/page-container";
import { getClientsContent } from "../content";
import { getEstimateContent } from "../../estimates/content";
import { getDeliveryNoteContent } from "../../delivery-notes/content";
import { getInvoiceContent } from "../../invoices/content";
import { toggleEstimateIssueFlag, toggleEstimateOrderFlag } from "@/lib/actions/estimates";
import { toggleDeliveryNoteIssueFlag } from "@/lib/actions/delivery-notes";
import { toggleInvoicePaymentFlag } from "@/lib/actions/invoices";

export type EstimateDocRow = {
  id: string;
  href: string;
  documentNumber: string;
  subject: string;
  issueDate: string;
  total: number;
  issued: boolean;
  ordered: boolean;
};

export type DeliveryNoteDocRow = {
  id: string;
  href: string;
  documentNumber: string;
  subject: string;
  issueDate: string;
  total: number;
  issued: boolean;
  billed: boolean;
};

export type InvoiceDocRow = {
  id: string;
  href: string;
  documentNumber: string;
  subject: string;
  issueDate: string;
  total: number;
  issued: boolean;
  paid: boolean;
};

export type ClientDetail = {
  id: string;
  name: string;
  furigana: string | null;
  managementCode: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  memo: string | null;
};

const yen = (v: number) => `¥${v.toLocaleString("ja-JP")}`;

type TabKey = "estimate" | "delivery_note" | "invoice";

export function ClientDetailClient({
  client,
  estimates,
  deliveryNotes,
  invoices,
}: {
  client: ClientDetail;
  estimates: EstimateDocRow[];
  deliveryNotes: DeliveryNoteDocRow[];
  invoices: InvoiceDocRow[];
}) {
  const { lang } = useLanguage();
  const ui = getClientsContent(lang);
  const estimateUi = getEstimateContent(lang);
  const deliveryNoteUi = getDeliveryNoteContent(lang);
  const invoiceUi = getInvoiceContent(lang);
  const d = ui.detail;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("estimate");
  const [pending, startTransition] = useTransition();

  const infoRows: Array<{ label: string; value: string | null }> = [
    { label: ui.tableHeaders[0], value: client.name },
    { label: ui.modal.furigana, value: client.furigana },
    { label: ui.modal.managementCode, value: client.managementCode },
    { label: ui.modal.department, value: client.department },
    { label: ui.modal.email, value: client.email },
    { label: ui.modal.phone, value: client.phone },
    { label: "FAX", value: client.fax },
  ];

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "estimate", label: d.docTypeLabels.estimate, count: estimates.length },
    { key: "delivery_note", label: d.docTypeLabels.delivery_note, count: deliveryNotes.length },
    { key: "invoice", label: d.docTypeLabels.invoice, count: invoices.length },
  ];

  function runToggle(action: Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      await action;
      router.refresh();
    });
  }

  return (
    <SalesFlowShell activeItem="clients">
      <div className={pageContainerClass()}>
        <div className="mb-4">
          <Link href="/clients" className="text-[16px] font-semibold text-[#0A4D34] hover:text-[#083D29]">
            ← {d.backToList}
          </Link>
        </div>

        <h1 className="[overflow-wrap:anywhere] text-[28px] sm:text-[32px] font-bold tracking-tight text-slate-900">{client.name}</h1>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 rounded border border-slate-200 bg-white p-4 sm:p-6 sm:grid-cols-[160px_minmax(0,1fr)]">
          {infoRows.map((row) => (
            <div key={row.label} className="contents">
              <div className="text-[14px] font-medium text-slate-500">{row.label}</div>
              <div className="min-w-0 [overflow-wrap:anywhere] text-[15px] text-slate-800">{row.value || "—"}</div>
            </div>
          ))}
          {client.memo ? (
            <>
              <div className="text-[14px] font-medium text-slate-500">{ui.modal.memo}</div>
              <div className="whitespace-pre-line [overflow-wrap:anywhere] text-[15px] text-slate-800">{client.memo}</div>
            </>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-slate-900">{d.documentsTitle}</h2>
        </div>

        <div className="mt-4 flex gap-6 overflow-x-auto border-b border-slate-200 text-[15px] text-slate-500">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "shrink-0 whitespace-nowrap border-b-[3px] px-1 pb-3 font-medium",
                activeTab === tab.key ? "border-[#1A7A57] text-slate-900" : "border-transparent",
              ].join(" ")}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div tabIndex={0} role="region" aria-label={d.documentsTitle} className="mt-3 overflow-x-auto rounded border border-slate-200 bg-white">
          {activeTab === "estimate" ? (
            estimates.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center text-[15px] text-slate-400">{d.noDocuments}</div>
            ) : (
              <table className="w-full min-w-[820px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                    {d.columns.map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-slate-600">{h}</th>
                    ))}
                    <th className="px-4 py-3 font-medium text-slate-600">{estimateUi.issueBadge.done}</th>
                    <th className="px-4 py-3 font-medium text-slate-600">{estimateUi.orderBadge.done}</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link href={doc.href} className="inline-block max-w-[200px] font-medium text-[#0A4D34] [overflow-wrap:anywhere] hover:underline">{doc.documentNumber}</Link>
                      </td>
                      <td className="max-w-[300px] px-4 py-3 text-slate-700 [overflow-wrap:anywhere]">{doc.subject || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{doc.issueDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-slate-700">{yen(doc.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          active={doc.issued}
                          activeLabel={estimateUi.issueBadge.done}
                          inactiveLabel={estimateUi.issueBadge.pending}
                          disabled={pending}
                          onClick={() => runToggle(toggleEstimateIssueFlag(doc.id))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          active={doc.ordered}
                          activeLabel={estimateUi.orderBadge.done}
                          inactiveLabel={estimateUi.orderBadge.pending}
                          disabled={pending}
                          onClick={() => runToggle(toggleEstimateOrderFlag(doc.id))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : null}

          {activeTab === "delivery_note" ? (
            deliveryNotes.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center text-[15px] text-slate-400">{d.noDocuments}</div>
            ) : (
              <table className="w-full min-w-[820px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                    {d.columns.map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-slate-600">{h}</th>
                    ))}
                    <th className="px-4 py-3 font-medium text-slate-600">{deliveryNoteUi.issueBadge.done}</th>
                    <th className="px-4 py-3 font-medium text-slate-600">{deliveryNoteUi.billedBadge.done}</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryNotes.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link href={doc.href} className="inline-block max-w-[200px] font-medium text-[#0A4D34] [overflow-wrap:anywhere] hover:underline">{doc.documentNumber}</Link>
                      </td>
                      <td className="max-w-[300px] px-4 py-3 text-slate-700 [overflow-wrap:anywhere]">{doc.subject || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{doc.issueDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-slate-700">{yen(doc.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          active={doc.issued}
                          activeLabel={deliveryNoteUi.issueBadge.done}
                          inactiveLabel={deliveryNoteUi.issueBadge.pending}
                          disabled={pending}
                          onClick={() => runToggle(toggleDeliveryNoteIssueFlag(doc.id))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StaticBadge
                          active={doc.billed}
                          activeLabel={deliveryNoteUi.billedBadge.done}
                          inactiveLabel={deliveryNoteUi.billedBadge.pending}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : null}

          {activeTab === "invoice" ? (
            invoices.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center text-[15px] text-slate-400">{d.noDocuments}</div>
            ) : (
              <table className="w-full min-w-[820px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                    {d.columns.map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-slate-600">{h}</th>
                    ))}
                    <th className="px-4 py-3 font-medium text-slate-600">{invoiceUi.issueBadge.done}</th>
                    <th className="px-4 py-3 font-medium text-slate-600">{invoiceUi.paymentBadge.done}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link href={doc.href} className="inline-block max-w-[200px] font-medium text-[#0A4D34] [overflow-wrap:anywhere] hover:underline">{doc.documentNumber}</Link>
                      </td>
                      <td className="max-w-[300px] px-4 py-3 text-slate-700 [overflow-wrap:anywhere]">{doc.subject || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{doc.issueDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-slate-700">{yen(doc.total)}</td>
                      <td className="px-4 py-3">
                        <StaticBadge
                          active={doc.issued}
                          activeLabel={invoiceUi.issueBadge.done}
                          inactiveLabel={invoiceUi.issueBadge.pending}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          active={doc.paid}
                          activeLabel={invoiceUi.paymentBadge.done}
                          inactiveLabel={invoiceUi.paymentBadge.pending}
                          disabled={pending}
                          onClick={() => runToggle(toggleInvoicePaymentFlag(doc.id))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : null}
        </div>
      </div>
    </SalesFlowShell>
  );
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
  onClick,
  disabled,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full px-3 py-1 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        active ? "bg-[#E8F5EF] text-[#062E1F] ring-1 ring-[#9DD4BD] hover:bg-[#C5E6D8]" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-200",
      ].join(" ")}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

function StaticBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-[13px] font-medium",
        active ? "bg-[#E8F5EF] text-[#062E1F] ring-1 ring-[#9DD4BD]" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
      ].join(" ")}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
