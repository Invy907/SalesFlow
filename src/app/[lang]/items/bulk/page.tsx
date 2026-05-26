"use client";

import { useState } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getItemsContent } from "../content";
import { ItemsInfoTable, ItemsNavTabs, ItemsSection } from "../items-shared";

export default function ItemsBulkPage() {
  const { lang } = useLanguage();
  const ui = getItemsContent(lang);
  const bulk = ui.bulk;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <SalesFlowShell activeItem="items">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ItemsNavTabs active="bulk" />

        <h1 className="mt-8 text-[30px] font-bold tracking-tight text-slate-900">{bulk.title}</h1>
        <p className="mt-3 max-w-[900px] text-[15px] leading-7 text-slate-600">{bulk.intro}</p>

        <div className="mt-8 space-y-6">
          <ItemsSection title={bulk.uploadSection}>
            <div className="rounded border border-slate-300 bg-[#f8fafc] px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50">
                  {bulk.chooseFile}
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="text-[14px] text-slate-500">
                  {selectedFile?.name ?? bulk.noFile}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                disabled={!selectedFile}
                className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
              >
                {bulk.upload}
              </button>
            </div>

            <ul className="mt-5 list-disc space-y-1 pl-5 text-[14px] leading-7 text-slate-600">
              {bulk.uploadNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </ItemsSection>

          <ItemsSection title={bulk.templateSection}>
            <ItemsInfoTable
              rows={[
                {
                  label: bulk.templateUtf8,
                  value: (
                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-700 hover:bg-slate-50"
                    >
                      {bulk.templateUtf8Button}
                    </button>
                  ),
                },
                {
                  label: bulk.templateShiftJis,
                  value: (
                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-700 hover:bg-slate-50"
                    >
                      {bulk.templateShiftJisButton}
                    </button>
                  ),
                },
              ]}
            />
          </ItemsSection>

          <ItemsSection title={bulk.formatSection}>
            <table className="w-full border-collapse text-[14px]">
              <tbody>
                {bulk.formatRows.map(([label, value]) => (
                  <tr key={label} className="border-b border-slate-200 last:border-b-0">
                    <td className="w-[240px] bg-[#f8fafc] px-4 py-4 font-medium text-slate-700">
                      {label}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[14px] text-slate-600">{bulk.formatNote}</p>
          </ItemsSection>

          <ItemsSection title={bulk.fieldsSection}>
            <p className="text-[14px] text-slate-600">{bulk.fieldsIntro}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[14px]">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {bulk.fieldHeaders.map((header) => (
                      <th
                        key={header}
                        className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-700"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulk.fields.map((field) => (
                    <tr key={field.name}>
                      <td className="border border-slate-200 px-4 py-3 font-medium text-slate-700 align-top">
                        {field.name}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-center text-slate-700 align-top">
                        {field.required}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-700 align-top">
                        {field.limit}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-600 align-top">
                        {field.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ItemsSection>
        </div>
      </div>
    </SalesFlowShell>
  );
}
