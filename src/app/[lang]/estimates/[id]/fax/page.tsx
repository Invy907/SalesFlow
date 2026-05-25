"use client";

import { use } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getEstimateContent } from "../../content";

type RouteParams = {
  lang: string;
  id: string;
};

export default function EstimateFaxPage(props: {
  params: Promise<RouteParams>;
}) {
  const { id: _id } = use(props.params);
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const fax = ui.faxPage;

  return (
    <SalesFlowShell activeItem="estimates">
      <div className="mx-auto max-w-[1260px] px-8 py-10">
        <h1 className="text-[34px] font-bold tracking-tight text-slate-900">
          {fax.title}
        </h1>

        <div className="mt-10 max-w-[420px]">
          <label className="mb-3 block text-[18px] font-semibold text-slate-800">
            {fax.faxNumber}
          </label>
          <input className="field" />
        </div>

        <div className="mt-6 overflow-hidden rounded border border-slate-300 bg-white">
          <table className="w-full border-collapse">
            <thead className="bg-[#f5f7fa]">
              <tr>
                {fax.tableHeaders.map((header) => (
                  <th
                    key={header}
                    className="border-b border-r border-slate-300 px-4 py-4 text-center text-[16px] font-semibold text-slate-800 last:border-r-0"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <td className="border-r border-slate-300 px-5 py-5">
                  <div className="space-y-2">
                    <a href="#" className="text-[18px] font-semibold text-cyan-600">
                      {ui.clientValue} {ui.companyHonorific || ""}
                    </a>
                    <p className="text-[16px] text-slate-500">{ui.estimateNumberValue}</p>
                  </div>
                  <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-[16px] text-slate-700">
                    <div className="flex justify-between">
                      <span>{fax.publishLabel}</span>
                      <span>{ui.issueDateValue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{fax.expiryLabel}</span>
                      <span>{fax.noExpiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{fax.amountLabel}</span>
                      <span>{fax.amount}</span>
                    </div>
                  </div>
                </td>
                <td className="border-r border-slate-300 px-5 py-5 text-[18px] font-semibold text-cyan-600">
                  {ui.clientValue} {ui.companyHonorific || ""}
                </td>
                <td className="px-5 py-5 text-right text-[22px] font-semibold text-slate-800">
                  {fax.fee}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <h2 className="text-[20px] font-bold text-slate-900">{fax.notesTitle}</h2>
          <ul className="mt-4 list-disc space-y-1 pl-7 text-[18px] leading-8 text-slate-800">
            {fax.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded border border-rose-200 bg-rose-50 px-5 py-4 text-[17px] text-rose-500">
          ▲ {fax.warning}
        </div>
      </div>
    </SalesFlowShell>
  );
}
