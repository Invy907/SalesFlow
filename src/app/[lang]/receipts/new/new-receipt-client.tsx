"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { ModalDialog } from "@/components/modal-dialog";
import { useLanguage } from "@/contexts/language-context";
import { appHrefs } from "@/lib/app-hrefs";
import {
  DocumentBottomBar,
  type SenderDetails,
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
import { createReceipt, updateReceipt } from "@/lib/actions/receipts";
import type { SimpleDocumentFormInitial } from "@/lib/documents/simple-document-form";
import type { CreateReceiptInput } from "@/lib/validators/document";
import type { SimpleDocumentDefaults } from "../../documents/form-defaults";
import type { TaxDisplay, WithholdingType } from "@/lib/tax";
import { taxRateSnapshotFor } from "@/lib/tax";
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
  sender: SenderDetails;
  taxDisplay: TaxDisplay;
  withholdingType: WithholdingType;
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
  initial,
  items = [],
  defaults,
  documentId,
}: {
  clients?: ClientOptionRow[];
  initial?: SimpleDocumentFormInitial;
  items?: ItemOption[];
  defaults: SimpleDocumentDefaults;
  documentId?: string;
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
  const [selectedTemplate, setSelectedTemplate] = useState<"standard" | "envelope">((initial?.templateKey ?? defaults.templateKey) === "envelope" ? "envelope" : "standard");
  const [previewModal, setPreviewModal] = useState<TemplateType>(null);
  const [outputLocale, setOutputLocale] = useState<DocumentOutputLocale>(() =>
    normalizeDocumentOutputLocale(initial?.outputLocale),
  );
  const [clientHonorific, setClientHonorific] =
    useState<ClientHonorific>(initial?.clientHonorific ?? DEFAULT_CLIENT_HONORIFIC);
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>(initial?.lines?.length ? initial.lines : []);
  const { primaryDate, setPrimaryDate, secondaryDate, setSecondaryDate } = useDocumentDateFields(initial?.issueDate ?? defaults.issueDate, initial?.secondaryDate);

  // 프리뷰에 그대로 반영해야 하는 입력만 상태로 들고 있는다.
  const [form, setForm] = useState<PreviewForm>({
    clientId: initial?.clientId ?? null,
    clientName: initial?.clientName ?? "",
    documentNumber: initial?.documentNumber ?? "",
    subject: initial?.subject ?? "",
    senderCompanyName: initial?.senderCompanyName ?? defaults.senderCompanyName,
    sender: { ...defaults.sender, ...initial?.sender },
    taxDisplay: initial?.taxDisplay ?? (defaults.taxDisplay === "separate_on_invoice" ? "separate" : defaults.taxDisplay),
    withholdingType: initial?.withholdingType ?? "none",
    templateMessage: initial?.templateMessage ?? defaults.templateMessage,
    remarks: initial?.remarks ?? defaults.remarks,
    taxRounding: initial?.taxRounding ?? defaults.taxRounding,
    recipient: { ...EMPTY_RECIPIENT, ...(initial?.recipient ?? {}) },
  });
  const set = <K extends keyof PreviewForm>(key: K, value: PreviewForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setRecipient = (key: keyof RecipientState, value: string) =>
    setForm((f) => ({ ...f, recipient: { ...f.recipient, [key]: value } }));

  const applyClient = useCallback((option: ClientOptionRow | null, typedName: string) => {
    setForm((f) => {
      if (!option) return { ...f, clientName: typedName, clientId: null, recipient: f.clientId ? { ...EMPTY_RECIPIENT, companyName: typedName } : f.recipient };
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
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const lineItems = rows.map((r) => {
        const taxCategory = taxCategoryFromLabel(r.tax);
        return isBlankLineRow(r)
          ? { name: "", qty: 0, unit: "", unitPrice: 0, taxCategory, taxRateSnapshot: taxRateSnapshotFor(taxCategory) }
          : {
              itemId: r.itemId ?? undefined,
              withholdingExempt: r.withholdingExempt,
              name: r.name,
              qty: r.qty.trim() === "" ? 1 : Number(r.qty.replace(/,/g, "")),
              unit: r.unit,
              unitPrice: r.price.trim() === "" ? 0 : Number(r.price.replace(/,/g, "")),
              taxCategory,
              taxRateSnapshot: taxRateSnapshotFor(taxCategory),
            };
      });

      const payload: CreateReceiptInput = {
        clientId: form.clientId,
        clientDestinationId: initial?.clientId === form.clientId ? initial?.clientDestinationId : null,
        linkedInvoiceId: initial?.linkedInvoiceId,
        internalMemo: initial?.internalMemo,
        subject: form.subject,
        issueDate: new Date(toIsoDate(primaryDate)),
        transactionDate: secondaryDate ? new Date(toIsoDate(secondaryDate)) : null,
        taxDisplay: form.taxDisplay,
        taxRounding: form.taxRounding,
        withholdingType: form.withholdingType,
        templateKey: selectedTemplate,
        outputLocale,
        clientHonorific,
        showSeal: initial?.showSeal ?? true,
        templateMessage: form.templateMessage,
        remarks: form.remarks,
        recipientSnapshot: { ...initial?.recipientSnapshot, ...form.recipient, clientName: form.clientName },
        senderSnapshot: { ...initial?.senderSnapshot, ...form.sender, companyName: form.senderCompanyName },
        lineItems,
      };

      try {
        const result = documentId ? await updateReceipt(documentId, payload) : await createReceipt(payload);
        if (result.ok) {
          try { if (!documentId) window.localStorage.removeItem("receipt-new-line-items"); } catch { /* Browser storage is optional. */ }
          router.push(`/${lang}/receipts/${documentId ?? result.data}`);
          router.refresh();
        } else {
          setError([result.error, ...Object.values(result.fieldErrors ?? {})].filter(Boolean).join(" · "));
        }
      } catch {
        setError(lang === "ko" ? "저장하지 못했습니다. 다시 시도해 주세요." : lang === "en" ? "Could not save. Please try again." : "保存できませんでした。もう一度お試しください。");
      }
    });
  }

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setLineItemTotals(next), []);

  const lineItemsTable = (
    <DocumentLineItemsTable
      ui={ui}
      storageKey={documentId ? undefined : "receipt-new-line-items"}
      initialRows={rows.length ? rows : undefined}
      taxDisplay={form.taxDisplay}
      taxRounding={form.taxRounding}
      withholdingType={form.withholdingType}
      documentType="receipt"
      onTotalsChange={handleTotalsChange}
      onRowsChange={handleRowsChange}
      compact={previewOpen}
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
      <div className="mx-auto w-full max-w-[1680px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:py-10 lg:pb-32">
        <Link href={documentId ? `/${lang}/receipts/${documentId}` : `/${lang}/receipts`} className="mb-4 inline-block text-sm font-medium text-[#0A4D34] hover:underline">← {lang === "ko" ? "돌아가기" : lang === "en" ? "Back" : "戻る"}</Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
            {documentId ? (lang === "ko" ? "영수증 편집" : lang === "en" ? "Edit receipt" : "領収書の編集") : ui.newTitle}
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
        <div className={activeTab === "basic" ? "" : "hidden"}>
            <div className={`mt-10 grid gap-8 ${previewOpen ? "grid-cols-1" : "xl:grid-cols-2"}`}>
              <section>
                <SectionTitle title={ui.receiptInfo} />
                <div className="mt-5 space-y-5">
                  <FormField label={ui.client} required={ui.required}>
                    <div className="flex gap-2">
                      <input
                        className="field min-w-0 flex-1"
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
                      className="field bg-slate-50 text-slate-500"
                      readOnly
                      value={form.documentNumber || (lang === "ko" ? "저장 시 자동 발급" : lang === "en" ? "Assigned when saved" : "保存時に自動採番")}
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
                  </FormField>
                  <SenderDetailFields storagePrefix="receiptSender" buttonLabel={ui.detailLink} value={form.sender} onChange={(sender) => set("sender", sender)} />
                </div>
              </section>
            </div>

            {lineItemsTable}
            <RemarksField ui={ui} value={form.remarks} onChange={(v) => set("remarks", v)} />
        </div>

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
                  className="field min-w-0 flex-1"
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
                      <input type="radio" name="taxDisplay" checked={form.taxDisplay === (["separate", "included", "exempt"] as const)[index]} onChange={() => set("taxDisplay", (["separate", "included", "exempt"] as const)[index])} className="h-4 w-4 accent-[#0A4D34]" />
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
                      <input type="radio" name="withholding" checked={form.withholdingType === (["none", "with_recovery", "without_recovery"] as const)[index]} onChange={() => set("withholdingType", (["none", "with_recovery", "without_recovery"] as const)[index])} className="h-4 w-4 accent-[#0A4D34]" />
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
            <div className="mt-10 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
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

                  <p className="text-sm text-slate-500">
                    {lang === "ko" ? "품목 열 제목은 문서 출력 언어에 맞춰 표시됩니다." : lang === "en" ? "Line item headings follow the document language." : "明細の見出しは文書の出力言語に合わせて表示されます。"}
                  </p>
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
                senderPostalCode: form.sender.postalCode,
                senderAddressLine1: form.sender.addressLine1,
                senderAddressLine2: form.sender.addressLine2,
                senderAddressLine3: form.sender.addressLine3,
                senderTel: form.sender.tel,
                senderFax: form.sender.fax,
                senderEmail: form.sender.email,
                senderRegistrationNumber: form.sender.registrationNumber,
                sealUrl: initial?.showSeal === false ? null : defaults.sealUrl,
                taxDisplay: form.taxDisplay,
                withholdingType: form.withholdingType,
                documentType: "receipt",
                taxRounding: form.taxRounding,
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
        totals={lineItemTotals}
        onSave={handleSave}
        pending={pending}
        error={error}
      />

      {/* 템플릿 미리보기 모달 */}
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
              <ReceiptPreview
                ui={ui}
                type={previewModal}
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
    <label className="block min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[16px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="shrink-0 rounded bg-[#0A4D34] px-2 py-0.5 text-xs font-bold text-white">{required}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
