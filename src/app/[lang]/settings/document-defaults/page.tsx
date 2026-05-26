"use client";

import {
  DeliveryNoteThumbnail,
  EstimateThumbnail,
  InvoiceThumbnail,
  ReceiptThumbnail,
} from "../../documents/document-previews";
import { getDeliveryNoteContent } from "../../delivery-notes/content";
import { getEstimateContent } from "../../estimates/content";
import { getInvoiceContent } from "../../invoices/content";
import { getReceiptContent } from "../../receipts/content";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
  SettingsInlineField,
  SettingsSaveBar,
  SettingsSectionHeader,
  SettingsSubNav,
  SettingsTemplateBlock,
} from "../settings-shared";

export default function SettingsDocumentDefaultsPage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const doc = ui.documentDefaults;
  const estimateUi = getEstimateContent(lang);
  const deliveryUi = getDeliveryNoteContent(lang);
  const invoiceUi = getInvoiceContent(lang);
  const receiptUi = getReceiptContent(lang);

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="document-defaults" />

      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-24 lg:px-8 lg:py-10 lg:pb-28">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{doc.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{doc.intro}</p>

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={doc.commonSection} />
            <div className="px-6 py-6">
              <h3 className="text-[18px] font-semibold text-slate-900">{doc.numberingTitle}</h3>
              <p className="mt-2 text-sm text-slate-500">{doc.numberingDesc}</p>
              <div className="mt-4 max-w-[640px]">
                <input className="field font-mono text-[15px]" defaultValue="{Y}{M}{D}-{連番:M,3}" />
                <p className="mt-3 text-sm font-medium text-slate-600">{doc.numberingPreview}</p>
                <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700">
                  20260525-001
                </div>
              </div>

              <div className="mt-10 border-t border-slate-200 pt-8">
                <h3 className="text-[18px] font-semibold text-slate-900">{doc.lineItemsTitle}</h3>
                <SettingsInlineField
                  label={doc.lineItemPlaceholders.name}
                  hint={doc.lineItemHints.name}
                  placeholder={doc.lineItemPlaceholders.name}
                  defaultValue={doc.lineItemPlaceholders.name}
                />
                <SettingsInlineField
                  label={doc.lineItemPlaceholders.qty}
                  hint={doc.lineItemHints.qty}
                  placeholder={doc.lineItemPlaceholders.qty}
                  defaultValue={doc.lineItemPlaceholders.qty}
                />
                <SettingsInlineField
                  label={doc.lineItemPlaceholders.price}
                  hint={doc.lineItemHints.price}
                  placeholder={doc.lineItemPlaceholders.price}
                  defaultValue={doc.lineItemPlaceholders.price}
                />
                <SettingsInlineField
                  label={doc.lineItemPlaceholders.amount}
                  hint={doc.lineItemHints.amount}
                  placeholder={doc.lineItemPlaceholders.amount}
                  defaultValue={doc.lineItemPlaceholders.amount}
                />
              </div>
            </div>
          </section>

          <DocumentTypeSection
            sectionTitle={doc.sections.estimate}
            templateLabel={doc.template}
            standardLabel={doc.templateStandard}
            changeLabel={doc.changeTemplate}
            customizeTitle={doc.customizeTitle}
            customizeDesc={doc.customizeDesc}
            customizeLink={doc.customizeLink}
            preview={<EstimateThumbnail ui={estimateUi} />}
            headingLabel={doc.heading}
            headingOptions={[doc.estimateTitle, doc.estimateTitleAlt]}
            messageLabel={doc.message}
            messageDefault={doc.estimateMessage}
            remarksLabel={doc.estimateRemarks}
            remarksPlaceholder={doc.estimateRemarksPlaceholder}
          />

          <DocumentTypeSection
            sectionTitle={doc.sections.deliveryNote}
            templateLabel={doc.template}
            standardLabel={doc.templateStandard}
            changeLabel={doc.changeTemplate}
            customizeTitle={doc.customizeTitle}
            customizeDesc={doc.customizeDesc}
            customizeLink={doc.customizeLink}
            preview={<DeliveryNoteThumbnail ui={deliveryUi} />}
            messageLabel={doc.message}
            messageDefault={doc.deliveryMessage}
            remarksLabel={doc.deliveryRemarks}
            remarksPlaceholder={doc.deliveryRemarksPlaceholder}
          />

          <DocumentTypeSection
            sectionTitle={doc.sections.invoice}
            templateLabel={doc.template}
            standardLabel={doc.templateStandard}
            changeLabel={doc.changeTemplate}
            customizeTitle={doc.customizeTitle}
            customizeDesc={doc.customizeDesc}
            customizeLink={doc.customizeLink}
            preview={<InvoiceThumbnail ui={invoiceUi} />}
            headingLabel={doc.heading}
            headingOptions={[doc.invoiceTitle]}
            messageLabel={doc.message}
            messageDefault={doc.invoiceMessage}
            remarksLabel={doc.invoiceRemarks}
            remarksPlaceholder={doc.invoiceRemarksPlaceholder}
            showCategoryFormat
            categoryFormatLabel={doc.categoryFormat}
            categoryFormatCheck={doc.categoryFormatCheck}
            categoryFormatNote={doc.categoryFormatNote}
          />

          <DocumentTypeSection
            sectionTitle={doc.sections.receipt}
            templateLabel={doc.template}
            standardLabel={doc.templateStandard}
            changeLabel={doc.changeTemplate}
            customizeTitle={doc.customizeTitle}
            customizeDesc={doc.customizeDesc}
            customizeLink={doc.customizeLink}
            preview={<ReceiptThumbnail ui={receiptUi} />}
            messageLabel={doc.message}
            messageDefault={doc.receiptMessage}
            remarksLabel={doc.receiptRemarks}
            remarksPlaceholder={doc.receiptRemarksPlaceholder}
          />
        </div>
      </div>

      <SettingsSaveBar label={ui.save} />
    </SalesFlowShell>
  );
}

function DocumentTypeSection({
  sectionTitle,
  templateLabel,
  standardLabel,
  changeLabel,
  customizeTitle,
  customizeDesc,
  customizeLink,
  preview,
  headingLabel,
  headingOptions,
  messageLabel,
  messageDefault,
  remarksLabel,
  remarksPlaceholder,
  showCategoryFormat,
  categoryFormatLabel,
  categoryFormatCheck,
  categoryFormatNote,
}: {
  sectionTitle: string;
  templateLabel: string;
  standardLabel: string;
  changeLabel: string;
  customizeTitle: string;
  customizeDesc: string;
  customizeLink: string;
  preview: React.ReactNode;
  headingLabel?: string;
  headingOptions?: string[];
  messageLabel: string;
  messageDefault: string;
  remarksLabel: string;
  remarksPlaceholder: string;
  showCategoryFormat?: boolean;
  categoryFormatLabel?: string;
  categoryFormatCheck?: string;
  categoryFormatNote?: string;
}) {
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <SettingsSectionHeader title={sectionTitle} />
      <div className="px-6">
        <SettingsTemplateBlock
          templateLabel={templateLabel}
          standardLabel={standardLabel}
          changeLabel={changeLabel}
          customizeTitle={customizeTitle}
          customizeDesc={customizeDesc}
          customizeLink={customizeLink}
          preview={preview}
        >
          {headingLabel && headingOptions ? (
            <div className="border-b border-slate-200 py-5">
              <label className="block text-[16px] font-semibold text-slate-800">{headingLabel}</label>
              <select className="field mt-3 max-w-[220px] bg-white">
                {headingOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="border-b border-slate-200 py-5">
            <label className="block text-[16px] font-semibold text-slate-800">{messageLabel}</label>
            <input className="field mt-3" defaultValue={messageDefault} />
          </div>

          {showCategoryFormat ? (
            <div className="border-b border-slate-200 py-5">
              <p className="text-[16px] font-semibold text-slate-800">{categoryFormatLabel}</p>
              <label className="mt-3 flex items-start gap-3 text-[15px] text-slate-700">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-600" />
                <span>
                  {categoryFormatCheck}
                  <span className="mt-1 block text-sm text-slate-500">{categoryFormatNote}</span>
                </span>
              </label>
            </div>
          ) : null}

          <div className="py-5">
            <label className="block text-[16px] font-semibold text-slate-800">{remarksLabel}</label>
            <textarea
              className="field mt-3 min-h-[120px]"
              placeholder={remarksPlaceholder}
              defaultValue={remarksPlaceholder}
            />
          </div>
        </SettingsTemplateBlock>
      </div>
    </section>
  );
}
