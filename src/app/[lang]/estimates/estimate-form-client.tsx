"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  DocumentBottomBar,
  DocumentDateFieldRow,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  ClientHonorificSelect,
  HonorificField as SharedHonorificField,
  type LineItemRow,
  type LineItemTotals,
} from "../documents/new-document-shared";
import {
  clientHonorificSuffix,
  DEFAULT_CLIENT_HONORIFIC,
  type ClientHonorific,
} from "@/lib/documents/client-honorific";
import { EstimatePreview, EstimateThumbnail } from "../documents/document-previews";
import { OutputLanguageSelector } from "../documents/output-language-selector";
import { createEstimate, updateEstimate } from "@/lib/actions/estimates";
import {
  normalizeDocumentOutputLocale,
  type DocumentOutputLocale,
} from "@/lib/documents/output-locale";
import {
  taxCategoryFromLabel,
  taxRateSnapshotFor,
} from "@/lib/tax";
import { toIsoDate } from "./date-field-utils";
import { getEstimateContent } from "./content";
import { DocumentPreviewPanel } from "../documents/document-live-preview";
import { buildEstimateDetailUi } from "@/lib/documents/build-detail-ui";
import { getDocumentPreviewPanelLabels } from "@/lib/documents/preview-panel-labels";
import type { TaxRounding } from "@/lib/tax";
import type { ClientOption } from "./estimate-form-data";
import { AiEstimatePanel } from "@/components/ai-estimates/ai-estimate-panel";
import { taxLabelFromCategory } from "@/lib/ai/estimates/normalize";
import type { AiEstimateDraft } from "@/lib/ai/estimates/schemas";

type TabKey = "basic" | "recipient" | "tax" | "template";
type TemplateType = "standard" | "envelope" | null;

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
  outputLocale?: DocumentOutputLocale;
  clientHonorific?: ClientHonorific;
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
  const previewLabels = getDocumentPreviewPanelLabels(lang);
  const router = useRouter();

  const isEdit = Boolean(initial.id);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [selectedTemplate, setSelectedTemplate] = useState<"standard" | "envelope">(
    initial.templateKey === "envelope" ? "envelope" : "standard",
  );
  const [previewModal, setPreviewModal] = useState<TemplateType>(null);
  const [outputLocale, setOutputLocale] = useState<DocumentOutputLocale>(() =>
    normalizeDocumentOutputLocale(initial.outputLocale),
  );
  const [clientHonorific, setClientHonorific] = useState<ClientHonorific>(
    initial.clientHonorific ?? DEFAULT_CLIENT_HONORIFIC,
  );
  const [totals, setTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>(initial.lines);
  const [rowReplacement, setRowReplacement] = useState<{ version: number; rows: LineItemRow[] } | undefined>();
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
    if (errors[key as string]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key as string];
        return next;
      });
    }
  };
  const setRecipient = (key: keyof EstimateFormInitial["recipient"], value: string) =>
    setForm((f) => ({ ...f, recipient: { ...f.recipient, [key]: value } }));

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setTotals(next), []);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      // A row that was added but left empty still becomes a blank line in the document.
      const lineItems = rows.map((r) => {
        const taxCategory = taxCategoryFromLabel(r.tax);
        const blank = isBlankLineRow(r);
        return {
          name: blank ? "" : r.name,
          qty: blank ? 0 : r.qty === "" ? 1 : Number(r.qty),
          unit: blank ? "" : r.unit,
          unitPrice: blank ? 0 : r.price === "" ? 0 : Number(r.price.replace(/,/g, "")),
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
        templateKey: selectedTemplate,
        outputLocale,
        clientHonorific,
        showSeal: true,
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
      key={`estimate-lines-${rowReplacement?.version ?? 0}`}
      ui={ui}
      storageKey={isEdit ? undefined : "estimate-new-line-items"}
      initialRows={rowReplacement?.rows ?? (isEdit ? initial.lines : undefined)}
      onTotalsChange={handleTotalsChange}
      onRowsChange={handleRowsChange}
    />
  );

  function applyAiDraft(draft: AiEstimateDraft) {
    const nextRows = draft.lines.map((line) => ({
      name: line.name,
      qty: String(line.qty),
      unit: line.unit,
      price: String(line.unitPrice),
      tax: taxLabelFromCategory(line.taxCategory),
    }));
    setForm((current) => ({
      ...current,
      subject: draft.subject || current.subject,
      templateMessage: draft.templateMessage || current.templateMessage,
      remarks: draft.remarks || current.remarks,
    }));
    setRows(nextRows);
    setRowReplacement((current) => ({ version: (current?.version ?? 0) + 1, rows: nextRows }));
    setActiveTab("basic");
  }

  return (
    <SalesFlowShell activeItem="estimates">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:py-10 lg:pb-32">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
            {isEdit ? ui.editAction : ui.newTitle}
          </h1>
          <button
            type="button"
            onClick={() => setPreviewOpen((open) => !open)}
            className="ml-auto rounded border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {previewOpen ? previewLabels.hide : previewLabels.show}
          </button>
        </div>

        <AiEstimatePanel
          clientId={form.clientId}
          clientName={form.clientName}
          subject={form.subject}
          onApply={applyAiDraft}
        />

        <div
          className={
            previewOpen ? "grid gap-8 2xl:grid-cols-[minmax(0,1fr)_600px] 2xl:items-start" : ""
          }
        >
        <div className="min-w-0">
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
                      {clientHonorific !== "none" ? (
                      <SharedHonorificField
                        honorific={clientHonorificSuffix(clientHonorific, outputLocale)}
                      />
                    ) : null}
                    </div>
                    <ClientHonorificSelect
                      value={clientHonorific}
                      onChange={setClientHonorific}
                      uiLocale={lang}
                      outputLocale={outputLocale}
                    />
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
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-[280px_1fr]">
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewModal(selectedTemplate)}
                  className="w-full overflow-hidden rounded border border-slate-300 bg-white shadow-sm transition hover:shadow-md"
                >
                  <EstimateThumbnail
                    ui={ui}
                    outputLocale={outputLocale}
                    clientHonorific={clientHonorific}
                  />
                </button>
                <div className="rounded bg-[#14a7bb] px-6 py-2 text-[14px] font-semibold text-white">
                  {selectedTemplate === "standard" ? ui.templateStandard : ui.templateEnvelope}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModal(selectedTemplate)}
                  className="text-[14px] text-cyan-600 underline"
                >
                  {ui.templateChangeButton}
                </button>
              </div>

              <div>
                <SectionTitle title={ui.templateTitle} />
                <p className="mt-2 text-sm text-slate-600">
                  {ui.templateNote}{" "}
                  <Link
                    href={`/${lang}/settings/document-defaults`}
                    className="text-cyan-600 underline"
                  >
                    ↗ {ui.templateSettingsLink}
                  </Link>
                </p>

                <div className="mt-6 space-y-5">
                  <OutputLanguageSelector
                    uiLocale={lang}
                    value={outputLocale}
                    onChange={setOutputLocale}
                  />

                  <FormField label={ui.templateMessageLabel}>
                    <input
                      className="field"
                      placeholder={ui.templateMessagePlaceholder}
                      value={form.templateMessage}
                      onChange={(e) => set("templateMessage", e.target.value)}
                    />
                  </FormField>

                  <p className="text-sm text-slate-500">{ui.templateFieldsMovedNote}</p>
                </div>
              </div>
            </div>

            {lineItemsTable}
          </>
        )}
        </div>

        {previewOpen ? (
          <aside className="min-w-0 2xl:sticky 2xl:top-6">
            <DocumentPreviewPanel
              uiLocale={lang}
              onClose={() => setPreviewOpen(false)}
              ui={buildEstimateDetailUi(outputLocale, getEstimateContent(outputLocale))}
              input={{
                documentNumber: form.documentNumber || ui.estimateHint,
                clientName: form.clientName,
                clientHonorific,
                subject: form.subject,
                issueDate: toIsoDate(primaryDate),
                secondaryDate: secondaryDate ? toIsoDate(secondaryDate) : undefined,
                outputLocale,
                templateMessage: form.templateMessage,
                remarks: form.remarks,
                senderCompanyName: form.senderCompanyName,
                taxRounding: form.taxRounding as TaxRounding,
                rows,
              }}
            />
          </aside>
        ) : null}
        </div>
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

      {previewModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[680px] flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[20px] font-semibold text-slate-900">
                {previewModal === "standard" ? ui.templateStandard : ui.templateEnvelope}
              </h2>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <EstimatePreview
                ui={ui}
                outputLocale={outputLocale}
                clientHonorific={clientHonorific}
              />
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="rounded border border-slate-300 px-8 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {ui.templateModalCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(previewModal);
                  setPreviewModal(null);
                }}
                className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white hover:bg-[#1096a8]"
              >
                {ui.templateModalSelect}
              </button>
            </div>
          </div>
        </div>
      )}
    </SalesFlowShell>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <h2 className="text-[24px] font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-2 flex items-center gap-2 text-[16px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="rounded bg-[#f59b45] px-2 py-0.5 text-xs font-bold text-white">{required}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** A row with no item name, qty, unit or price. Saved as a blank line. */
function isBlankLineRow(row: LineItemRow) {
  return (
    row.name.trim() === "" &&
    row.qty.trim() === "" &&
    row.unit.trim() === "" &&
    row.price.trim() === ""
  );
}
