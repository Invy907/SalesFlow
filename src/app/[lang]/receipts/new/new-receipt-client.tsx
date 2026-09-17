"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
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
  RecipientPostalCodeField,
  SenderDetailFields,
  toIsoDate,
  useDocumentDateFields,
  type ItemOption,
  type LineItemRow,
  type LineItemTotals,
} from "../../documents/new-document-shared";
import {
  clientHonorificSuffix,
  DEFAULT_CLIENT_HONORIFIC,
  type ClientHonorific,
} from "@/lib/documents/client-honorific";
import { ReceiptPreview, ReceiptThumbnail } from "../../documents/document-previews";
import { OutputLanguageSelector } from "../../documents/output-language-selector";
import {
  normalizeDocumentOutputLocale,
  type DocumentOutputLocale,
} from "@/lib/documents/output-locale";
import { getReceiptContent } from "../content";
import { DocumentPreviewPanel } from "../../documents/document-live-preview";
import { buildReceiptDetailUi } from "@/lib/documents/build-detail-ui";
import { getDocumentPreviewPanelLabels } from "@/lib/documents/preview-panel-labels";
import { taxCategoryFromLabel, type TaxRounding } from "@/lib/tax";
import { createReceipt } from "@/lib/actions/receipts";
import type { ClientOptionRow } from "@/lib/db/clients";
import { getSettingsContent } from "../../settings/content";

type TabKey = "basic" | "recipient" | "tax" | "template";
type TemplateType = "standard" | "envelope" | null;

const TAX_ROUNDING_ORDER: TaxRounding[] = ["round_down", "round_up", "round_half"];

type RecipientState = {
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  companyName: string;
  department: string;
  contact: string;
  phone: string;
};

const EMPTY_RECIPIENT: RecipientState = {
  postalCode: "",
  addressLine1: "",
  addressLine2: "",
  companyName: "",
  department: "",
  contact: "",
  phone: "",
};

type PreviewForm = {
  clientId: string | null;
  clientName: string;
  documentNumber: string;
  subject: string;
  senderCompanyName: string;
  templateMessage: string;
  remarks: string;
  taxRounding: TaxRounding;
  recipient: RecipientState;
};

function isBlankLineRow(row: LineItemRow) {
  return !row.name && !row.qty && !row.unit && !row.price;
}

export function NewReceiptClient({
  clients = [],
  items = [],
}: {
  clients?: ClientOptionRow[];
  items?: ItemOption[];
}) {
  const { lang } = useLanguage();
  const ui = getReceiptContent(lang);
  const companyUi = getSettingsContent(lang).company;
  const previewLabels = getDocumentPreviewPanelLabels(lang);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [selectedTemplate, setSelectedTemplate] = useState<"standard" | "envelope">("standard");
  const [previewModal, setPreviewModal] = useState<TemplateType>(null);
  const [outputLocale, setOutputLocale] = useState<DocumentOutputLocale>(() =>
    normalizeDocumentOutputLocale(undefined),
  );
  const [clientHonorific, setClientHonorific] =
    useState<ClientHonorific>(DEFAULT_CLIENT_HONORIFIC);
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>([]);
  const { primaryDate, setPrimaryDate, secondaryDate, setSecondaryDate } = useDocumentDateFields(ui.issueDateValue);

  // 프리뷰에 그대로 반영해야 하는 입력만 상태로 들고 있는다.
  const [form, setForm] = useState<PreviewForm>({
    clientId: null,
    clientName: "",
    documentNumber: ui.receiptNumberValue,
    subject: "",
    senderCompanyName: ui.companyValue,
    templateMessage: "",
    remarks: "",
    taxRounding: "round_down",
    recipient: { ...EMPTY_RECIPIENT },
  });
  const set = <K extends keyof PreviewForm>(key: K, value: PreviewForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setRecipient = (key: keyof RecipientState, value: string) =>
    setForm((f) => ({ ...f, recipient: { ...f.recipient, [key]: value } }));

  const applyClient = useCallback((option: ClientOptionRow | null, typedName: string) => {
    setForm((f) => {
      if (!option) return { ...f, clientName: typedName, clientId: null };
      return {
        ...f,
        clientName: option.name,
        clientId: option.id,
        recipient: {
          ...f.recipient,
          postalCode: option.postalCode ?? "",
          addressLine1: option.addressLine1 ?? "",
          addressLine2: option.addressLine2 ?? "",
          companyName: option.name,
          department: option.department ?? "",
          contact: "",
          phone: option.phone ?? "",
        },
      };
    });
  }, []);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const lineItems = rows.map((r) => {
        const taxCategory = taxCategoryFromLabel(r.tax);
        return isBlankLineRow(r)
          ? { name: "", qty: 0, unit: "", unitPrice: 0, taxCategory, taxRateSnapshot: 0 }
          : {
              itemId: r.itemId ?? undefined,
              name: r.name,
              qty: r.qty === "" ? 1 : Number(r.qty),
              unit: r.unit,
              unitPrice: r.price === "" ? 0 : Number(r.price),
              taxCategory,
              taxRateSnapshot: 0,
            };
      });

      const result = await createReceipt({
        clientId: form.clientId,
        subject: form.subject,
        issueDate: new Date(toIsoDate(primaryDate)),
        transactionDate: secondaryDate ? new Date(toIsoDate(secondaryDate)) : null,
        taxDisplay: "separate",
        taxRounding: form.taxRounding,
        withholdingType: "none",
        templateKey: "standard",
        outputLocale,
        clientHonorific,
        showSeal: true,
        templateMessage: form.templateMessage,
        remarks: form.remarks,
        recipientSnapshot: form.recipient,
        lineItems,
      });

      if (result.ok) {
        router.push(`/${lang}/receipts/${result.data}`);
      } else {
        setError(result.error);
      }
    });
  }

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setLineItemTotals(next), []);

  const lineItemsTable = (
    <DocumentLineItemsTable
      ui={ui}
      storageKey="receipt-new-line-items"
      onTotalsChange={handleTotalsChange}
      onRowsChange={handleRowsChange}
      items={items}
    />
  );

  const tabs: { key: TabKey; label: string }[] = ui.newTabs.map(
    (label, index) => ({
      key: (["basic", "recipient", "tax", "template"] as TabKey[])[index],
      label,
    })
  );

  return (
    <SalesFlowShell activeItem="receipts">
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
                    ? "border-[#1A7A57] font-semibold text-slate-900"
                    : "border-transparent",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 基本情報 탭 */}
        {activeTab === "basic" && (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-2">
              <section>
                <SectionTitle title={ui.receiptInfo} />
                <div className="mt-5 space-y-5">
                  <FormField label={ui.client} required={ui.required}>
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        list="sf-receipt-client-options"
                        value={form.clientName}
                        onChange={(e) => {
                          const name = e.target.value;
                          applyClient(clients.find((c) => c.name === name) ?? null, name);
                        }}
                      />
                      <datalist id="sf-receipt-client-options">
                        {clients.map((c) => (
                          <option key={c.id} value={c.name} />
                        ))}
                      </datalist>
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
                        label: ui.transactionDate,
                        value: secondaryDate,
                        onChange: setSecondaryDate,
                        placeholder: ui.noDate,
                      },
                    ]}
                  />

                  <FormField label={ui.receiptNumber} required={ui.required}>
                    <p className="mb-2 text-sm text-[#0A4D34]">
                      {ui.receiptHint}{" "}
                      <Link href={appHrefs.supportInvoiceGuide} className="underline">↗</Link>
                    </p>
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
                  <SenderDetailFields storagePrefix="receiptSender" buttonLabel={ui.detailLink} />
                </div>
              </section>
            </div>

            {lineItemsTable}
            <RemarksField ui={ui} value={form.remarks} onChange={(v) => set("remarks", v)} />
          </>
        )}

        {/* 送付先 탭 */}
        {activeTab === "recipient" && (
          <div className="mt-10 max-w-[600px] space-y-5">
            <FormField label={ui.postalCode}>
              <RecipientPostalCodeField
                postalCode={form.recipient.postalCode}
                onPostalCodeChange={(v) => setRecipient("postalCode", v)}
                onAddressResolved={(addr) => {
                  setRecipient("postalCode", addr.postalCode);
                  setRecipient("addressLine1", addr.addressLine1);
                }}
                lookupLabel={ui.postalCodeLookup}
                placeholder={ui.postalCodePlaceholder}
                invalidMessage={companyUi.postalCodeInvalid}
                notFoundMessage={companyUi.postalCodeLookupFailed}
                networkErrorMessage={companyUi.postalCodeLookupNetworkError}
              />
            </FormField>

            <FormField label={ui.address}>
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
            </FormField>

            <FormField label={ui.recipientName}>
              <input
                className="field"
                placeholder={ui.companyNamePlaceholder}
                value={form.recipient.companyName}
                onChange={(e) => setRecipient("companyName", e.target.value)}
              />
              <input
                className="field mt-2"
                placeholder={ui.departmentPlaceholder}
                value={form.recipient.department}
                onChange={(e) => setRecipient("department", e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <input
                  className="field flex-1"
                  placeholder={ui.contactPlaceholder}
                  value={form.recipient.contact}
                  onChange={(e) => setRecipient("contact", e.target.value)}
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
          </div>
        )}

        {/* 課税設定 탭 */}
        {activeTab === "tax" && (
          <>
            <div className="mt-10 space-y-8">
              <section>
                <SectionTitle title={ui.taxSettingsTitle} />
                <div className="mt-4 space-y-3">
                  {[ui.taxSeparate, ui.taxIncluded, ui.taxExempt].map((label, index) => (
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                      <input type="radio" name="taxDisplay" defaultChecked={index === 0} className="h-4 w-4 accent-[#0A4D34]" />
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
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                      <input
                        type="radio"
                        name="taxRounding"
                        checked={form.taxRounding === TAX_ROUNDING_ORDER[index]}
                        onChange={() => set("taxRounding", TAX_ROUNDING_ORDER[index])}
                        className="h-4 w-4 accent-[#0A4D34]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <SectionTitle title={ui.withholdingTitle} />
                <p className="mt-2">
                  <Link href={appHrefs.supportInvoiceGuide} className="text-sm text-[#0A4D34] underline">{ui.withholdingLink} ↗</Link>
                </p>
                <div className="mt-4 space-y-3">
                  {[ui.withholdingNone, ui.withholdingWith, ui.withholdingWithout].map((label, index) => (
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                      <input type="radio" name="withholding" defaultChecked={index === 0} className="h-4 w-4 accent-[#0A4D34]" />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {/* テンプレート 탭 */}
        {activeTab === "template" && (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-[280px_1fr]">
              {/* 왼쪽: 템플릿 썸네일 */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setPreviewModal(selectedTemplate)}
                  className="w-full overflow-hidden rounded border border-slate-300 bg-white shadow-sm transition hover:shadow-md"
                >
                  <ReceiptThumbnail
                    ui={ui}
                    type={selectedTemplate}
                    outputLocale={outputLocale}
                    clientHonorific={clientHonorific}
                  />
                </button>
                <div className="rounded bg-[#0A4D34] px-6 py-2 text-[14px] font-semibold text-white">
                  {selectedTemplate === "standard" ? ui.templateStandard : ui.templateEnvelope}
                </div>
                <button
                  onClick={() => setPreviewModal(selectedTemplate)}
                  className="text-[14px] text-[#0A4D34] underline"
                >
                  {ui.templateChangeButton}
                </button>
              </div>

              {/* 오른쪽: 커스터마이즈 옵션 */}
              <div>
                <SectionTitle title={ui.templateTitle} />
                <p className="mt-2 text-sm text-slate-600">
                  {ui.templateNote}{" "}
                  <Link href={appHrefs.settingsDocumentDefaults} className="text-[#0A4D34] underline">→ {ui.templateSettingsLink}</Link>
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
          </>
        )}
        </div>

        {previewOpen ? (
          <aside className="min-w-0 2xl:sticky 2xl:top-6">
            <DocumentPreviewPanel
              uiLocale={lang}
              onClose={() => setPreviewOpen(false)}
              ui={buildReceiptDetailUi(outputLocale, getReceiptContent(outputLocale))}
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

      {error ? (
        <p className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-lg rounded border border-red-200 bg-red-50 px-4 py-2 text-center text-[14px] text-red-700">
          {error}
        </p>
      ) : null}

      <DocumentBottomBar
        subtotalLabel={ui.subtotal}
        taxLabel={ui.tax}
        totalLabel={ui.total}
        saveLabel={ui.save}
        totals={lineItemTotals}
        onSave={handleSave}
        pending={pending}
      />

      {/* 템플릿 미리보기 모달 */}
      {previewModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[680px] flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[20px] font-semibold text-slate-900">
                {previewModal === "standard" ? ui.templateStandard : ui.templateEnvelope}
              </h2>
              <button
                onClick={() => setPreviewModal(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <ReceiptPreview
                ui={ui}
                type={previewModal}
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
                className="rounded bg-[#0A4D34] px-8 py-3 text-[15px] font-semibold text-white hover:bg-[#083D29]"
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

function RemarksField({
  ui,
  value,
  onChange,
}: {
  ui: ReturnType<typeof getReceiptContent>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-12">
      <label className="mb-2 block text-[18px] font-semibold text-slate-800">{ui.remarks}</label>
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
          <span className="rounded bg-[#0A4D34] px-2 py-0.5 text-xs font-bold text-white">{required}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
