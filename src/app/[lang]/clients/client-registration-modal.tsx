"use client";

import type { ReactNode } from "react";
import type { getClientsContent } from "./content";
import { ModalShell, RequiredBadge } from "../list-page-shared";

type ClientModalUi = ReturnType<typeof getClientsContent>["modal"];

export function ClientRegistrationModal({
  ui,
  onClose,
}: {
  ui: ClientModalUi;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title={ui.title}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-8 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
          >
            {ui.cancel}
          </button>
          <button
            type="button"
            className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white hover:bg-[#1096a8]"
          >
            {ui.register}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <ModalField label={ui.clientName} required={ui.required}>
          <div className="flex items-center gap-2">
            <input className="field flex-1" maxLength={40} />
            {ui.nameSuffix ? (
              <span className="shrink-0 text-[15px] text-slate-600">{ui.nameSuffix}</span>
            ) : null}
          </div>
          <p className="mt-1 text-right text-xs text-slate-400">{ui.charCount}</p>
          <button
            type="button"
            className="mt-3 rounded border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
          >
            {ui.corpLookup}
          </button>
        </ModalField>

        <ModalField label={ui.furigana}>
          <input className="field" />
        </ModalField>

        <ModalField label={ui.corpNumber} hint={ui.corpNumberHint}>
          <input className="field" />
        </ModalField>

        <div className="flex gap-2 border-b border-slate-200 pb-1">
          <span className="border-b-2 border-cyan-500 px-3 py-2 text-[15px] font-medium text-slate-900">
            {ui.destinationTab}
          </span>
          <button type="button" className="px-3 py-2 text-[15px] text-[#14a7bb] hover:underline">
            {ui.addTab}
          </button>
        </div>

        <ModalField label={ui.managementCode} hint={ui.managementCodeHint}>
          <input className="field" />
        </ModalField>

        <ModalField label={ui.department} hint={ui.departmentHint}>
          <textarea className="field min-h-[88px]" rows={3} />
        </ModalField>

        <ModalField label={ui.email}>
          <input className="field" placeholder={ui.emailPlaceholder} type="email" />
        </ModalField>

        <ModalField label={ui.emailCc} hint={ui.emailCcHint}>
          <input className="field" placeholder={ui.emailCcPlaceholder} />
        </ModalField>

        <ModalField label={ui.postalCode} hint={ui.postalCodeHint}>
          <div className="flex flex-wrap items-center gap-3">
            <input className="field w-[160px]" />
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
            >
              {ui.postalCodeLookup}
            </button>
          </div>
        </ModalField>

        <ModalField label={ui.address}>
          <div className="space-y-3">
            <input className="field" placeholder={ui.addressLine1Placeholder} />
            <input className="field" placeholder={ui.addressLine2Placeholder} />
          </div>
        </ModalField>

        <ModalField label={ui.mailingName} hint={ui.mailingNameHint}>
          <div className="space-y-3">
            <input className="field" placeholder={ui.mailingLine1Placeholder} />
            <input className="field" placeholder={ui.mailingLine2Placeholder} />
            <input className="field" placeholder={ui.mailingLine3Placeholder} />
            <div className="flex gap-3">
              <input className="field flex-1" placeholder={ui.mailingLine4NamePlaceholder} />
              <select className="field w-[120px] bg-white">
                <option>{ui.honorificLabel}</option>
                <option>様</option>
                <option>御中</option>
              </select>
            </div>
          </div>
        </ModalField>

        <ModalField label={ui.phone}>
          <input className="field" placeholder={ui.phonePlaceholder} />
        </ModalField>

        <ModalField label={ui.fax}>
          <input className="field" placeholder={ui.faxPlaceholder} />
        </ModalField>

        <ModalField label={ui.memo} hint={ui.memoHint}>
          <textarea className="field min-h-[100px]" />
        </ModalField>
      </div>
    </ModalShell>
  );
}

function ModalField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <label className="text-[15px] font-semibold text-slate-800">{label}</label>
        {required ? <RequiredBadge label={required} /> : null}
      </div>
      {hint ? <p className="mb-2 text-[13px] text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}
