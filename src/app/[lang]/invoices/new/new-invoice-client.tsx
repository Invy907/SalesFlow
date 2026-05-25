"use client";

import { useState } from "react";
import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
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
  type LineItemTotals,
} from "../../documents/new-document-shared";
import {
  InvoicePreview,
  InvoiceTemplateMiniPreview,
  InvoiceThumbnail,
} from "../../documents/document-previews";
import { getInvoiceContent } from "../content";

type Locale = "ja" | "ko" | "en";
type TabKey = "basic" | "recipient" | "payment" | "tax" | "template";
type TemplateKey = string;

export function NewInvoiceClient() {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("standard");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateKey | null>(null);
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const { primaryDate, setPrimaryDate, secondaryDate, setSecondaryDate } = useDocumentDateFields(ui.issueDateValue);

  const tabs: { key: TabKey; label: string }[] = ui.newTabs.map(
    (label, index) => ({
      key: (["basic", "recipient", "payment", "tax", "template"] as TabKey[])[index],
      label,
    })
  );

  return (
    <SalesFlowShell
      activeItem="invoices"
    >
      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-32">
        {/* 제목 + 가이드 링크 */}
        <div className="flex flex-wrap items-baseline gap-4">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">
            {ui.newTitle}
          </h1>
          <span className="flex items-center gap-1 rounded bg-cyan-600 px-2 py-0.5 text-xs font-bold text-white">
            ご案内
          </span>
          <Link
            href={getSupportHref(lang, "invoice-guide")}
            className="text-sm text-cyan-600 underline"
          >
            {ui.guideLink} ↗
          </Link>
        </div>

        {/* 탭 */}
        <div className="mt-8 flex gap-8 border-b border-slate-200 text-[18px] text-slate-500">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                "border-b-[3px] px-4 pb-3",
                activeTab === tab.key
                  ? "border-cyan-500 font-semibold text-slate-900"
                  : "border-transparent",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 基本情報 탭 */}
        {activeTab === "basic" && (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-2">
              <section>
                <SectionTitle title={ui.invoiceInfo} />
                <div className="mt-5 space-y-5">
                  <FormField label={ui.client} required={ui.required}>
                    <div className="flex gap-2">
                      <input className="field flex-1" />
                      <SharedHonorificField honorific={ui.companyHonorific} />
                    </div>
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
                      <a href="#" className="underline">↗</a>
                    </p>
                    <input className="field" defaultValue={ui.invoiceNumberValue} />
                  </FormField>

                  <FormField label={ui.subject}>
                    <input className="field" />
                    <div className="mt-1 text-right text-sm text-slate-400">0/70</div>
                  </FormField>

                  <div>
                    <a href="#" className="text-sm text-cyan-600 underline">
                      {ui.deliveryDateLink} ↗
                    </a>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle title={ui.senderInfo} />
                <div className="mt-5 space-y-5">
                  <FormField label={ui.companyName} required={ui.requiredLine}>
                    <input className="field" defaultValue={ui.companyValue} />
                    <input className="field mt-2" />
                    <input className="field mt-2" />
                  </FormField>
                  <SenderDetailFields storagePrefix="invoiceSender" buttonLabel={ui.detailLink} />
                </div>
              </section>
            </div>

            <DocumentLineItemsTable ui={ui} storageKey="invoice-new-line-items" onTotalsChange={setLineItemTotals} />
            <RemarksField ui={ui} />
          </>
        )}

        {/* 送付先 탭 */}
        {activeTab === "recipient" && (
          <>
            <p className="mt-8 text-sm text-slate-600">{ui.recipientAddressNote}</p>
            <div className="mt-6 grid gap-8 xl:grid-cols-2">
              <section className="space-y-5">
                <FormField label={ui.postalCode}>
                  <div className="flex gap-3">
                    <input
                      className="field w-[180px]"
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
                  <p className="mb-2 text-xs text-slate-500 whitespace-pre-line">
                    {ui.recipientNameNote}
                  </p>
                  <input className="field" placeholder={ui.companyNamePlaceholder} />
                  <input className="field mt-2" placeholder={ui.departmentPlaceholder} />
                  <input className="field mt-2" placeholder={ui.sectionPlaceholder} />
                  <div className="mt-2 flex gap-2">
                    <input className="field flex-1" placeholder={ui.contactPlaceholder} />
                    <SharedHonorificField honorific={ui.companyHonorific} />
                  </div>
                </FormField>

                <div>
                  <a href="#" className="text-sm text-cyan-600 underline">
                    {ui.billingMonthLink} ↗
                  </a>
                </div>
              </section>

              {/* 봉투 주소 인쇄 이미지 */}
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

            <DocumentLineItemsTable ui={ui} storageKey="invoice-new-line-items" onTotalsChange={setLineItemTotals} />
            <RemarksField ui={ui} />
          </>
        )}

        {/* 決済設定 탭 */}
        {activeTab === "payment" && (
          <>
            <div className="mt-10 space-y-8">
              <section>
                <SectionTitle title={ui.paymentSettingsTitle} />
                <p className="mt-3 text-sm text-slate-500">{ui.paymentSettingsNote}</p>
                <div className="mt-4 space-y-4">
                  <label className="flex items-start gap-3 text-[16px] text-slate-800">
                    <input
                      type="radio"
                      name="paymentOption"
                      defaultChecked
                      className="mt-1 h-4 w-4 accent-cyan-600"
                    />
                    <span>{ui.paymentNone}</span>
                  </label>

                  <label className="flex items-start gap-3 text-[16px] text-slate-800">
                    <input
                      type="radio"
                      name="paymentOption"
                      className="mt-1 h-4 w-4 accent-cyan-600"
                    />
                    <div>
                      <span>{ui.paymentCard}</span>
                      <p className="mt-1 text-sm text-slate-500">
                        {ui.paymentCardDesc}{" "}
                        <a href="#" className="text-cyan-600 underline">
                          → {ui.settingsLink}
                        </a>
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 text-[16px] text-slate-800">
                    <input
                      type="radio"
                      name="paymentOption"
                      className="mt-1 h-4 w-4 accent-cyan-600"
                    />
                    <div>
                      <span>{ui.paymentPay}</span>
                      <p className="mt-1 text-sm text-slate-500">
                        {ui.paymentPayDesc}{" "}
                        <a href="#" className="text-cyan-600 underline">
                          → {ui.settingsLink}
                        </a>
                      </p>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            <div className="mt-6">
              <a href="#" className="text-sm text-cyan-600 underline">
                {ui.deliveryDateLink} ↗
              </a>
            </div>

            <DocumentLineItemsTable ui={ui} storageKey="invoice-new-line-items" onTotalsChange={setLineItemTotals} />

            <div className="mt-12">
              <label className="mb-2 block text-[18px] font-semibold text-slate-800">
                {ui.remarks}
              </label>
              <textarea className="field min-h-[140px]" />
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

            {/* お振込先 */}
            <div className="mt-8">
              <SectionTitle title={ui.bankTransferTitle} />
              <p className="mt-2 text-sm text-slate-500">{ui.bankTransferNote}</p>
              <button className="mt-3 text-[15px] font-medium text-cyan-600">
                {ui.addBankAccount}
              </button>
            </div>
          </>
        )}

        {/* 課税設定 탭 */}
        {activeTab === "tax" && (
          <>
            <div className="mt-6">
              <p className="text-sm text-slate-600">
                {ui.taxSettingsNote}{" "}
                <a href="#" className="text-cyan-600 underline">
                  → {ui.taxSettingsLink}
                </a>
              </p>
            </div>

            <div className="mt-8 space-y-8">
              <section>
                <SectionTitle title={ui.taxSettingsTitle} />
                <div className="mt-4 space-y-3">
                  {[ui.taxSeparate, ui.taxIncluded, ui.taxExempt].map(
                    (label, index) => (
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
                    )
                  )}
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
                        defaultChecked={index === 0}
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
                  <a href="#" className="text-sm text-cyan-600 underline">
                    {ui.withholdingLink} ↗
                  </a>
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    ui.withholdingNone,
                    ui.withholdingWith,
                    ui.withholdingWithout,
                  ].map((label, index) => (
                    <label
                      key={label}
                      className="flex items-center gap-3 text-[16px] text-slate-800"
                    >
                      <input
                        type="radio"
                        name="withholding"
                        defaultChecked={index === 0}
                        className="h-4 w-4 accent-cyan-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-6">
              <a href="#" className="text-sm text-cyan-600 underline">
                {ui.deliveryDateLink} ↗
              </a>
            </div>

            <DocumentLineItemsTable ui={ui} storageKey="invoice-new-line-items" onTotalsChange={setLineItemTotals} />

            <div className="mt-12">
              <label className="mb-2 block text-[18px] font-semibold text-slate-800">
                {ui.remarks}
              </label>
              <textarea className="field min-h-[140px]" />
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

            {/* お振込先 */}
            <div className="mt-8">
              <SectionTitle title={ui.bankTransferTitle} />
              <p className="mt-2 text-sm text-slate-500">{ui.bankTransferNote}</p>
              <button className="mt-3 text-[15px] font-medium text-cyan-600">
                {ui.addBankAccount}
              </button>
            </div>
          </>
        )}

        {/* テンプレート 탭 */}
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
                  <a href="#" className="text-cyan-600 underline">→ {ui.templateSettingsLink}</a>
                </p>

                <div className="mt-6 space-y-5">
                  <label className="block">
                    <div className="mb-2 text-[16px] font-semibold text-slate-800">{ui.templateMessageLabel}</div>
                    <input className="field" placeholder={ui.templateMessagePlaceholder} />
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

            <DocumentLineItemsTable ui={ui} storageKey="invoice-new-line-items" onTotalsChange={setLineItemTotals} />
          </>
        )}
      </div>

      {/* 9종 템플릿 갤러리 모달 */}
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

      {/* 단일 템플릿 프리뷰 모달 */}
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
      />
    </SalesFlowShell>
  );
}

function RemarksField({ ui }: { ui: ReturnType<typeof getInvoiceContent> }) {
  return (
    <div className="mt-12">
      <label className="mb-2 block text-[18px] font-semibold text-slate-800">
        {ui.remarks}
      </label>
      <textarea className="field min-h-[140px]" />
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
