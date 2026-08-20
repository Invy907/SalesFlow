"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  DocumentBottomBar,
  DocumentDateFieldRow,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  HonorificField as SharedHonorificField,
  type LineItemRow,
  type LineItemTotals,
} from "../documents/new-document-shared";
import { createEstimate, updateEstimate } from "@/lib/actions/estimates";
import {
  taxCategoryFromLabel,
  taxRateSnapshotFor,
  type TaxCategory,
} from "@/lib/tax";
import { toIsoDate } from "./date-field-utils";
import { getEstimateContent } from "./content";
import type { ClientOption } from "./estimate-form-data";

type TabKey = "basic" | "recipient" | "tax" | "template";

const TAB_KEYS: TabKey[] = ["basic", "recipient", "tax", "template"];

export type EstimateFormInitial = {
  id?: string;
  clientId: string | null;
  clientName: string;
  issueDate: string;
  expiryDate: string;
  documentNumber: string;
  subject: string;
  senderCompanyName: string;
  recipient: {
    postalCode: string;
    addressLine1: string;
    addressLine2: string;
    companyName: string;
    department: string;
    name: string;
    contact: string;
  };
  taxDisplay: string;
  taxRounding: string;
  templateKey: string;
  templateMessage: string;
  remarks: string;
  lines: LineItemRow[];
};

export function EstimateFormClient({
  initial,
  clients,
}: {
  initial: EstimateFormInitial;
  clients: ClientOption[];
}) {
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const router = useRouter();

  const isEdit = Boolean(initial.id);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [totals, setTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>(initial.lines);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [primaryDate, setPrimaryDate] = useState(() =>
    initial.issueDate ? initial.issueDate.replace(/\//g, "-") : "",
  );
  const [secondaryDate, setSecondaryDate] = useState(() =>
    initial.expiryDate ? initial.expiryDate.replace(/\//g, "-") : "",
  );

  const tabs = useMemo(
    () => TAB_KEYS.map((key, index) => ({ key, label: ui.newTabs[index] })),
    [ui.newTabs],
  );

  const set = <K extends keyof EstimateFormInitial>(key: K, value: EstimateFormInitial[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors(({ [key as string]: _d, ...rest }) => rest);
  };
  const setRecipient = (key: keyof EstimateFormInitial["recipient"], value: string) =>
    setForm((f) => ({ ...f, recipient: { ...f.recipient, [key]: value } }));

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setTotals(next), []);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const lineItems = rows
        .filter((r) => r.name.trim() !== "" || r.price.trim() !== "")
        .map((r) => {
          const taxCategory = taxCategoryFromLabel(r.tax);
          return {
            name: r.name,
            qty: r.qty === "" ? 1 : Number(r.qty),
            unit: r.unit,
            unitPrice: r.price === "" ? 0 : Number(r.price.replace(/,/g, "")),
            taxCategory,
            taxRateSnapshot: taxRateSnapshotFor(taxCategory),
          };
        });

      const payload = {
        clientId: form.clientId,
        subject: form.subject,
        issueDate: new Date(toIsoDate(primaryDate)),
        expiryDate: secondaryDate ? new Date(toIsoDate(secondaryDate)) : null,
        taxDisplay: form.taxDisplay as "separate" | "separate_on_invoice" | "included" | "exempt",
        taxRounding: form.taxRounding as "round_down" | "round_up" | "round_half",
        withholdingType: "none" as const,
        templateKey: form.templateKey,
        templateMessage: form.templateMessage,
        remarks: form.remarks,
        recipientSnapshot: { ...form.recipient, clientName: form.clientName },
        senderSnapshot: { companyName: form.senderCompanyName },
        lineItems,
      };

      const result = initial.id
        ? await updateEstimate(initial.id, payload)
        : await createEstimate(payload);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
        return;
      }

      const id = initial.id ?? (result.data as string);
      if (!initial.id && typeof window !== "undefined") {
        window.localStorage.removeItem("estimate-new-line-items");
      }
      router.push(`/${lang}/estimates/${id}`);
      router.refresh();
    });
  }

  const err = (key: string) =>
    errors[key] ? <p className="mt-1 text-[13px] text-red-600">{errors[key]}</p> : null;

  const lineItemsTable = (
    <DocumentLineItemsTable
      ui={ui}
      storageKey={isEdit ? undefined : "estimate-new-line-items"}
      initialRows={isEdit ? initial.lines : undefined}
      onTotalsChange={handleTotalsChange}
      onRowsChange={handleRowsChange}
    />
  );

  return (
    <SalesFlowShell activeItem="estimates">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:py-10 lg:pb-32">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
          {isEdit ? ui.editAction : ui.newTitle}
        </h1>

        <div className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:mt-10 sm:px-0">
          <div className="flex min-w-max gap-6 border-b border-slate-200 text-base text-slate-500 sm:gap-10 sm:text-[18px]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "shrink-0 whitespace-nowrap border-b-[3px] px-3 pb-3 sm:px-4",
                  activeTab === tab.key
                    ? "border-cyan-500 font-semibold text-slate-900"
                    : "border-transparent",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "basic" && (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-2">
              <section>
                <h2 className="border-b border-slate-200 pb-3 text-[24px] font-semibold text-slate-900">
                  {ui.estimateInfo}
                </h2>
                <div className="mt-5 space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[16px] font-semibold text-slate-800">
                      {ui.client}
                    </span>
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        list="estimate-client-options"
                        value={form.clientName}
                        onChange={(e) => {
                          const name = e.target.value;
                          const match = clients.find((c) => c.name === name);
                          setForm((f) => ({
                            ...f,
                            clientName: name,
                            clientId: match?.id ?? null,
                          }));
                        }}
                      />
                      <SharedHonorificField honorific={ui.companyHonorific} />
                    </div>
                    <datalist id="estimate-client-options">
                      {clients.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                    {err("clientId")}
                  </label>

                  <DocumentDateFieldRow
                    fields={[
                      {
                        label: ui.issueDate,
                        required: ui.required,
                        value: primaryDate,
                        onChange: setPrimaryDate,
                        placeholder: ui.issueDate,
                      },
                      {
                        label: ui.expiryDate,
                        value: secondaryDate,
                        onChange: setSecondaryDate,
                        placeholder: ui.noDate,
                      },
                    ]}
                  />
                  {err("issueDate")}

                  <label className="block">
                    <span className="mb-2 block text-[16px] font-semibold text-slate-800">
                      {ui.estimateNumber}
                    </span>
                    <input
                      className="field bg-slate-50 text-slate-500"
                      readOnly
                      value={form.documentNumber || ui.estimateHint}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[16px] font-semibold text-slate-800">
                      {ui.subject}
                    </span>
                    <input
                      className="field"
                      maxLength={70}
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                    />
                    {err("subject")}
                  </label>
                </div>
              </section>

              <section>
                <h2 className="border-b border-slate-200 pb-3 text-[24px] font-semibold text-slate-900">
                  {ui.recipientInfo}
                </h2>
                <div className="mt-5 space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[16px] font-semibold text-slate-800">
                      {ui.companyName}
                    </span>
                    <input
                      className="field"
                      value={form.senderCompanyName}
                      onChange={(e) => set("senderCompanyName", e.target.value)}
                    />
                  </label>
                </div>
              </section>
            </div>

            {lineItemsTable}

            <label className="mt-12 block">
              <span className="mb-2 block text-[18px] font-semibold text-slate-800">{ui.remarks}</span>
              <textarea
                className="field min-h-[140px]"
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </label>
          </>
        )}

        {activeTab === "recipient" && (
          <>
            <div className="mt-10 max-w-[600px] space-y-5">
              <label className="block">
                <span className="mb-2 block font-semibold">{ui.postalCode}</span>
                <input
                  className="field w-full max-w-[180px]"
                  value={form.recipient.postalCode}
                  onChange={(e) => setRecipient("postalCode", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block font-semibold">{ui.address}</span>
                <input
                  className="field"
                  value={form.recipient.addressLine1}
                  onChange={(e) => setRecipient("addressLine1", e.target.value)}
                />
                <input
                  className="field mt-2"
                  value={form.recipient.addressLine2}
                  onChange={(e) => setRecipient("addressLine2", e.target.value)}
                />
              </label>
            </div>
            {lineItemsTable}
          </>
        )}

        {activeTab === "tax" && (
          <div className="mt-10 max-w-[640px] space-y-4">
            <label className="block text-[15px]">
              <span className="font-semibold">{ui.taxSettings}</span>
              <select
                className="field mt-2 bg-white"
                value={form.taxDisplay}
                onChange={(e) => set("taxDisplay", e.target.value)}
              >
                <option value="separate">{ui.taxSeparate}</option>
                <option value="separate_on_invoice">{ui.taxSeparateOnInvoice}</option>
                <option value="included">{ui.taxIncluded}</option>
                <option value="exempt">{ui.taxExempt}</option>
              </select>
            </label>
            <label className="block text-[15px]">
              <span className="font-semibold">{ui.taxRounding}</span>
              <select
                className="field mt-2 bg-white"
                value={form.taxRounding}
                onChange={(e) => set("taxRounding", e.target.value)}
              >
                <option value="round_down">{ui.roundDown}</option>
                <option value="round_up">{ui.roundUp}</option>
                <option value="round_half">{ui.roundHalf}</option>
              </select>
            </label>
            {lineItemsTable}
          </div>
        )}

        {activeTab === "template" && (
          <div className="mt-10 max-w-[640px]">
            <label className="block">
              <span className="mb-2 block font-semibold">{ui.templateMessageLabel}</span>
              <textarea
                className="field min-h-[120px]"
                value={form.templateMessage}
                onChange={(e) => set("templateMessage", e.target.value)}
              />
            </label>
            {lineItemsTable}
          </div>
        )}
      </div>

      <DocumentBottomBar
        subtotalLabel={ui.subtotal}
        taxLabel={ui.tax}
        totalLabel={ui.total}
        saveLabel={ui.save}
        totals={totals}
        onSave={handleSave}
        pending={pending}
        error={error}
      />
    </SalesFlowShell>
  );
}
