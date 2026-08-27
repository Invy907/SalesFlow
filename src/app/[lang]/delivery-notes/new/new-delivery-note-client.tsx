"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { appHrefs } from "@/lib/app-hrefs";
import {
  DocumentBottomBar,
  ClientHonorificSelect,
  DocumentDateFieldRow,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  HonorificField as SharedHonorificField,
  SenderDetailFields,
  toIsoDate,
  useDocumentDateFields,
  type LineItemRow,
  type LineItemTotals,
} from "../../documents/new-document-shared";
import {
  clientHonorificSuffix,
  DEFAULT_CLIENT_HONORIFIC,
  type ClientHonorific,
} from "@/lib/documents/client-honorific";
import { DeliveryNotePreview, DeliveryNoteThumbnail } from "../../documents/document-previews";
import { OutputLanguageSelector } from "../../documents/output-language-selector";
import {
  normalizeDocumentOutputLocale,
  type DocumentOutputLocale,
} from "@/lib/documents/output-locale";
import { getDeliveryNoteContent } from "../content";
import { DocumentPreviewPanel } from "../../documents/document-live-preview";
import { buildDeliveryNoteDetailUi } from "@/lib/documents/build-detail-ui";
import { getDocumentPreviewPanelLabels } from "@/lib/documents/preview-panel-labels";
import type { TaxRounding } from "@/lib/tax";

type TabKey = "basic" | "recipient" | "tax" | "template";
type TemplateType = "standard" | "envelope" | null;

const TAX_ROUNDING_ORDER: TaxRounding[] = ["round_down", "round_up", "round_half"];

type PreviewForm = {
  clientName: string;
  documentNumber: string;
  subject: string;
  senderCompanyName: string;
  templateMessage: string;
  remarks: string;
  taxRounding: TaxRounding;
};

export function NewDeliveryNoteClient() {
  const { lang } = useLanguage();
  const ui = getDeliveryNoteContent(lang);
  const previewLabels = getDocumentPreviewPanelLabels(lang);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [selectedTemplate, setSelectedTemplate] = useState<"standard" | "envelope">("standard");
  const [previewModal, setPreviewModal] = useState<TemplateType>(null);
  const [outputLocale, setOutputLocale] = useState<DocumentOutputLocale>(() =>
    normalizeDocumentOutputLocale(undefined, lang),
  );
  const [clientHonorific, setClientHonorific] =
    useState<ClientHonorific>(DEFAULT_CLIENT_HONORIFIC);
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>([]);
  const { primaryDate, setPrimaryDate, secondaryDate, setSecondaryDate } = useDocumentDateFields(ui.issueDateValue);

  // 프리뷰에 그대로 반영해야 하는 입력만 상태로 들고 있는다.
  const [form, setForm] = useState<PreviewForm>({
    clientName: "",
    documentNumber: ui.deliveryNumberValue,
    subject: "",
    senderCompanyName: ui.companyValue,
    templateMessage: "",
    remarks: "",
    taxRounding: "round_down",
  });
  const set = <K extends keyof PreviewForm>(key: K, value: PreviewForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setLineItemTotals(next), []);

  const lineItemsTable = (
    <DocumentLineItemsTable
      ui={ui}
      storageKey="delivery-note-new-line-items"
      onTotalsChange={handleTotalsChange}
      onRowsChange={handleRowsChange}
    />
  );

  const tabs: { key: TabKey; label: string }[] = ui.newTabs.map(
    (label, index) => ({
      key: (["basic", "recipient", "tax", "template"] as TabKey[])[index],
      label,
    })
  );

  return (
    <SalesFlowShell
      activeItem="delivery-notes"
    >
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:py-10 lg:pb-32">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
            {ui.newTitle}
          </h1>
          <button
            type="button"
            onClick={() => setPreviewOpen((open) => !open)}
            className="ml-auto rounded border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {previewOpen ? previewLabels.hide : previewLabels.show}
          </button>
        </div>

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
                <SectionTitle title={ui.deliveryInfo} />
                <div className="mt-5 space-y-5">
                  <FormField label={ui.client} required={ui.required}>
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        value={form.clientName}
                        onChange={(e) => set("clientName", e.target.value)}
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
                  </FormField>

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
                        label: ui.deliveryDate,
                        value: secondaryDate,
                        onChange: setSecondaryDate,
                        placeholder: ui.noDate,
                      },
                    ]}
                  />

                  <FormField label={ui.deliveryNumber} required={ui.required}>
                    <p className="mb-2 text-sm text-cyan-600">{ui.deliveryHint}</p>
                    <input
                      className="field"
                      value={form.documentNumber}
                      onChange={(e) => set("documentNumber", e.target.value)}
                    />
                  </FormField>

                  <FormField label={ui.subject}>
                    <input
                      className="field"
                      maxLength={70}
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                    />
                    <div className="mt-1 text-right text-sm text-slate-400">
                      {form.subject.length}/70
                    </div>
                  </FormField>
                </div>
              </section>

              <section>
                <SectionTitle title={ui.senderInfo} />
                <div className="mt-5 space-y-5">
                  <FormField label={ui.companyName} required={ui.requiredLine}>
                    <input
                      className="field"
                      value={form.senderCompanyName}
                      onChange={(e) => set("senderCompanyName", e.target.value)}
                    />
                    <input className="field mt-2" />
                    <input className="field mt-2" />
                  </FormField>
                  <SenderDetailFields storagePrefix="deliverySender" buttonLabel={ui.detailLink} />
                </div>
              </section>
            </div>

            {lineItemsTable}
            <RemarksField ui={ui} value={form.remarks} onChange={(v) => set("remarks", v)} />
          </>
        )}

        {activeTab === "recipient" && (
          <>
            <div className="mt-10 max-w-[600px] space-y-5">
              <FormField label={ui.postalCode}>
                <div className="flex gap-3">
                  <input
                    className="field w-full max-w-[180px]"
                    placeholder={ui.postalCodePlaceholder}
                  />
                  <button className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    {ui.postalCodeLookup}
                  </button>
                </div>
              </FormField>

              <FormField label={ui.address}>
                <input className="field" />
                <input className="field mt-2" />
              </FormField>

              <FormField label={ui.recipientName}>
                <input className="field" placeholder={ui.companyNamePlaceholder} />
                <input className="field mt-2" placeholder={ui.departmentPlaceholder} />
                <input className="field mt-2" placeholder={ui.namePlaceholder} />
                <div className="mt-2 flex gap-2">
                  <input className="field flex-1" placeholder={ui.contactPlaceholder} />
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
              </FormField>
            </div>

            {lineItemsTable}
            <RemarksField ui={ui} value={form.remarks} onChange={(v) => set("remarks", v)} />
          </>
        )}

        {activeTab === "tax" && (
          <>
            <div className="mt-10 space-y-8">
              <section>
                <SectionTitle title={ui.taxSettings} />
                <div className="mt-5 space-y-3">
                  {[
                    ui.taxSeparate,
                    ui.taxSeparateOnInvoice,
                    ui.taxIncluded,
                    ui.taxExempt,
                  ].map((label, index) => (
                    <label
                      key={label}
                      className="flex items-center gap-3 text-[16px] text-slate-800"
                    >
                      <input
                        type="radio"
                        name="taxDisplay"
                        defaultChecked={index === 0}
                        className="h-4 w-4 accent-cyan-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <SectionTitle title={ui.taxRounding} />
                <p className="mt-3 text-sm text-slate-500">{ui.taxRoundingNote}</p>
                <div className="mt-4 space-y-3">
                  {[ui.roundDown, ui.roundUp, ui.roundHalf].map((label, index) => (
                    <label
                      key={label}
                      className="flex items-center gap-3 text-[16px] text-slate-800"
                    >
                      <input
                        type="radio"
                        name="taxRounding"
                        checked={form.taxRounding === TAX_ROUNDING_ORDER[index]}
                        onChange={() => set("taxRounding", TAX_ROUNDING_ORDER[index])}
                        className="h-4 w-4 accent-cyan-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            {lineItemsTable}

            <div className="mt-12">
              <label className="mb-2 block text-[18px] font-semibold text-slate-800">
                {ui.remarks}
              </label>
              <textarea
                className="field min-h-[140px]"
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-cyan-600" />
                  {ui.documentRemarks}
                </label>
                <div className="flex items-center gap-2">
                  <button className="text-cyan-600 underline">
                    {ui.documentSettings} ↗
                  </button>
                  <span className="text-slate-400">20以内 0/1000</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "template" && (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-[280px_1fr]">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setPreviewModal(selectedTemplate)}
                  className="w-full overflow-hidden rounded border border-slate-300 bg-white shadow-sm transition hover:shadow-md"
                >
                  <DeliveryNoteThumbnail
                    ui={ui}
                    outputLocale={outputLocale}
                    clientHonorific={clientHonorific}
                  />
                </button>
                <div className="rounded bg-[#14a7bb] px-6 py-2 text-[14px] font-semibold text-white">
                  {selectedTemplate === "standard" ? ui.templateStandard : ui.templateEnvelope}
                </div>
                <button
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
                  <Link href={appHrefs.settingsDocumentDefaults} className="text-cyan-600 underline">→ {ui.templateSettingsLink}</Link>
                </p>

                <div className="mt-6 space-y-5">
                  <OutputLanguageSelector
                    uiLocale={lang}
                    value={outputLocale}
                    onChange={setOutputLocale}
                  />

                  <label className="block">
                    <div className="mb-2 text-[16px] font-semibold text-slate-800">{ui.templateMessageLabel}</div>
                    <input
                      className="field"
                      placeholder={ui.templateMessagePlaceholder}
                      value={form.templateMessage}
                      onChange={(e) => set("templateMessage", e.target.value)}
                    />
                  </label>

                  <div>
                    <p className="mb-3 text-[16px] font-semibold text-slate-800">{ui.templateFieldsTitle}</p>
                    <div className="space-y-4">
                      {[
                        { label: ui.templateFieldItemName, limit: ui.templateFieldItemNameLimit, placeholder: ui.templateFieldItemName },
                        { label: ui.templateFieldQty, limit: ui.templateFieldQtyLimit, placeholder: ui.templateFieldQty },
                        { label: ui.templateFieldUnitPrice, limit: ui.templateFieldUnitPriceLimit, placeholder: ui.templateFieldUnitPrice },
                        { label: ui.templateFieldAmount, limit: ui.templateFieldAmountLimit, placeholder: ui.templateFieldAmount },
                      ].map((field) => (
                        <div key={field.label}>
                          <p className="mb-1 text-[15px] font-semibold text-slate-700">{field.label}</p>
                          <p className="mb-2 text-xs text-slate-400">{field.limit}</p>
                          <input className="field max-w-[320px]" placeholder={field.placeholder} />
                        </div>
                      ))}
                    </div>
                  </div>
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
              ui={buildDeliveryNoteDetailUi(outputLocale, getDeliveryNoteContent(outputLocale))}
              input={{
                documentNumber: form.documentNumber,
                clientName: form.clientName,
                clientHonorific,
                subject: form.subject,
                issueDate: toIsoDate(primaryDate),
                secondaryDate: secondaryDate ? toIsoDate(secondaryDate) : undefined,
                outputLocale,
                templateMessage: form.templateMessage,
                remarks: form.remarks,
                senderCompanyName: form.senderCompanyName,
                taxRounding: form.taxRounding,
                rows,
              }}
            />
          </aside>
        ) : null}
        </div>
      </div>

      {/* 템플릿 프리뷰 모달 */}
      {previewModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[680px] flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[20px] font-semibold text-slate-900">
                {previewModal === "standard" ? ui.templateStandard : ui.templateEnvelope}
              </h2>
              <button
                onClick={() => setPreviewModal(null)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <DeliveryNotePreview
                ui={ui}
                outputLocale={outputLocale}
                clientHonorific={clientHonorific}
              />
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setPreviewModal(null)}
                className="rounded border border-slate-300 px-8 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {ui.templateModalCancel}
              </button>
              <button
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

      <DocumentBottomBar
        subtotalLabel={ui.subtotal}
        taxLabel={ui.tax}
        totalLabel={ui.total}
        saveLabel={ui.save}
        totals={lineItemTotals}
      />
    </SalesFlowShell>
  );
}

function RemarksField({
  ui,
  value,
  onChange,
}: {
  ui: ReturnType<typeof getDeliveryNoteContent>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-12">
      <label className="mb-2 block text-[18px] font-semibold text-slate-800">
        {ui.remarks}
      </label>
      <textarea
        className="field min-h-[140px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
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
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-[16px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="rounded bg-[#f59b45] px-2 py-0.5 text-xs font-bold text-white">
            {required}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
