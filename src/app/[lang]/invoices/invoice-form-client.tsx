"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { appHrefs } from "@/lib/app-hrefs";
import { getSupportHref } from "@/app/[lang]/support/content";
import { useLanguage } from "@/contexts/language-context";
import {
  DocumentBottomBar,
  DocumentDateFieldRow,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  HonorificField as SharedHonorificField,
  SenderDetailFields,
  useDocumentDateFields,
  type LineItemRow,
  type LineItemTotals,
} from "../documents/new-document-shared";
import { createInvoice } from "@/lib/actions/invoices";
import { taxCategoryFromLabel, taxRateSnapshotFor } from "@/lib/tax";
import {
  InvoicePreview,
  InvoiceTemplateMiniPreview,
  InvoiceThumbnail,
} from "../documents/document-previews";
import { getInvoiceContent } from "./content";

type TabKey = "basic" | "recipient" | "payment" | "tax" | "template";
type TemplateKey = string;
type TaxDisplayMode = "separate" | "separate_on_invoice" | "included" | "exempt";
type TaxRounding = "round_down" | "round_up" | "round_half";
type WithholdingType = "none" | "with_recovery" | "without_recovery";

const TAB_KEYS: TabKey[] = ["basic", "recipient", "payment", "tax", "template"];
// 화면 라디오 순서 ↔ DB enum
const TAX_DISPLAY_ORDER: Exclude<TaxDisplayMode, "separate_on_invoice">[] = [
  "separate",
  "included",
  "exempt",
];
const TAX_ROUNDING_ORDER: TaxRounding[] = ["round_down", "round_up", "round_half"];
const WITHHOLDING_ORDER: WithholdingType[] = ["none", "with_recovery", "without_recovery"];

export type InvoiceFormInitial = {
  clientId: string | null;
  clientName: string;
  issueDate: string;
  paymentDue: string;
  documentNumber: string;
  subject: string;
  senderCompanyName: string;
  billingMonth: string;
  taxDisplay: TaxDisplayMode;
  taxRounding: TaxRounding;
  withholdingType: WithholdingType;
  templateKey: string;
  templateMessage: string;
  remarks: string;
  bankAccountIds: string[];
  lines: LineItemRow[];
};

export type InvoiceClientOption = { id: string; name: string };
export type InvoiceBankAccount = { id: string; label: string };

export function InvoiceFormClient({
  initial,
  clients,
  bankAccounts,
}: {
  initial: InvoiceFormInitial;
  clients: InvoiceClientOption[];
  bankAccounts: InvoiceBankAccount[];
}) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>(initial.templateKey || "standard");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateKey | null>(null);
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>(initial.lines);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { primaryDate, setPrimaryDate, secondaryDate, setSecondaryDate } = useDocumentDateFields(
    initial.issueDate || ui.issueDateValue,
  );

  const [form, setForm] = useState({
    clientId: initial.clientId,
    clientName: initial.clientName,
    subject: initial.subject,
    senderCompanyName: initial.senderCompanyName,
    billingMonth: initial.billingMonth,
    recipient: {
      postalCode: "",
      addressLine1: "",
      addressLine2: "",
      companyName: "",
      department: "",
      section: "",
      contact: "",
    },
    taxDisplay: initial.taxDisplay === "separate_on_invoice" ? "separate" : initial.taxDisplay,
    taxRounding: initial.taxRounding,
    withholdingType: initial.withholdingType,
    templateMessage: initial.templateMessage,
    remarks: initial.remarks,
    bankAccountIds: initial.bankAccountIds,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key as string];
        return next;
      });
    }
  };
  const setRecipient = (key: keyof (typeof form)["recipient"], value: string) =>
    setForm((f) => ({ ...f, recipient: { ...f.recipient, [key]: value } }));

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setLineItemTotals(next), []);

  const tabs = useMemo(
    () => TAB_KEYS.map((key, index) => ({ key, label: ui.newTabs[index] })),
    [ui.newTabs],
  );

  const err = (key: string) =>
    errors[key] ? <p className="mt-1 text-[13px] text-red-600">{errors[key]}</p> : null;

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

      const result = await createInvoice({
        clientId: form.clientId,
        subject: form.subject,
        issueDate: new Date(toIsoDate(primaryDate)),
        paymentDue: secondaryDate ? new Date(toIsoDate(secondaryDate)) : null,
        billingMonth: form.billingMonth || undefined,
        taxDisplay: form.taxDisplay,
        taxRounding: form.taxRounding,
        withholdingType: form.withholdingType,
        templateKey: selectedTemplate,
        templateMessage: form.templateMessage,
        remarks: form.remarks,
        bankAccountIds: form.bankAccountIds,
        recipientSnapshot: { ...form.recipient, clientName: form.clientName },
        senderSnapshot: { companyName: form.senderCompanyName },
        lineItems,
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("invoice-new-line-items");
      }
      router.push(`/${lang}/invoices`);
      router.refresh();
    });
  }

  return (
    <SalesFlowShell activeItem="invoices">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:py-10 lg:pb-32">
        <div className="flex flex-wrap items-baseline gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
            {ui.newTitle}
          </h1>
          <span className="flex items-center gap-1 rounded bg-cyan-600 px-2 py-0.5 text-xs font-bold text-white">
            {ui.draftBadge}
          </span>
          <Link href={getSupportHref(lang, "invoice-guide")} className="text-sm text-cyan-600 underline">
            {ui.guideLink}
          </Link>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="mt-8 flex min-w-max gap-4 border-b border-slate-200 text-base text-slate-500 sm:gap-8 sm:text-[18px]">
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
                <SectionTitle title={ui.invoiceInfo} />
                <div className="mt-5 space-y-5">
                  <FormField label={ui.client} required={ui.required}>
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        list="sf-invoice-client-options"
                        value={form.clientName}
                        onChange={(e) => {
                          const name = e.target.value;
                          const match = clients.find((c) => c.name === name);
                          setForm((f) => ({ ...f, clientName: name, clientId: match?.id ?? null }));
                        }}
                      />
                      <SharedHonorificField honorific={ui.companyHonorific} />
                    </div>
                    <datalist id="sf-invoice-client-options">
                      {clients.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                    {err("clientId")}
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
                        label: ui.paymentDue,
                        value: secondaryDate,
                        onChange: setSecondaryDate,
                        placeholder: ui.noDate,
                      },
                    ]}
                  />

                  <FormField label={ui.invoiceNumber} required={ui.required}>
                    <p className="mb-2 text-sm text-cyan-600">
                      {ui.invoiceHint}{" "}
                      <Link href={appHrefs.settingsDocumentDefaults} className="underline">
                        {ui.settingsLink}
                      </Link>
                    </p>
                    <input
                      className="field bg-slate-50 text-slate-500"
                      readOnly
                      value={ui.autoNumber}
                    />
                  </FormField>

                  <FormField label={ui.subject}>
                    <input
                      className="field"
                      maxLength={70}
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                    />
                    <div className="mt-1 text-right text-sm text-slate-400">{form.subject.length}/70</div>
                    {err("subject")}
                  </FormField>

                  <div>
                    <Link href={appHrefs.settingsDocumentDefaults} className="text-sm text-cyan-600 underline">
                      {ui.deliveryDateLink} ↗
                    </Link>
                  </div>
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
                  </FormField>
                  <SenderDetailFields storagePrefix="invoiceSender" buttonLabel={ui.detailLink} />
                </div>
              </section>
            </div>

            <DocumentLineItemsTable
              ui={ui}
              storageKey="invoice-new-line-items"
              onTotalsChange={handleTotalsChange}
              onRowsChange={handleRowsChange}
            />
            <RemarksBlock ui={ui} value={form.remarks} onChange={(v) => set("remarks", v)} simple />
          </>
        )}

        {activeTab === "recipient" && (
          <>
            <p className="mt-8 text-sm text-slate-600">{ui.recipientAddressNote}</p>
            <div className="mt-6 grid gap-8 xl:grid-cols-2">
              <section className="space-y-5">
                <FormField label={ui.postalCode}>
                  <input
                    className="field w-full max-w-[180px]"
                    placeholder={ui.postalCodePlaceholder}
                    value={form.recipient.postalCode}
                    onChange={(e) => setRecipient("postalCode", e.target.value)}
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
                  <p className="mb-2 whitespace-pre-line text-xs text-slate-500">
                    {ui.recipientNameNote}
                  </p>
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
                  <input
                    className="field mt-2"
                    placeholder={ui.sectionPlaceholder}
                    value={form.recipient.section}
                    onChange={(e) => setRecipient("section", e.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
                    <input
                      className="field flex-1"
                      placeholder={ui.contactPlaceholder}
                      value={form.recipient.contact}
                      onChange={(e) => setRecipient("contact", e.target.value)}
                    />
                    <SharedHonorificField honorific={ui.companyHonorific} />
                  </div>
                </FormField>

                <FormField label={ui.billingMonthLabel}>
                  <input
                    className="field max-w-[200px]"
                    type="month"
                    value={form.billingMonth}
                    onChange={(e) => set("billingMonth", e.target.value)}
                  />
                  {err("billingMonth")}
                </FormField>
              </section>

              <section>
                <div className="rounded border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    {ui.envelopePreviewTitle}
                  </p>
                  <div className="flex min-h-[200px] items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[13px] text-slate-300">
                    {ui.envelopePreviewTitle}
                  </div>
                </div>
              </section>
            </div>

            <DocumentLineItemsTable
              ui={ui}
              storageKey="invoice-new-line-items"
              onTotalsChange={handleTotalsChange}
              onRowsChange={handleRowsChange}
            />
            <RemarksBlock ui={ui} value={form.remarks} onChange={(v) => set("remarks", v)} simple />
          </>
        )}

        {activeTab === "payment" && (
          <>
            <div className="mt-10 space-y-8">
              <section>
                <SectionTitle title={ui.bankTransferTitle} />
                <p className="mt-2 text-sm text-slate-500">{ui.bankTransferNote}</p>

                {bankAccounts.length === 0 ? (
                  <p className="mt-4 text-[15px] text-slate-500">
                    {ui.noBankAccount}{" "}
                    <Link href={appHrefs.settingsPayment} className="text-cyan-600 underline">
                      {ui.addBankAccount} ↗
                    </Link>
                  </p>
                ) : (
                  <>
                    <div className="mt-4 space-y-3">
                      {bankAccounts.map((account) => (
                        <label
                          key={account.id}
                          className="flex items-start gap-3 text-[16px] text-slate-800"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-cyan-600"
                            checked={form.bankAccountIds.includes(account.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.bankAccountIds, account.id]
                                : form.bankAccountIds.filter((id) => id !== account.id);
                              set("bankAccountIds", next.slice(0, 3));
                            }}
                          />
                          <span>{account.label}</span>
                        </label>
                      ))}
                    </div>
                    {err("bankAccountIds")}
                    <p className="mt-3">
                      <Link href={appHrefs.settingsPayment} className="text-sm text-cyan-600 underline">
                        {ui.addBankAccount} ↗
                      </Link>
                    </p>
                  </>
                )}
              </section>
            </div>

            <DocumentLineItemsTable
              ui={ui}
              storageKey="invoice-new-line-items"
              onTotalsChange={handleTotalsChange}
              onRowsChange={handleRowsChange}
            />

            <RemarksBlock
              ui={ui}
              value={form.remarks}
              onChange={(v) => set("remarks", v)}
            />
          </>
        )}

        {activeTab === "tax" && (
          <>
            <div className="mt-6">
              <p className="text-sm text-slate-600">
                {ui.taxSettingsNote}{" "}
                <Link href={appHrefs.settingsDocumentDefaults} className="text-cyan-600 underline">
                  ↗ {ui.taxSettingsLink}
                </Link>
              </p>
            </div>

            <div className="mt-8 space-y-8">
              <section>
                <SectionTitle title={ui.taxSettingsTitle} />
                <div className="mt-4 space-y-3">
                  {[ui.taxSeparate, ui.taxIncluded, ui.taxExempt].map((label, index) => (
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                      <input
                        type="radio"
                        name="taxDisplay"
                        checked={form.taxDisplay === TAX_DISPLAY_ORDER[index]}
                        onChange={() => set("taxDisplay", TAX_DISPLAY_ORDER[index])}
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
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
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

              <section>
                <SectionTitle title={ui.withholdingTitle} />
                <p className="mt-2">
                  <Link href={getSupportHref(lang, "invoice-guide")} className="text-sm text-cyan-600 underline">
                    {ui.withholdingLink} ↗
                  </Link>
                </p>
                <div className="mt-4 space-y-3">
                  {[ui.withholdingNone, ui.withholdingWith, ui.withholdingWithout].map((label, index) => (
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                      <input
                        type="radio"
                        name="withholding"
                        checked={form.withholdingType === WITHHOLDING_ORDER[index]}
                        onChange={() => set("withholdingType", WITHHOLDING_ORDER[index])}
                        className="h-4 w-4 accent-cyan-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-6">
              <Link href={appHrefs.settingsDocumentDefaults} className="text-sm text-cyan-600 underline">
                {ui.deliveryDateLink} ↗
              </Link>
            </div>

            <DocumentLineItemsTable
              ui={ui}
              storageKey="invoice-new-line-items"
              onTotalsChange={handleTotalsChange}
              onRowsChange={handleRowsChange}
            />

            <RemarksBlock ui={ui} value={form.remarks} onChange={(v) => set("remarks", v)} />
          </>
        )}

        {activeTab === "template" && (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-[280px_1fr]">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setGalleryOpen(true)}
                  className="w-full overflow-hidden rounded border border-slate-300 bg-white shadow-sm transition hover:shadow-md"
                >
                  <InvoiceThumbnail ui={ui} />
                </button>
                <div className="rounded bg-[#14a7bb] px-6 py-2 text-[14px] font-semibold text-white">
                  {ui.templateList.find((t) => t.key === selectedTemplate)?.name ?? ui.templateList[0].name}
                </div>
                <button
                  onClick={() => setGalleryOpen(true)}
                  className="text-[14px] text-cyan-600 underline"
                >
                  {ui.templateChangeButton}
                </button>
              </div>

              <div>
                <SectionTitle title={ui.templateTitle} />
                <p className="mt-2 text-sm text-slate-600">
                  {ui.templateNote}{" "}
                  <Link href={appHrefs.settingsDocumentDefaults} className="text-cyan-600 underline">
                    ↗ {ui.templateSettingsLink}
                  </Link>
                </p>

                <div className="mt-6 space-y-5">
                  <label className="block">
                    <div className="mb-2 text-[16px] font-semibold text-slate-800">{ui.templateMessageLabel}</div>
                    <input
                      className="field"
                      placeholder={ui.templateMessagePlaceholder}
                      value={form.templateMessage}
                      onChange={(e) => set("templateMessage", e.target.value)}
                    />
                  </label>

                  <p className="text-sm text-slate-500">{ui.templateFieldsMovedNote}</p>
                </div>
              </div>
            </div>

            <DocumentLineItemsTable
              ui={ui}
              storageKey="invoice-new-line-items"
              onTotalsChange={handleTotalsChange}
              onRowsChange={handleRowsChange}
            />
          </>
        )}
      </div>

      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[820px] flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[20px] font-semibold text-slate-900">{ui.templateChangeTitle}</h2>
              <button
                onClick={() => setGalleryOpen(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-4">
                {ui.templateList.map((tmpl) => (
                  <button
                    key={tmpl.key}
                    onClick={() => setPreviewTemplate(tmpl.key)}
                    className={[
                      "flex flex-col overflow-hidden rounded border-2 transition hover:shadow-md",
                      selectedTemplate === tmpl.key ? "border-cyan-500" : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex-1 bg-white">
                      <InvoiceTemplateMiniPreview ui={ui} />
                    </div>
                    <div className="bg-slate-700 px-2 py-2 text-center text-[12px] font-semibold text-white">
                      {tmpl.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setGalleryOpen(false)}
                className="rounded border border-slate-300 px-8 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {ui.templateModalCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTemplate !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[680px] flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[20px] font-semibold text-slate-900">
                {ui.templateList.find((t) => t.key === previewTemplate)?.name}
              </h2>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <InvoicePreview ui={ui} />
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded border border-slate-300 px-8 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {ui.templateModalCancel}
              </button>
              <button
                onClick={() => {
                  setSelectedTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  setGalleryOpen(false);
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
        onSave={handleSave}
        pending={pending}
        error={error}
      />
    </SalesFlowShell>
  );
}
function RemarksBlock({
  ui,
  value,
  onChange,
  simple = false,
}: {
  ui: ReturnType<typeof getInvoiceContent>;
  value: string;
  onChange: (value: string) => void;
  simple?: boolean;
}) {
  return (
    <div className="mt-12">
      <label className="mb-2 block text-[18px] font-semibold text-slate-800">{ui.remarks}</label>
      <textarea
        className="field min-h-[140px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {simple ? null : (
        <div className="mt-2 flex items-center justify-end text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Link href={appHrefs.settingsDocumentDefaults} className="text-cyan-600 underline">
              {ui.documentSettings} ↗
            </Link>
            <span className="text-slate-400">{value.length}/1000</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** 화면의 YYYY/MM/DD → DB 의 YYYY-MM-DD */
function toIsoDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (!m) return trimmed;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
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
