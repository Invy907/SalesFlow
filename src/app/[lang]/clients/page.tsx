"use client";

import { useState } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  CsvDownloadLink,
  ListPageTabs,
  ListPrimaryButton,
  ListSearchBar,
} from "../list-page-shared";
import { ClientRegistrationModal } from "./client-registration-modal";
import { getClientsContent } from "./content";

export default function ClientsPage() {
  const { lang } = useLanguage();
  const ui = getClientsContent(lang);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <SalesFlowShell activeItem="clients">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <ListPageTabs tabs={ui.tabs} activeIndex={0} />
          <ListPrimaryButton label={ui.createClient} onClick={() => setModalOpen(true)} />
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
          <ListSearchBar placeholder={ui.searchPlaceholder} searchLabel={ui.search} />
        </div>

        <div className="mt-4 flex justify-end">
          <CsvDownloadLink label={ui.csvDownload} />
        </div>

        <div className="mt-6 overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#f8fafc] text-left">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 accent-cyan-600" aria-label="Select all" />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  <SortableHeader label={ui.tableHeaders[0]} />
                </th>
                <th className="w-12 px-4 py-3">
                  <StarIcon />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  <SortableHeader label={ui.tableHeaders[1]} />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">{ui.tableHeaders[2]}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{ui.tableHeaders[3]}</th>
              </tr>
            </thead>
            <tbody>
              {ui.sampleClients.map((client) => (
                <tr key={client.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="h-4 w-4 accent-cyan-600" />
                  </td>
                  <td className="px-4 py-4">
                    <a href="#" className="font-medium text-[#14a7bb] hover:underline">
                      {client.name}
                      {ui.honorific ? ` ${ui.honorific}` : ""}
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    <button type="button" className="text-slate-300 hover:text-amber-400" aria-label="Favorite">
                      <StarIcon />
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{client.managementCode || "—"}</td>
                  <td className="px-4 py-4 text-slate-500">{client.destination || "—"}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-3 text-[14px]">
                      <a href="#" className="text-[#14a7bb] hover:underline">
                        {ui.edit}
                      </a>
                      <ActionDropdown label={ui.createDocument} />
                      <ActionDropdown label={ui.showDocument} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-right">
          <a href="#" className="text-[13px] text-[#14a7bb] hover:underline">
            {ui.listToggle}
          </a>
        </div>
      </div>

      {modalOpen ? (
        <ClientRegistrationModal ui={ui.modal} onClose={() => setModalOpen(false)} />
      ) : null}
    </SalesFlowShell>
  );
}

function SortableHeader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-slate-400">
        <path d="M10 3a.75.75 0 0 1 .53.22l3.25 3.25a.75.75 0 1 1-1.06 1.06L10 5.06 7.28 7.78a.75.75 0 0 1-1.06-1.06l3.25-3.25A.75.75 0 0 1 10 3Zm0 14a.75.75 0 0 1-.53-.22l-3.25-3.25a.75.75 0 1 1 1.06-1.06L10 14.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25A.75.75 0 0 1 10 17Z" />
      </svg>
    </span>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
    </svg>
  );
}

function ActionDropdown({ label }: { label: string }) {
  return (
    <button type="button" className="inline-flex items-center gap-1 text-[#14a7bb] hover:underline">
      {label}
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
    </button>
  );
}
