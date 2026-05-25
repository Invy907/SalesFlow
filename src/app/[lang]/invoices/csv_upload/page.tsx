"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getInvoiceContent } from "../content";
import { InvoiceSubNav } from "../invoice-sub-nav";

export default function InvoicesCsvUploadPage() {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);

  return (
    <SalesFlowShell activeItem="invoices">
      {/* 경고 배너 */}
      <div className="bg-red-50 px-8 py-3">
        <div className="mx-auto max-w-[1260px] flex items-center gap-2 text-[14px] text-red-700">
          <span className="text-red-500">▲</span>
          {ui.csvSetupWarning}
        </div>
      </div>

      <InvoiceSubNav active="csv_upload" />

      <div className="mx-auto max-w-[1260px] px-8 py-8">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
              {ui.csvUploadTitle}
            </h1>
            <p className="mt-2 text-[15px] text-slate-600">
              {ui.csvUploadDesc}
            </p>
            <p className="text-[15px] text-slate-600">
              <a href="#" className="text-cyan-600 underline">
                {ui.csvUploadTemplateLink}
              </a>
              {ui.csvUploadTemplateDesc}
            </p>
          </div>

          {/* 파일 업로드 섹션 */}
          <Section title={ui.csvUploadAreaTitle}>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer rounded border border-slate-300 bg-slate-50 px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-100">
                  {ui.csvUploadChoose}
                  <input type="file" accept=".csv" className="hidden" />
                </label>
                <span className="text-[14px] text-slate-400">{ui.csvUploadNoFile}</span>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[14px] text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-cyan-600" />
                {ui.csvUploadMailCheck}
              </label>
              <div>
                <button className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]">
                  {ui.csvUploadButton}
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-[14px] text-slate-600">
              <p className="font-semibold text-slate-700">{ui.csvUploadTaxNote}</p>
              <p>
                {ui.csvUploadTaxDesc}{" "}
                <a href="#" className="text-cyan-600 underline">
                  {ui.csvUploadTaxDescLink} ↗
                </a>
              </p>
            </div>

            <div className="mt-6">
              <p className="text-[14px] font-semibold text-slate-700">{ui.csvUploadNotesTitle}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-slate-600">
                {ui.csvUploadNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </Section>

          {/* 템플릿 다운로드 */}
          <Section title={ui.csvTemplateDownloadTitle}>
            <table className="mt-4 w-full border-collapse text-[14px]">
              <tbody>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-4 py-4 font-medium text-slate-700 align-top w-[220px]">
                    {ui.csvTemplateUtf8}
                  </td>
                  <td className="border border-slate-300 px-4 py-4 text-slate-700">
                    <p className="font-medium">{ui.csvTemplateUtf8Label}</p>
                    <p className="mt-1">
                      <a href="#" className="text-cyan-600 underline">
                        {ui.csvTemplateUtf8Link}
                      </a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-4 py-4 font-medium text-slate-700 align-top whitespace-pre-line">
                    {ui.csvTemplateShiftJis}
                  </td>
                  <td className="border border-slate-300 px-4 py-4 text-slate-700">
                    <p className="font-medium">{ui.csvTemplateShiftJisLabel}</p>
                    <p className="mt-1">
                      <a href="#" className="text-cyan-600 underline">
                        {ui.csvTemplateShiftJisLink}
                      </a>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[13px] text-slate-500">{ui.csvTemplateExcelNote}</p>
            <p className="mt-1 text-[13px] text-slate-500">{ui.csvTemplateHeaderNote}</p>
          </Section>

          {/* 템플릿 형식 */}
          <Section title={ui.csvFormatTitle}>
            <table className="mt-4 border-collapse text-[14px]">
              <tbody>
                {ui.csvFormatRows.map(([label, value]) => (
                  <tr key={label}>
                    <td className="border border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-700 w-[200px]">
                      {label}
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-slate-700">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[13px] text-slate-500">{ui.csvFormatNote}</p>
          </Section>

          {/* 항목 설명 테이블 */}
          <Section title={ui.csvFieldsTitle}>
            <p className="mt-2 text-[14px] text-slate-600 whitespace-pre-line">
              {ui.csvFieldsNote}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="bg-slate-50">
                    {ui.csvFieldHeaders.map((h) => (
                      <th
                        key={h}
                        className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ui.csvFields.map((field) => (
                    <tr key={field.name}>
                      <td className="border border-slate-300 px-4 py-3 font-medium text-slate-700 align-top">
                        {field.name}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-center text-slate-700 align-top">
                        {field.required}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-slate-700 align-top">
                        {field.limit}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-slate-600 align-top whitespace-pre-line">
                        {field.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </SalesFlowShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-6">
      <h2 className="border-b border-slate-200 pb-3 text-[18px] font-semibold text-slate-800">
        {title}
      </h2>
      {children}
    </section>
  );
}
