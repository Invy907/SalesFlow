"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { bulkCreateItems, type BulkItemRow } from "@/lib/actions/items";
import { downloadCsv, readCsvFile, parseCsvRows } from "@/lib/csv";
import { taxCategoryFromLabel } from "@/lib/tax";
import { getItemsContent } from "../content";
import { ItemsInfoTable, ItemsNavTabs, ItemsSection } from "../items-shared";

function parseItemsCsv(text: string): BulkItemRow[] {
  return parseCsvRows(text).map(({ row, cols }) => {
    const rate = cols[3] ?? "";
    const taxLabel =
      rate === "R8"
        ? "軽減8%"
        : rate === "8"
          ? "8%"
          : rate === "5"
            ? "5%"
            : rate === "10"
              ? "10%"
              : "";
    return {
      row,
      name: cols[0] ?? "",
      unit: cols[1] ?? "",
      unitPrice: (cols[2] ?? "").replace(/,/g, ""),
      taxCategory: cols[4] === "1" ? "exempt" : taxLabel ? taxCategoryFromLabel(taxLabel) : "follow_company",
      withholdingExempt: cols[5] === "1",
    };
  });
}

const TEMPLATE_HEADER = "品番・品名,単位,単価,消費税率,非課税フラグ,源泉徴収税対象外フラグ";

export default function ItemsBulkPage() {
  const { lang } = useLanguage();
  const ui = getItemsContent(lang);
  const bulk = ui.bulk;
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function downloadTemplate(encoding: "utf-8" | "utf-8-bom") {
    downloadCsv(`items-template-${encoding}.csv`, `${TEMPLATE_HEADER}\r\n`, {
      bom: encoding !== "utf-8",
    });
  }

  function handleUpload() {
    if (!selectedFile) return;
    setMessage(null);
    setRowErrors({});

    startTransition(async () => {
      let text: string;
      try {
        text = await readCsvFile(selectedFile);
      } catch {
        setMessage({ kind: "error", text: lang === "ko" ? "UTF-8 또는 Shift-JIS CSV 파일을 선택해 주세요." : lang === "en" ? "Choose a UTF-8 or Shift-JIS CSV file." : "UTF-8またはShift-JISのCSVファイルを選択してください。" });
        return;
      }
      const rows = parseItemsCsv(text);
      if (rows.length === 0) {
        setMessage({ kind: "error", text: ui.saveFailed });
        return;
      }

      const result = await bulkCreateItems(rows);
      if (result.ok) {
        setMessage({
          kind: "ok",
          text: bulk.uploadResult.replace("{count}", String(result.data.created)),
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
    <SalesFlowShell activeItem="items">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <ItemsNavTabs active="bulk" />

        <h1 className="mt-8 text-[30px] font-bold tracking-tight text-slate-900">{bulk.title}</h1>
        <p className="mt-3 max-w-[900px] text-[15px] leading-7 text-slate-600">{bulk.intro}</p>

        {message ? (
          <p
            className={[
              "mt-4 rounded px-4 py-3 text-[14px]",
              message.kind === "ok"
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {message.text}
          </p>
        ) : null}

        {Object.keys(rowErrors).length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-red-600">
            {Object.entries(rowErrors).map(([k, v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 space-y-6">
          <ItemsSection title={bulk.uploadSection}>
            <div className="rounded border border-slate-300 bg-[#f8fafc] px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50">
                  {bulk.chooseFile}
                  <input
                    type="file"
                    disabled={pending}
                    accept=".csv"
                    className="hidden"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="min-w-0 max-w-full [overflow-wrap:anywhere] text-[14px] text-slate-500">
                  {selectedFile?.name ?? bulk.noFile}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                disabled={!selectedFile || pending}
                onClick={handleUpload}
                className="rounded bg-[#0A4D34] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#083D29] disabled:cursor-not-allowed disabled:bg-slate-300"
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
                      onClick={() => downloadTemplate("utf-8")}
                      className="rounded border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-700 hover:bg-slate-50"
                    >
                      {bulk.templateUtf8Button}
                    </button>
                  ),
                },
                {
                  label: "Excel · UTF-8 (BOM)",
                  value: (
                    <button
                      type="button"
                      onClick={() => downloadTemplate("utf-8-bom")}
                      className="rounded border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-700 hover:bg-slate-50"
                    >
                      {lang === "ko" ? "Excel용 UTF-8 템플릿" : lang === "en" ? "Excel UTF-8 template" : "Excel用 UTF-8テンプレート"}
                    </button>
                  ),
                },
              ]}
            />
          </ItemsSection>

          <ItemsSection title={bulk.formatSection}>
            <table className="block w-full border-collapse text-[14px] sm:table">
              <tbody className="block sm:table-row-group">
                {bulk.formatRows.map(([label, value]) => (
                  <tr key={label} className="grid border-b border-slate-200 last:border-b-0 sm:table-row">
                    <td className="block bg-[#f8fafc] sm:table-cell sm:w-[240px] px-4 py-4 font-medium text-slate-700">
                      {label}
                    </td>
                    <td className="block px-4 py-4 text-slate-700 [overflow-wrap:anywhere] sm:table-cell">{value}</td>
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
