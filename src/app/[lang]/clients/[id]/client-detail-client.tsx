"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { pageContainerClass } from "@/components/page-container";
import { getClientsContent } from "../content";
import { formatSalesDocumentStatus } from "@/lib/document-status";

export type ClientDocumentRow = {
  type: "estimate" | "invoice" | "delivery_note" | "receipt";
  id: string;
  href: string;
  documentNumber: string;
  subject: string;
  issueDate: string;
  status: string;
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

export function ClientDetailClient({
  client,
  documents,
  includeProcessed,
}: {
  client: ClientDetail;
  documents: ClientDocumentRow[];
  includeProcessed: boolean;
}) {
  const { lang } = useLanguage();
  const ui = getClientsContent(lang);
  const d = ui.detail;
  const router = useRouter();

  const infoRows: Array<{ label: string; value: string | null }> = [
    { label: ui.tableHeaders[0], value: client.name },
    { label: "フリガナ", value: client.furigana },
    { label: "管理コード", value: client.managementCode },
    { label: "部署・担当者", value: client.department },
    { label: "メール", value: client.email },
    { label: "電話番号", value: client.phone },
    { label: "FAX", value: client.fax },
  ];

  return (
    <SalesFlowShell activeItem="clients">
      <div className={pageContainerClass()}>
        <div className="mb-4">
          <Link href="/clients" className="text-[16px] font-semibold text-[#0A4D34] hover:text-[#083D29]">
            ← {d.backToList}
          </Link>
        </div>

        <h1 className="text-[32px] font-bold tracking-tight text-slate-900">{client.name}</h1>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 rounded border border-slate-200 bg-white p-6 sm:grid-cols-[160px_1fr]">
          {infoRows.map((row) => (
            <div key={row.label} className="contents">
              <div className="text-[14px] font-medium text-slate-500">{row.label}</div>
              <div className="text-[15px] text-slate-800">{row.value || "—"}</div>
            </div>
          ))}
          {client.memo ? (
            <>
              <div className="text-[14px] font-medium text-slate-500">メモ</div>
              <div className="whitespace-pre-line text-[15px] text-slate-800">{client.memo}</div>
            </>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-slate-900">{d.documentsTitle}</h2>
          <label className="flex items-center gap-2 text-[14px] text-slate-600">
            <input
              type="checkbox"
              checked={includeProcessed}
              onChange={(e) => {
                const params = new URLSearchParams();
                if (e.target.checked) params.set("showProcessed", "1");
                router.push(`/${lang}/clients/${client.id}${params.toString() ? `?${params}` : ""}`);
              }}
            />
            {d.showProcessed}
          </label>
        </div>

        <div className="mt-3 overflow-x-auto rounded border border-slate-200 bg-white">
          {documents.length === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center text-[15px] text-slate-400">{d.noDocuments}</div>
          ) : (
            <table className="w-full min-w-[760px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                  {d.columns.map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={`${doc.type}-${doc.id}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-600">{d.docTypeLabels[doc.type]}</td>
                    <td className="px-4 py-3">
                      <Link href={doc.href} className="font-medium text-[#0A4D34] hover:underline">
                        {doc.documentNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{doc.subject || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.issueDate}</td>
                    <td className="px-4 py-3 text-slate-600">{formatSalesDocumentStatus(lang, doc.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SalesFlowShell>
  );
}
