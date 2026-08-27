"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { getClientsContent } from "./content";
import { ModalShell, RequiredBadge } from "../list-page-shared";
import { createClient, updateClient } from "@/lib/actions/clients";
import type { ClientRow } from "./clients-table";

type ClientModalUi = ReturnType<typeof getClientsContent>["modal"];

type Draft = {
  name: string;
  furigana: string;
  corpNumber: string;
  managementCode: string;
  department: string;
  email: string;
  emailCc: string;
  phone: string;
  fax: string;
  memo: string;
  destination: {
    postalCode: string;
    addressLine1: string;
    addressLine2: string;
    mailingLine1: string;
    mailingLine2: string;
    mailingLine3: string;
    mailingLine4: string;
    honorific: string;
  };
};

function draftFrom(client: ClientRow | null): Draft {
  return {
    name: client?.name ?? "",
    furigana: client?.furigana ?? "",
    corpNumber: client?.corpNumber ?? "",
    managementCode: client?.managementCode ?? "",
    department: client?.department ?? "",
    email: client?.email ?? "",
    emailCc: client?.emailCc ?? "",
    phone: client?.phone ?? "",
    fax: client?.fax ?? "",
    memo: client?.memo ?? "",
    destination: {
      postalCode: client?.destination.postalCode ?? "",
      addressLine1: client?.destination.addressLine1 ?? "",
      addressLine2: client?.destination.addressLine2 ?? "",
      mailingLine1: client?.destination.mailingLine1 ?? "",
      mailingLine2: client?.destination.mailingLine2 ?? "",
      mailingLine3: client?.destination.mailingLine3 ?? "",
      mailingLine4: client?.destination.mailingLine4 ?? "",
      honorific: client?.destination.honorific ?? "",
    },
  };
}

/** Summary handed back so the caller (document form) can select the new client right away. */
export type CreatedClientSummary = {
  id: string;
  name: string;
  honorific: string | null;
  department: string | null;
  phone: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
};

export function ClientRegistrationModal({
  ui,
  client = null,
  onClose,
  onSaved,
}: {
  ui: ClientModalUi;
  client?: ClientRow | null;
  onClose: () => void;
  /** Receives the created client on a new registration. */
  onSaved: (created?: CreatedClientSummary) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(client));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Omit<Draft, "destination">>(key: K, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _drop, ...rest }) => rest);
  };
  const setDest = (key: keyof Draft["destination"], value: string) =>
    setDraft((d) => ({ ...d, destination: { ...d.destination, [key]: value } }));

  const err = (key: string) =>
    errors[key] ? <p className="mt-1 text-[13px] text-red-600">{errors[key]}</p> : null;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const payload = {
        ...draft,
        emailCc: draft.emailCc,
        destination: draft.destination,
      };

      if (client) {
        const result = await updateClient(client.id, payload);
        if (result.ok) {
          onSaved();
          return;
        }
        setErrors(result.fieldErrors ?? {});
        setMessage(result.error);
        return;
      }

      const result = await createClient(payload);
      if (result.ok) {
        onSaved({
          id: result.data,
          name: draft.name.trim(),
          honorific: draft.destination.honorific.trim() || null,
          department: draft.department.trim() || null,
          phone: draft.phone.trim() || null,
          postalCode: draft.destination.postalCode.trim() || null,
          addressLine1: draft.destination.addressLine1.trim() || null,
          addressLine2: draft.destination.addressLine2.trim() || null,
        });
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error);
    });
  }

  return (
    <ModalShell
      title={ui.title}
      onClose={onClose}
      footer={
        <>
          {message ? <span className="mr-auto text-[14px] text-red-600">{message}</span> : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-8 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
          >
            {ui.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8] disabled:opacity-60"
          >
            {ui.register}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <ModalField label={ui.clientName} required={ui.required}>
          <div className="flex items-center gap-2">
            <input
              className="field flex-1"
              maxLength={40}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {ui.nameSuffix ? (
              <span className="shrink-0 text-[15px] text-slate-600">{ui.nameSuffix}</span>
            ) : null}
          </div>
          <p className="mt-1 text-right text-xs text-slate-400">{draft.name.length}/40</p>
          {err("name")}
        </ModalField>

        <ModalField label={ui.furigana}>
          <input
            className="field"
            value={draft.furigana}
            onChange={(e) => set("furigana", e.target.value)}
          />
          {err("furigana")}
        </ModalField>

        <ModalField label={ui.corpNumber} hint={ui.corpNumberHint}>
          <input
            className="field"
            value={draft.corpNumber}
            onChange={(e) => set("corpNumber", e.target.value)}
          />
          {err("corpNumber")}
        </ModalField>

        <div className="flex gap-2 border-b border-slate-200 pb-1">
          <span className="border-b-2 border-cyan-500 px-3 py-2 text-[15px] font-medium text-slate-900">
            {ui.destinationTab}
          </span>
        </div>

        <ModalField label={ui.managementCode} hint={ui.managementCodeHint}>
          <input
            className="field"
            value={draft.managementCode}
            onChange={(e) => set("managementCode", e.target.value)}
          />
          {err("managementCode")}
        </ModalField>

        <ModalField label={ui.department} hint={ui.departmentHint}>
          <textarea
            className="field min-h-[88px]"
            rows={3}
            value={draft.department}
            onChange={(e) => set("department", e.target.value)}
          />
          {err("department")}
        </ModalField>

        <ModalField label={ui.email}>
          <input
            className="field"
            placeholder={ui.emailPlaceholder}
            type="email"
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
          />
          {err("email")}
        </ModalField>

        <ModalField label={ui.emailCc} hint={ui.emailCcHint}>
          <input
            className="field"
            placeholder={ui.emailCcPlaceholder}
            value={draft.emailCc}
            onChange={(e) => set("emailCc", e.target.value)}
          />
          {err("emailCc")}
        </ModalField>

        <ModalField label={ui.postalCode} hint={ui.postalCodeHint}>
          <input
            className="field w-[160px]"
            value={draft.destination.postalCode}
            onChange={(e) => setDest("postalCode", e.target.value)}
          />
        </ModalField>

        <ModalField label={ui.address}>
          <div className="space-y-3">
            <input
              className="field"
              placeholder={ui.addressLine1Placeholder}
              value={draft.destination.addressLine1}
              onChange={(e) => setDest("addressLine1", e.target.value)}
            />
            <input
              className="field"
              placeholder={ui.addressLine2Placeholder}
              value={draft.destination.addressLine2}
              onChange={(e) => setDest("addressLine2", e.target.value)}
            />
          </div>
        </ModalField>

        <ModalField label={ui.mailingName} hint={ui.mailingNameHint}>
          <div className="space-y-3">
            <input
              className="field"
              placeholder={ui.mailingLine1Placeholder}
              value={draft.destination.mailingLine1}
              onChange={(e) => setDest("mailingLine1", e.target.value)}
            />
            <input
              className="field"
              placeholder={ui.mailingLine2Placeholder}
              value={draft.destination.mailingLine2}
              onChange={(e) => setDest("mailingLine2", e.target.value)}
            />
            <input
              className="field"
              placeholder={ui.mailingLine3Placeholder}
              value={draft.destination.mailingLine3}
              onChange={(e) => setDest("mailingLine3", e.target.value)}
            />
            <div className="flex gap-3">
              <input
                className="field flex-1"
                placeholder={ui.mailingLine4NamePlaceholder}
                value={draft.destination.mailingLine4}
                onChange={(e) => setDest("mailingLine4", e.target.value)}
              />
              <select
                className="field w-[120px] bg-white"
                value={draft.destination.honorific}
                onChange={(e) => setDest("honorific", e.target.value)}
              >
                <option value="">{ui.honorificLabel}</option>
                <option value="様">様</option>
                <option value="御中">御中</option>
              </select>
            </div>
          </div>
        </ModalField>

        <ModalField label={ui.phone}>
          <input
            className="field"
            placeholder={ui.phonePlaceholder}
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          {err("phone")}
        </ModalField>

        <ModalField label={ui.fax}>
          <input
            className="field"
            placeholder={ui.faxPlaceholder}
            value={draft.fax}
            onChange={(e) => set("fax", e.target.value)}
          />
          {err("fax")}
        </ModalField>

        <ModalField label={ui.memo} hint={ui.memoHint}>
          <textarea
            className="field min-h-[100px]"
            value={draft.memo}
            onChange={(e) => set("memo", e.target.value)}
          />
          {err("memo")}
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
