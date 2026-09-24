"use client";

import type { Dispatch, SetStateAction } from "react";
import { TaxRateSelect } from "../documents/new-document-shared";

export type OrderFormRow = {
  name: string;
  unit: string;
  price: string;
  tax: string;
};

export function createEmptyOrderFormRow(): OrderFormRow {
  return { name: "", unit: "", price: "", tax: "10%" };
}

export function OrderFormLineItemsTable({
  headers,
  unitPlaceholder,
  addRowLabel,
  rows,
  setRows,
  deleteLabel,
}: {
  headers: readonly [string, string, string, string];
  unitPlaceholder: string;
  addRowLabel: string;
  rows: OrderFormRow[];
  setRows: Dispatch<SetStateAction<OrderFormRow[]>>;
  deleteLabel: string;
}) {

  function updateRow(index: number, key: keyof OrderFormRow, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  }

  return (
    <div>
      <div className="min-w-0 overflow-x-auto rounded border border-slate-300" tabIndex={0} role="region" aria-label={headers.join(" / ")}>
        <table className="w-full min-w-[600px] table-fixed border-collapse bg-white text-left text-[14px]">
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead className="bg-[#f5f7fa] text-[15px] text-slate-800">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-r border-slate-300 px-4 py-3 text-center font-semibold last:border-r-0"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="border-b border-r border-slate-200 px-3 py-2 align-middle">
                  <input
                    className="w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-[15px] text-slate-800 outline-none focus:border-[#3AA87A]"
                    aria-label={`${headers[0]} ${index + 1}`}
                    required
                    maxLength={500}
                    value={row.name}
                    onChange={(event) => updateRow(index, "name", event.target.value)}
                  />
                </td>
                <td className="border-b border-r border-slate-200 px-3 py-2 align-middle">
                  <input
                    className="w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-center text-[15px] text-slate-700 outline-none focus:border-[#3AA87A]"
                    placeholder={unitPlaceholder}
                    aria-label={`${headers[1]} ${index + 1}`}
                    maxLength={30}
                    value={row.unit}
                    onChange={(event) => updateRow(index, "unit", event.target.value)}
                  />
                </td>
                <td className="border-b border-r border-slate-200 px-3 py-2 align-middle">
                  <input
                    type="number"
                    min={0}
                    max={999999999}
                    step={1}
                    required
                    aria-label={`${headers[2]} ${index + 1}`}
                    inputMode="numeric"
                    className="w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-right text-[15px] text-slate-800 outline-none focus:border-[#3AA87A]"
                    value={row.price}
                    onChange={(event) => updateRow(index, "price", event.target.value)}
                  />
                </td>
                <td className="border-b border-slate-200 px-3 py-2 align-middle">
                  <TaxRateSelect compact value={row.tax} onChange={(value) => updateRow(index, "tax", value)} />
                  <button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} disabled={rows.length === 1} className="mt-2 text-xs text-red-600 disabled:hidden" aria-label={`${deleteLabel} ${index + 1}`}>{deleteLabel}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setRows((current) => [...current, createEmptyOrderFormRow()])}
        disabled={rows.length >= 80}
        className="mt-4 text-[16px] font-medium text-[#0A4D34] hover:underline"
      >
        {addRowLabel}
      </button>
    </div>
  );
}
