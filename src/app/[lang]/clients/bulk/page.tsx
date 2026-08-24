"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { bulkUpsertClients } from "@/lib/actions/clients";
import { CLIENTS_TEMPLATE_COLUMNS, parseClientsCsv } from "@/lib/clients-bulk";
import { downloadCsv } from "@/lib/csv";
import { BulkInfoTable, BulkSection, ListPageTabs } from "../../list-page-shared";
import { getClientsContent, getClientsHref } from "../content";

export default function ClientsBulkPage() {
  const { lang } = useLanguage();
  const ui = getClientsContent(lang);
  const bulk = ui.bulk;
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function downloadTemplate(encoding: "utf-8" | "shift-jis") {
    // Shift-JIS 인코더는 브라우저에 없으므로, Excel 이 열 수 있도록 BOM 붙인 UTF-8 로 내려준다.
    downloadCsv(`clients-template-${encoding}.csv`, `${CLIENTS_TEMPLATE_COLUMNS.join(",")}\r\n`, {
      bom: encoding !== "utf-8",
    });
  }

  function handleUpload() {
    if (!selectedFile) return;
    setMessage(null);
    setRowErrors({});

    startTransition(async () => {
      const text = await selectedFile.text();
      const rows = parseClientsCsv(text);
      if (rows.length === 0) {
        setMessage({ kind: "error", text: bulk.emptyFile });
        return;
      }

      const result = await bulkUpsertClients(rows);
      if (result.ok) {
        setMessage({
          kind: "ok",
          text: bulk.uploadResult
            .replace("{created}", String(result.data.created))
            .replace("{updated}", String(result.data.updated)),
        });
        setSelectedFile(null);
        router.refresh();
      } else {
        setRowErrors(result.fieldErrors ?? {});
        setMessage({ kind: "error", text: result.error });
      }
    });
  }

  return (
    <SalesFlowShell activeItem="clients">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ListPageTabs
          tabs={ui.tabs}
          activeIndex={1}
          onTabChange={(index) => {
            if (index === 0) router.push(getClientsHref(lang, "list"));
          }}
        />

        <h1 className="mt-8 text-[30px] font-bold tracking-tight text-slate-900">{bulk.title}</h1>
        <p className="mt-3 max-w-[900px] text-[15px] leading-7 text-slate-600">{bulk.intro}</p>

        <div className="mt-8 space-y-6">
          <BulkSection title={bulk.uploadSection}>
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

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={!selectedFile || pending}
                onClick={handleUpload}
                className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
              >
                {bulk.upload}
              </button>
              {message ? (
                <span
                  role="status"
                  className={
                    message.kind === "ok"
                      ? "text-[14px] text-emerald-700"
                      : "text-[14px] text-red-600"
                  }
                >
                  {message.text}
                </span>
              ) : null}
            </div>

            {Object.keys(rowErrors).length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-red-600">
                {Object.entries(rowErrors)
                  .slice(0, 20)
                  .map(([key, value]) => (
                    <li key={key}>
                      {key}: {value}
                    </li>
                  ))}
              </ul>
            ) : null}

            <ul className="mt-5 list-disc space-y-1 pl-5 text-[14px] leading-7 text-slate-600">
              {bulk.uploadNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </BulkSection>

          <BulkSection title={bulk.templateSection}>
            <BulkInfoTable
              rows={[
                {
                  label: bulk.templateUtf8,
                  value: (
                    <button
                      type="button"
                      onClick={() => downloadTemplate("utf-8")}
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
                      onClick={() => downloadTemplate("shift-jis")}
                      className="rounded border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-700 hover:bg-slate-50"
                    >
                      {bulk.templateShiftJisButton}
                    </button>
                  ),
                },
              ]}
            />
          </BulkSection>

          <BulkSection title={bulk.formatSection}>
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
          </BulkSection>

          <BulkSection title={bulk.fieldsSection}>
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
                      <td className="border border-slate-200 px-4 py-3 align-top font-medium text-slate-700">
                        {field.name}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-center align-top text-slate-700">
                        {field.required}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 align-top text-slate-700">
                        {field.limit}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 align-top text-slate-600">
                        {field.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BulkSection>
        </div>
      </div>
    </SalesFlowShell>
  );
}
