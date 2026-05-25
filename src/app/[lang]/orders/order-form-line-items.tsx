"use client";

import { useState } from "react";
import { TaxRateSelect } from "../documents/new-document-shared";

type Row = {
  name: string;
  unit: string;
  price: string;
  tax: string;
};

function createEmptyRow(): Row {
  return { name: "", unit: "", price: "", tax: "10%" };
}

export function OrderFormLineItemsTable({
  headers,
  unitPlaceholder,
  addRowLabel,
}: {
  headers: readonly [string, string, string, string];
  unitPlaceholder: string;
  addRowLabel: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => [createEmptyRow()]);

  function updateRow(index: number, key: keyof Row, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded border border-slate-300">
        <table className="w-full table-fixed border-collapse bg-white text-left text-[14px]">
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
                    className="w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-[15px] text-slate-800 outline-none focus:border-cyan-400"
                    value={row.name}
                    onChange={(event) => updateRow(index, "name", event.target.value)}
                  />
                </td>
                <td className="border-b border-r border-slate-200 px-3 py-2 align-middle">
                  <input
                    className="w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-center text-[15px] text-slate-700 outline-none focus:border-cyan-400"
                    placeholder={unitPlaceholder}
                    value={row.unit}
                    onChange={(event) => updateRow(index, "unit", event.target.value)}
                  />
                </td>
                <td className="border-b border-r border-slate-200 px-3 py-2 align-middle">
                  <input
                    inputMode="numeric"
                    className="w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-right text-[15px] text-slate-800 outline-none focus:border-cyan-400"
                    value={row.price}
                    onChange={(event) => updateRow(index, "price", event.target.value)}
                  />
                </td>
                <td className="border-b border-slate-200 px-3 py-2 align-middle">
                  <TaxRateSelect compact value={row.tax} onChange={(value) => updateRow(index, "tax", value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setRows((current) => [...current, createEmptyRow()])}
        className="mt-4 text-[16px] font-medium text-[#14a7bb] hover:underline"
      >
        {addRowLabel}
      </button>
    </div>
  );
}
