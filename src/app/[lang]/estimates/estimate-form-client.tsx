"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { ModalDialog } from "@/components/modal-dialog";
import { useLanguage } from "@/contexts/language-context";
import {
  DocumentBottomBar,
  SenderDetailFields,
  RecipientPostalCodeField,
  type SenderDetails,
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
import type { TaxRounding, TaxDisplay } from "@/lib/tax";
import { getSettingsContent } from "../settings/content";
import type { ClientOption } from "./estimate-form-data";
import type { ItemOption } from "../documents/new-document-shared";
import { nextAppliedSuggestionIds } from "@/components/ai-estimates/applied-suggestion-ids";
import { AiEstimatePanel } from "@/components/ai-estimates/ai-estimate-panel";
import { applyAiDraftToForm, isMeaningfulAiFormRow, type AiDraftApplyOptions } from "@/lib/ai/estimates/apply-draft";
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
  sender?: SenderDetails;
  showSeal?: boolean;
  sealUrl?: string | null;
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
  items = [],
}: {
  initial: EstimateFormInitial;
  clients: ClientOption[];
  items?: ItemOption[];
}) {
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const companyUi = getSettingsContent(lang).company;
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
  const [aiSuggestionIds, setAiSuggestionIds] = useState<string[]>([]);
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
          itemId: blank ? undefined : (r.itemId ?? undefined),
          name: blank ? "" : r.name,
          qty: blank ? 0 : r.qty.trim() === "" ? 1 : Number(r.qty.replace(/,/g, "")),
          unit: blank ? "" : r.unit,
          unitPrice: blank ? 0 : r.price === "" ? 0 : Number(r.price.replace(/,/g, "")),
          taxCategory,
          taxRateSnapshot: taxRateSnapshotFor(taxCategory),
          withholdingExempt: r.withholdingExempt,
        };
      });

      const payload = {
        aiSuggestionIds,
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
        showSeal: initial.showSeal !== false,
        templateMessage: form.templateMessage,
        remarks: form.remarks,
        recipientSnapshot: { ...form.recipient, clientName: form.clientName },
        senderSnapshot: { ...form.sender, companyName: form.senderCompanyName },
        lineItems,
      };

      const result = initial.id
        ? await updateEstimate(initial.id, payload)
        : await createEstimate(payload);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError([result.error, ...Object.values(result.fieldErrors ?? {})].filter(Boolean).join(" · "));
        return;
      }

      const id = initial.id ?? (result.data as string);
      try {
        if (!initial.id) window.localStorage.removeItem("estimate-new-line-items");
      } catch { /* Saving is successful even when browser storage is unavailable. */ }
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
      taxRounding={form.taxRounding as TaxRounding}
      taxDisplay={form.taxDisplay as TaxDisplay}
      documentType="estimate"
      onTotalsChange={handleTotalsChange}
      onRowsChange={handleRowsChange}
      compact={previewOpen}
      items={items}
    />
  );

  function applyAiDraft(draft: AiEstimateDraft, options: AiDraftApplyOptions, suggestionId: string) {
    if (pending) return { ok: false as const, error: "form_busy" };
    const nextIds = nextAppliedSuggestionIds(aiSuggestionIds, suggestionId, options);
    if (!nextIds) return { ok: false as const, error: "suggestion_limit" };
    const result = applyAiDraftToForm({ subject: form.subject, templateMessage: form.templateMessage, remarks: form.remarks, rows }, draft, options);
    if (!result.ok) return result;
    setForm((current) => ({ ...current, subject: result.value.subject, templateMessage: result.value.templateMessage, remarks: result.value.remarks }));
    if (options.lineIndexes.length) {
      setRows(result.value.rows);
      setRowReplacement((current) => ({ version: (current?.version ?? 0) + 1, rows: result.value.rows }));
    }
    setAiSuggestionIds(nextIds);
    setActiveTab("basic");
    return { ok: true as const };
  }

  return (
    <SalesFlowShell activeItem="estimates">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:py-10 lg:pb-32">
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
          taxMode={form.taxDisplay === "included" ? "included" : "excluded"}
          existingLineCount={rows.filter(isMeaningfulAiFormRow).length}
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
                    ? "border-[#1A7A57] font-semibold text-slate-900"
                    : "border-transparent",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={activeTab === "basic" ? "" : "hidden"}>
            <div className={`mt-10 grid gap-8 ${previewOpen ? "grid-cols-1" : "xl:grid-cols-2"}`}>
              <section>
                <h2 className="border-b border-slate-200 pb-3 text-xl font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-[24px]">
                  {ui.estimateInfo}
                </h2>
                <div className="mt-5 space-y-5">
                  <label className="block min-w-0">
                    <span className="mb-2 block text-[16px] font-semibold text-slate-800">
                      {ui.client}
                    </span>
                    <div className="flex gap-2">
                      <input
                        className="field min-w-0 flex-1"
                        list="estimate-client-options"
                        value={form.clientName}
                        onChange={(e) => {
                          const name = e.target.value;
                          const match = clients.find((c) => c.name === name);
                          setForm((f) => ({
                            ...f,
                            clientName: name,
                            clientId: match?.id ?? null,
                            recipient: match ? {
                              postalCode: match.postalCode ?? "",
                              addressLine1: match.addressLine1 ?? "",
                              addressLine2: match.addressLine2 ?? "",
                              companyName: match.name,
                              department: match.department ?? "",
                              name: "",
                              contact: "",
                            } : f.clientId ? {
                              postalCode: "", addressLine1: "", addressLine2: "",
                              companyName: name, department: "", name: "", contact: "",
                            } : f.recipient,
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
                  {err("expiryDate")}

                  <label className="block min-w-0">
                    <span className="mb-2 block text-[16px] font-semibold text-slate-800">
                      {ui.estimateNumber}
                    </span>
                    <input
                      className="field bg-slate-50 text-slate-500"
                      readOnly
                      value={form.documentNumber || ui.autoNumber}
                    />
                  </label>

                  <label className="block min-w-0">
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
                <h2 className="border-b border-slate-200 pb-3 text-xl font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-[24px]">
                  {ui.recipientInfo}
                </h2>
                <div className="mt-5 space-y-5">
                  <label className="block min-w-0">
                    <span className="mb-2 block text-[16px] font-semibold text-slate-800">
                      {ui.companyName}
                    </span>
                    <input
                      className="field"
                      value={form.senderCompanyName}
                      onChange={(e) => set("senderCompanyName", e.target.value)}
                    />
                  </label>
                  <SenderDetailFields storagePrefix="estimateSender" buttonLabel={ui.detailLink}
                    value={form.sender} onChange={(sender) => set("sender", sender)} />
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
        </div>

        {activeTab === "recipient" && (
          <>
            <div className="mt-10 max-w-[600px] space-y-5">
              <label className="block min-w-0">
                <span className="mb-2 block font-semibold">{ui.postalCode}</span>
                <RecipientPostalCodeField
                  postalCode={form.recipient.postalCode}
                  onPostalCodeChange={(value) => setRecipient("postalCode", value)}
                  onAddressResolved={({ postalCode, addressLine1 }) => setForm((current) => ({ ...current, recipient: { ...current.recipient, postalCode, addressLine1 } }))}
                  lookupLabel={companyUi.postalCodeLookup}
                  invalidMessage={companyUi.postalCodeInvalid}
                  notFoundMessage={companyUi.postalCodeLookupFailed}
                  networkErrorMessage={companyUi.postalCodeLookupNetworkError}
                />
              </label>
              <label className="block min-w-0">
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
              {([
                ["companyName", ui.companyNamePlaceholder],
                ["department", ui.departmentPlaceholder],
                ["name", ui.namePlaceholder],
                ["contact", ui.contactPlaceholder],
              ] as const).map(([key, label]) => (
                <label key={key} className="block min-w-0">
                  <span className="mb-2 block font-semibold">{label}</span>
                  <input className="field" value={form.recipient[key]} onChange={(event) => setRecipient(key, event.target.value)} />
                </label>
              ))}
            </div>
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
          </div>
        )}

        {activeTab === "template" && (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
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
                <div className="rounded bg-[#0A4D34] px-6 py-2 text-[14px] font-semibold text-white">
                  {selectedTemplate === "standard" ? ui.templateStandard : ui.templateEnvelope}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModal(selectedTemplate)}
                  className="text-[14px] text-[#0A4D34] underline"
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
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A4D34] underline"
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
                documentNumber: form.documentNumber || ui.autoNumber,
                clientName: form.clientName,
                clientHonorific,
                subject: form.subject,
                issueDate: toIsoDate(primaryDate),
                secondaryDate: secondaryDate ? toIsoDate(secondaryDate) : undefined,
                outputLocale,
                templateMessage: form.templateMessage,
                remarks: form.remarks,
                recipient: { ...form.recipient, section: form.recipient.name },
                senderCompanyName: form.senderCompanyName,
                senderPostalCode: form.sender?.postalCode,
                senderAddressLine1: form.sender?.addressLine1,
                senderAddressLine2: form.sender?.addressLine2,
                senderAddressLine3: form.sender?.addressLine3,
                senderTel: form.sender?.tel,
                senderFax: form.sender?.fax,
                senderEmail: form.sender?.email,
                senderRegistrationNumber: form.sender?.registrationNumber,
                showSeal: initial.showSeal !== false,
                sealUrl: initial.sealUrl,
                taxRounding: form.taxRounding as TaxRounding,
                taxDisplay: form.taxDisplay as TaxDisplay,
                documentType: "estimate",
                rows,
              }}
            />
          </aside>
        ) : null}
        </div>
      </div>

      <DocumentBottomBar
        taxDisplay={form.taxDisplay as TaxDisplay}
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
        <ModalDialog label={previewModal === "standard" ? ui.templateStandard : ui.templateEnvelope} onClose={() => setPreviewModal(null)} className="max-w-[680px]">
          <div className="relative flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="min-w-0 text-lg font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-[20px]">
                {previewModal === "standard" ? ui.templateStandard : ui.templateEnvelope}
              </h2>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                aria-label={lang === "ko" ? "닫기" : lang === "en" ? "Close" : "閉じる"}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
              <EstimatePreview
                ui={ui}
                outputLocale={outputLocale}
                clientHonorific={clientHonorific}
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="rounded border border-slate-300 px-4 py-3 text-sm sm:px-8 sm:text-[15px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {ui.templateModalCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(previewModal);
                  setPreviewModal(null);
                }}
                className="rounded bg-[#0A4D34] px-4 py-3 text-sm sm:px-8 sm:text-[15px] font-semibold text-white hover:bg-[#083D29]"
              >
                {ui.templateModalSelect}
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </SalesFlowShell>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <h2 className="text-xl font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-[24px]">{title}</h2>
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
    <div className="block min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[16px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="shrink-0 rounded bg-[#0A4D34] px-2 py-0.5 text-xs font-bold text-white">{required}</span>
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
