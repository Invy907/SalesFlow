"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { pageContainerClass } from "@/components/page-container";
import {
  clientHonorificSuffix,
  type ClientHonorific,
} from "@/lib/documents/client-honorific";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../settings/content";
import { documentLineQuantity, parseDocumentNumber } from "@/lib/documents/line-form-values";
import { DateFieldInput } from "../estimates/date-field-input";
import { toDateInputValue } from "../estimates/date-field-utils";
import { computeLineAmount, computeDocumentTotals, taxCategoryFromLabel, TAX_CATEGORY_TO_LABEL, type TaxCategory, type TaxRounding, type TaxDisplay, type WithholdingType } from "@/lib/tax";
import { lookupJapanPostalCode } from "@/lib/actions/postal";

export type DocumentTabKey = string;

export type DocumentTab<T extends DocumentTabKey> = {
  key: T;
  label: string;
};

type DocumentPageShellProps<T extends DocumentTabKey> = {
  activeItem: string;
  title: string;
  tabs: Array<DocumentTab<T>>;
  activeTab: T;
  onTabChange: (tab: T) => void;
  titleAddon?: ReactNode;
  titleLink?: ReactNode;
  children: ReactNode;
};

type FormFieldProps = {
  label: string;
  required?: string;
  children: ReactNode;
};

type DateFieldConfig = {
  label: string;
  required?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type BasicSectionProps = {
  infoTitle: string;
  senderTitle: string;
  clientLabel: string;
  clientRequired?: string;
  companyHonorific?: string;
  dateFields: [DateFieldConfig, DateFieldConfig];
  numberLabel: string;
  numberRequired?: string;
  numberHint?: ReactNode;
  numberValue?: string;
  subjectLabel: string;
  senderCompanyLabel: string;
  senderRequired?: string;
  senderCompanyValue?: string;
  detailLinkLabel: string;
  afterSubject?: ReactNode;
};

type RecipientSectionProps = {
  postalCodeLabel: string;
  postalCodePlaceholder?: string;
  postalCodeLookupLabel: string;
  addressLabel: string;
  recipientNameLabel: string;
  recipientNameNote?: ReactNode;
  namePlaceholders: string[];
  contactPlaceholder?: string;
  companyHonorific?: string;
  sideContent?: ReactNode;
};

type SimpleRemarksFieldProps = {
  label: string;
  name?: string;
};

export type SenderDetails = Partial<{
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  tel: string;
  fax: string;
  email: string;
  registrationNumber: string;
}>;

type SenderDetailFieldsProps = {
  storagePrefix: string;
  buttonLabel?: string;
  value?: SenderDetails;
  onChange?: (value: SenderDetails) => void;
};

type LineItemsTableProps = {
  batchTaxLabel: string;
  changeLabel: string;
  printNote: string;
  addRowLabel: string;
  subtotalLabel: string;
  taxLabel: string;
  totalLabel: string;
  itemHeaders: readonly string[];
  unitPlaceholder: string;
  deleteRowLabel: string;
  /** 登録済みの品目一覧。品番・品名の入力欄でオートコンプリートに使う。 */
  items?: ItemOption[];
  topNotice?: ReactNode;
  onTotalsChange?: (totals: LineItemTotals) => void;
  onRowsChange?: (rows: LineItemRow[]) => void;
  initialRows?: LineItemRow[];
  storageKey?: string;
  /** Prefer the storageKey draft over initialRows (DB value) — used by the edit screen. */
  preferDraftOverInitialRows?: boolean;
  compact?: boolean;
  initialRowCount?: number;
  hideSummaryRows?: boolean;
  taxRounding?: TaxRounding;
  taxDisplay?: TaxDisplay;
  withholdingType?: WithholdingType;
  documentType?: "estimate" | "invoice" | "delivery_note" | "receipt";
};

type TaxRateSelectProps = {
  defaultValue?: string;
  compact?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

/** How long a draft saved with preferDraftOverInitialRows (edit screen) stays valid. */
const LINE_ITEMS_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const TAX_RATE_OPTIONS = [
  "10%",
  "\u8efd\u6e1b8%",
  "8%",
  "\u5bfe\u8c61\u5916",
  "5%",
];

type LineItemRow = {
  name: string;
  qty: string;
  unit: string;
  price: string;
  tax: string;
  /** 品目マスタから選択された場合のID。手入力・不一致になった場合は null。 */
  itemId?: string | null;
  withholdingExempt?: boolean;
};

export type { LineItemRow };

/** 品目マスタのオートコンプリート候補。 */
export type ItemOption = {
  id: string;
  name: string;
  unit: string | null;
  unitPrice: number;
  taxCategory: string;
  withholdingExempt?: boolean;
};

export type LineItemTotals = {
  subtotal: number;
  tax: number;
  total: number;
  withholding?: number;
};

function createEmptyRow(): LineItemRow {
  return { name: "", qty: "", unit: "", price: "", tax: "10%", itemId: null };
}

function getTaxTargetLabel(value: string) {
  if (value === "\u5bfe\u8c61\u5916") {
    return value;
  }
  return `${value}\u5bfe\u8c61`;
}

function formatAmount(value: number) {
  return value.toLocaleString("ja-JP");
}

export function formatDocumentAmount(value: number) {
  return formatAmount(value);
}

export const EMPTY_LINE_ITEM_TOTALS: LineItemTotals = {
  subtotal: 0,
  tax: 0,
  total: 0,
};

type DocumentBottomBarProps = {
  subtotalLabel: string;
  taxLabel: string;
  totalLabel: string;
  saveLabel: string;
  totals: LineItemTotals;
  onSave?: () => void;
  pending?: boolean;
  error?: string | null;
  taxDisplay?: TaxDisplay;
};

export function DocumentBottomBar({
  subtotalLabel,
  taxLabel,
  totalLabel,
  saveLabel,
  totals,
  onSave,
  pending,
  error,
  taxDisplay,
}: DocumentBottomBarProps) {
  const { lang } = useLanguage();
  const withholdingLabel = lang === "ko" ? "원천징수" : lang === "en" ? "Withholding tax" : "源泉徴収税";
  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-300 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div
        className={[
          "mx-auto w-full max-w-[1680px] px-4 py-2 sm:px-6 sm:py-3 lg:px-8",
          "flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between 2xl:gap-6",
        ].join(" ")}
      >
        <div className="order-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 sm:text-sm 2xl:order-1">
          <span>
            {subtotalLabel}{" "}
            <strong className="ml-1 tabular-nums [overflow-wrap:anywhere]">
              {formatDocumentAmount(totals.subtotal)} 円
            </strong>
          </span>
          <span>
            {taxLabel}{taxDisplay === "included" ? (lang === "ko" ? " (포함)" : lang === "en" ? " (included)" : " (内税)") : ""}{" "}
            <strong className="ml-1 tabular-nums [overflow-wrap:anywhere]">
              {formatDocumentAmount(totals.tax)} 円
            </strong>
          </span>
          {Boolean(totals.withholding) && (
            <span>{withholdingLabel} <strong className="ml-1 tabular-nums [overflow-wrap:anywhere]">−{formatDocumentAmount(totals.withholding ?? 0)} 円</strong></span>
          )}
        </div>
        <div className="order-1 flex min-w-0 items-center justify-between gap-3 sm:gap-6 2xl:order-2">
          <span className="min-w-0 text-xs font-semibold text-slate-800 sm:text-sm">
            {totalLabel}
            <strong className="block text-xl leading-tight tabular-nums [overflow-wrap:anywhere] sm:text-3xl">
              {formatDocumentAmount(totals.total)} 円
            </strong>
          </span>
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !onSave}
              className="min-h-11 max-w-[45%] shrink-0 rounded bg-[#0A4D34] px-4 py-2.5 text-sm font-semibold text-white [overflow-wrap:anywhere] transition hover:bg-[#083D29] disabled:cursor-not-allowed disabled:opacity-60 sm:px-8 sm:text-base"
            >
              {pending ? "..." : saveLabel}
            </button>
        </div>
        {error ? <p role="alert" className="order-3 max-h-20 overflow-y-auto text-sm text-red-600 [overflow-wrap:anywhere] 2xl:max-w-sm">{error}</p> : null}
      </div>
    </div>
  );
}

export function DocumentPageShell<T extends DocumentTabKey>({
  activeItem,
  title,
  tabs,
  activeTab,
  onTabChange,
  titleAddon,
  titleLink,
  children,
}: DocumentPageShellProps<T>) {
  return (
    <div
      data-active-item={activeItem}
      className={pageContainerClass({ spaciousBottom: true })}
    >
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">{title}</h1>
        {titleAddon}
        {titleLink}
      </div>

      <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:mt-8 sm:px-0">
        <div className="flex min-w-max gap-4 border-b border-slate-200 text-base text-slate-500 sm:gap-8 sm:text-[18px]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
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

      {children}
    </div>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <h2 className="text-xl font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-[24px]">{title}</h2>
    </div>
  );
}

export function FormField({ label, required, children }: FormFieldProps) {
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

export function RecipientPostalCodeField({
  postalCode,
  onPostalCodeChange,
  onAddressResolved,
  lookupLabel,
  placeholder,
  invalidMessage,
  notFoundMessage,
  networkErrorMessage,
}: {
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  onAddressResolved: (address: { postalCode: string; addressLine1: string }) => void;
  lookupLabel: string;
  placeholder?: string;
  invalidMessage: string;
  notFoundMessage: string;
  networkErrorMessage: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runLookup(code: string) {
    setError(null);
    setPending(true);
    try {
      const result = await lookupJapanPostalCode(code);
      if (!result.ok) {
        const msg =
          result.error === "invalid"
            ? invalidMessage
            : result.error === "not_found"
              ? notFoundMessage
              : networkErrorMessage;
        setError(msg);
        return;
      }
      onPostalCodeChange(result.formattedPostalCode);
      onAddressResolved({
        postalCode: result.formattedPostalCode,
        addressLine1: result.addressLine1,
      });
    } catch {
      setError(networkErrorMessage);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input
          className="field w-full max-w-[180px]"
          placeholder={placeholder}
          value={postalCode}
          onChange={(e) => onPostalCodeChange(e.target.value)}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => void runLookup(postalCode)}
          className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          {pending ? "…" : lookupLabel}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

type DocumentDateFieldConfig = {
  label: string;
  required?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function DocumentDateFieldRow({ fields }: { fields: [DocumentDateFieldConfig, DocumentDateFieldConfig] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="min-w-0">
          <FormField label={field.label} required={field.required}>
            <DateFieldInput value={field.value} onChange={field.onChange} placeholder={field.placeholder} />
          </FormField>
        </div>
      ))}
    </div>
  );
}

export function useDocumentDateFields(initialPrimaryValue?: string, initialSecondaryValue?: string) {
  const [primaryDate, setPrimaryDate] = useState(() => toDateInputValue(initialPrimaryValue));
  const [secondaryDate, setSecondaryDate] = useState(() =>
    initialSecondaryValue ? toDateInputValue(initialSecondaryValue) : "",
  );

  return {
    primaryDate,
    setPrimaryDate,
    secondaryDate,
    setSecondaryDate,
  };
}

/** 화면의 YYYY/MM/DD → DB 의 YYYY-MM-DD */
export { toIsoDate } from "../estimates/date-field-utils";

export function HonorificField({ honorific }: { honorific?: string }) {
  return (
    <div className="flex w-20 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xl text-slate-700">
      {honorific || "\u69d8"}
    </div>
  );
}

/**
 * Client honorific picker. Defaults to 御中; 様 and "no honorific" can be chosen.
 * The printed suffix follows the document output language, so the options show it directly.
 */
export function ClientHonorificSelect({
  value,
  onChange,
  uiLocale,
  outputLocale,
}: {
  value: ClientHonorific;
  onChange: (value: ClientHonorific) => void;
  uiLocale: string;
  outputLocale: string;
}) {
  const copy =
    uiLocale === "ja"
      ? { label: "取引先の敬称", onchu: "御中", sama: "様", none: "なし" }
      : uiLocale === "en"
        ? { label: "Client honorific", onchu: "Company", sama: "Individual", none: "None" }
        : { label: "거래처 경칭", onchu: "귀중", sama: "님", none: "표시 안 함" };

  const options: Array<{ key: ClientHonorific; label: string }> = [
    { key: "onchu", label: clientHonorificSuffix("onchu", outputLocale) || copy.onchu },
    { key: "sama", label: clientHonorificSuffix("sama", outputLocale) || copy.sama },
    { key: "none", label: copy.none },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{copy.label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={value === option.key}
            onClick={() => onChange(option.key)}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              value === option.key
                ? "bg-[#0A4D34] text-white hover:bg-[#083D29]"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CommonBasicSection({
  infoTitle,
  senderTitle,
  clientLabel,
  clientRequired,
  companyHonorific,
  dateFields,
  numberLabel,
  numberRequired,
  numberHint,
  numberValue,
  subjectLabel,
  senderCompanyLabel,
  senderRequired,
  senderCompanyValue,
  detailLinkLabel,
  afterSubject,
}: BasicSectionProps) {
  return (
    <div className="mt-10 grid gap-8 xl:grid-cols-2">
      <section>
        <SectionTitle title={infoTitle} />
        <div className="mt-5 space-y-5">
          <FormField label={clientLabel} required={clientRequired}>
            <div className="flex gap-2">
              <input className="field min-w-0 flex-1" />
              <HonorificField honorific={companyHonorific} />
            </div>
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            {dateFields.map((field) => (
              <FormField key={field.label} label={field.label} required={field.required}>
                <DateFieldInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={field.placeholder}
                />
              </FormField>
            ))}
          </div>

          <FormField label={numberLabel} required={numberRequired}>
            {numberHint ? <div className="mb-2 text-sm text-[#0A4D34]">{numberHint}</div> : null}
            <input className="field" defaultValue={numberValue} />
          </FormField>

          <FormField label={subjectLabel}>
            <input className="field" />
            <div className="mt-1 text-right text-sm text-slate-400">0/70</div>
          </FormField>

          {afterSubject}
        </div>
      </section>

      <section>
        <SectionTitle title={senderTitle} />
        <div className="mt-5 space-y-5">
          <FormField label={senderCompanyLabel} required={senderRequired}>
            <input className="field" defaultValue={senderCompanyValue} />
            <input className="field mt-2" />
            <input className="field mt-2" />
          </FormField>
          <button className="text-[15px] font-medium text-[#0A4D34]">{detailLinkLabel}</button>
        </div>
      </section>
    </div>
  );
}

export function CommonRecipientSection({
  postalCodeLabel,
  postalCodePlaceholder,
  postalCodeLookupLabel,
  addressLabel,
  recipientNameLabel,
  recipientNameNote,
  namePlaceholders,
  contactPlaceholder,
  companyHonorific,
  sideContent,
}: RecipientSectionProps) {
  const content = (
    <>
      <FormField label={postalCodeLabel}>
        <div className="flex flex-wrap gap-3">
          <input className="field w-full max-w-[180px]" placeholder={postalCodePlaceholder} />
          <button className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700">
            {postalCodeLookupLabel}
          </button>
        </div>
      </FormField>

      <FormField label={addressLabel}>
        <input className="field" />
        <input className="field mt-2" />
      </FormField>

      <FormField label={recipientNameLabel}>
        {recipientNameNote}
        {namePlaceholders.map((placeholder, index) => (
          <input
            key={`${recipientNameLabel}-${index}`}
            className={index === 0 ? "field" : "field mt-2"}
            placeholder={placeholder}
          />
        ))}
        <div className="mt-2 flex gap-2">
          <input className="field min-w-0 flex-1" placeholder={contactPlaceholder} />
          <HonorificField honorific={companyHonorific} />
        </div>
      </FormField>
    </>
  );

  if (sideContent) {
    return (
      <div className="mt-6 grid gap-8 xl:grid-cols-2">
        <section className="space-y-5">{content}</section>
        <section>{sideContent}</section>
      </div>
    );
  }

  return <div className="mt-10 max-w-[600px] space-y-5">{content}</div>;
}

export function SimpleRemarksField({ label, name }: SimpleRemarksFieldProps) {
  return (
    <div className="mt-12">
      <label className="mb-2 block text-[18px] font-semibold text-slate-800">{label}</label>
      <textarea name={name} className="field min-h-[140px]" />
    </div>
  );
}

export function SenderDetailFields({
  storagePrefix,
  buttonLabel,
  value,
  onChange,
}: SenderDetailFieldsProps) {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang).company;
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState<SenderDetails>({});
  const sender = value ?? localValue;
  const update = (next: SenderDetails) => onChange ? onChange(next) : setLocalValue(next);
  const set = (key: keyof SenderDetails, next: string) => update({ ...sender, [key]: next });

  return (
    <div className="pt-1">
      <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-2 text-[15px] font-medium text-[#0A4D34]">
        <span className={["text-xs transition", isOpen ? "rotate-90" : ""].join(" ")}>▶</span>
        <span>{buttonLabel ?? ui.basicSection}</span>
      </button>
      {isOpen ? (
        <div className="mt-5 space-y-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          <FormField label={ui.postalCode}>
            <RecipientPostalCodeField
              postalCode={sender.postalCode ?? ""}
              onPostalCodeChange={(next) => set("postalCode", next)}
              onAddressResolved={({ postalCode, addressLine1 }) => update({ ...sender, postalCode, addressLine1 })}
              lookupLabel={ui.postalCodeLookup}
              placeholder="000-0000"
              invalidMessage={ui.postalCodeInvalid}
              notFoundMessage={ui.postalCodeLookupFailed}
              networkErrorMessage={ui.postalCodeLookupNetworkError}
            />
          </FormField>
          <FormField label={ui.address}>
            {(["addressLine1", "addressLine2", "addressLine3"] as const).map((key, index) => (
              <input key={key} name={`${storagePrefix}-${key}`} aria-label={`${ui.address} ${index + 1}`}
                className={index ? "field mt-2" : "field"} value={sender[key] ?? ""}
                onChange={(event) => set(key, event.target.value)} />
            ))}
          </FormField>
          {([
            ["tel", ui.tel, "tel"], ["fax", ui.fax, "tel"],
            ["email", ui.email, "email"], ["registrationNumber", ui.invoiceNumber, "text"],
          ] as const).map(([key, label, type]) => (
            <FormField key={key} label={label}>
              <input name={`${storagePrefix}-${key}`} type={type} className="field" value={sender[key] ?? ""}
                onChange={(event) => set(key, event.target.value)} />
            </FormField>
          ))}
          <Link href={`/${lang}/settings/company`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-[#0A4D34] underline">
            {ui.title} · {ui.logo} / {ui.seal} ↗
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function CommonLineItemsTable({
  batchTaxLabel,
  changeLabel,
  printNote,
  addRowLabel,
  subtotalLabel,
  taxLabel,
  totalLabel,
  itemHeaders,
  unitPlaceholder,
  deleteRowLabel,
  topNotice,
  onTotalsChange,
  onRowsChange,
  initialRows,
  storageKey,
  preferDraftOverInitialRows = false,
  compact = false,
  initialRowCount,
  hideSummaryRows = false,
  items = [],
  taxRounding = "round_down",
  taxDisplay = "separate",
  withholdingType = "none",
  documentType,
}: LineItemsTableProps) {
  const { lang } = useLanguage();
  const withholdingLabel = lang === "ko" ? "원천징수" : lang === "en" ? "Withholding tax" : "源泉徴収税";
  const itemOptionsId = useId();
  const defaultRowCount = initialRowCount ?? (compact ? 1 : 5);
  const [rows, setRows] = useState<LineItemRow[]>(
    () => initialRows ?? Array.from({ length: defaultRowCount }, createEmptyRow),
  );
  const [bulkTax, setBulkTax] = useState("10%");
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let restoredRows: LineItemRow[] | undefined;
    let restoredTax: string | undefined;
    if (storageKey && (!initialRows?.length || preferDraftOverInitialRows)) {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as { rows?: LineItemRow[]; bulkTax?: string; savedAt?: number };
          const stale = typeof saved.savedAt === "number" && Date.now() - saved.savedAt > LINE_ITEMS_DRAFT_MAX_AGE_MS;
          if (!stale && Array.isArray(saved.rows) && saved.rows.length > 0 && saved.rows.length <= 80 &&
            saved.rows.every((row) => row && [row.name, row.qty, row.unit, row.price, row.tax].every((value) => typeof value === "string"))) {
            restoredRows = saved.rows;
            restoredTax = saved.bulkTax;
          }
        }
      } catch { /* Ignore unreadable drafts. */ }
    }
    const frame = window.requestAnimationFrame(() => {
      if (restoredRows) setRows(restoredRows);
      if (restoredTax) setBulkTax(restoredTax);
      setHasLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  // Restore once on mount; changing tabs keeps the editor mounted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storageKey || !hasLoaded || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        rows,
        bulkTax,
        savedAt: Date.now(),
      }),
      );
    } catch {
      // Storage can be disabled or full; editing and saving must remain available.
    }
  }, [bulkTax, hasLoaded, rows, storageKey]);

  const updateRow = (index: number, key: keyof LineItemRow, nextValue: string) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: nextValue } : row)),
    );
  };

  /**
   * 品番・品名の入力。登録済み品目名と完全一致すれば単位・単価・税区分と itemId を
   * まとめて反映する(依頼: 品目オートコンプリート)。一致しなくなれば itemId は外す。
   */
  const updateName = (index: number, nextValue: string) => {
    const matched = items.find((it) => it.name === nextValue);
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        if (matched) {
          return {
            ...row,
            name: matched.name,
            unit: matched.unit ?? row.unit,
            price: String(matched.unitPrice),
            tax: TAX_CATEGORY_TO_LABEL[matched.taxCategory as TaxCategory] ?? row.tax,
            itemId: matched.id,
            withholdingExempt: matched.withholdingExempt ?? false,
          };
        }
        return { ...row, name: nextValue, itemId: null, withholdingExempt: false };
      }),
    );
  };

  const applyBulkTax = () => {
    setRows((current) => current.map((row) => ({ ...row, tax: bulkTax })));
  };

  const addRow = () => {
    setRows((current) => current.length < 80 ? [...current, createEmptyRow()] : current);
  };

  /** Remove a row. The last one is emptied instead so the table never disappears. */
  const removeRow = (index: number) => {
    setRows((current) =>
      current.length <= 1
        ? [createEmptyRow()]
        : current.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  const calculated = computeDocumentTotals(
    rows.map((row) => ({
      qty: documentLineQuantity(row),
      unitPrice: parseDocumentNumber(row.price),
      taxCategory: taxCategoryFromLabel(row.tax),
      withholdingExempt: row.withholdingExempt,
    })),
    taxRounding,
    { taxDisplay, withholdingType, documentType },
  );
  const { subtotal, tax, total, withholding } = calculated;
  const visibleTaxBreakdown = calculated.breakdown.filter((item) => item.rate > 0).map((item) => ({
    ...item,
    taxType: TAX_CATEGORY_TO_LABEL[item.taxCategory],
  }));
  const showTaxBreakdown = visibleTaxBreakdown.length > 0;

  useEffect(() => {
    onTotalsChange?.({ subtotal, tax, total, withholding });
  }, [onTotalsChange, subtotal, tax, total, withholding]);

  useEffect(() => {
    onRowsChange?.(rows);
  }, [onRowsChange, rows]);

  return (
    <div className={compact ? "mt-2 min-w-0" : "mt-12 min-w-0"}>
      {topNotice}

      <div className={["flex flex-wrap items-center justify-end gap-2 md:flex-nowrap", compact ? "mb-2" : "mb-4"].join(" ")}>
        <span className={["shrink-0 whitespace-nowrap text-slate-600", compact ? "text-[13px]" : ""].join(" ")}>
          {batchTaxLabel}
        </span>
        <div className="w-36 max-w-full shrink-0">
          <TaxRateSelect value={bulkTax} onChange={setBulkTax} compact={compact} />
        </div>
        <span className={["shrink-0 whitespace-nowrap text-slate-600", compact ? "text-[13px]" : ""].join(" ")}>
          {lang === "ja" ? "に" : ""}
        </span>
        <button
          type="button"
          onClick={applyBulkTax}
          className={[
            "rounded border border-slate-300 bg-white font-semibold whitespace-nowrap text-slate-700",
            compact ? "min-w-[96px] px-3 py-2 text-xs" : "min-w-[124px] px-5 py-3 text-sm",
          ].join(" ")}
        >
          {changeLabel}
        </button>
      </div>

      <div
        className={[
          "max-w-full rounded border border-slate-300",
          "overflow-x-auto",
        ].join(" ")}
      >
        <table
          className={[
            "w-full table-fixed border-collapse bg-white text-left",
            compact ? "min-w-[600px]" : "min-w-[1080px]",
          ].join(" ")}
        >
          <colgroup>
            <col className="w-[27%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[17%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className={["bg-[#f5f7fa] text-slate-800", compact ? "text-[13px]" : "text-[16px]"].join(" ")}>
            <tr>
              {itemHeaders.map((header) => (
                <th
                  key={header}
                  className={[
                    "border-b border-r border-slate-300 text-center font-semibold",
                    compact ? "px-2 py-1.5" : "px-4 py-4",
                  ].join(" ")}
                >
                  {header}
                </th>
              ))}
              <th
                className={[
                  "border-b border-slate-300 text-center font-semibold",
                  compact ? "px-1 py-1.5 text-[12px]" : "px-2 py-4",
                ].join(" ")}
              >
                {deleteRowLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const amount = computeLineAmount({ qty: documentLineQuantity(row), unitPrice: parseDocumentNumber(row.price) });
              const inputClass = compact
                ? "w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-1 py-1 text-[13px] leading-normal text-slate-800 outline-none transition focus:border-[#3AA87A]"
                : "w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-[17px] leading-normal text-slate-800 outline-none transition focus:border-[#3AA87A]";

              return (
                <tr key={index}>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      className={inputClass}
                      aria-label={`${itemHeaders[0]} ${index + 1}`}
                      maxLength={255}
                      value={row.name}
                      list={items.length ? itemOptionsId : undefined}
                      onChange={(event) => updateName(index, event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      inputMode="decimal"
                      className={[inputClass, "text-right"].join(" ")}
                      aria-label={`${itemHeaders[1]} ${index + 1}`}
                      placeholder="1"
                      value={row.qty}
                      onChange={(event) => updateRow(index, "qty", event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      className={[inputClass, "text-center text-slate-700"].join(" ")}
                      placeholder={unitPlaceholder}
                      aria-label={`${itemHeaders[2]} ${index + 1}`}
                      maxLength={255}
                      value={row.unit}
                      onChange={(event) => updateRow(index, "unit", event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      inputMode="numeric"
                      className={[inputClass, "text-right"].join(" ")}
                      aria-label={`${itemHeaders[3]} ${index + 1}`}
                      value={row.price}
                      onChange={(event) => updateRow(index, "price", event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <TaxRateSelect compact value={row.tax} onChange={(value) => updateRow(index, "tax", value)} />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <div
                      className={[
                        "flex items-center justify-end rounded-md bg-slate-50 text-right font-medium tabular-nums leading-normal text-slate-700",
                        compact ? "min-h-[30px] px-2 py-0.5 text-[13px]" : "min-h-[52px] px-4 py-2 text-[17px]",
                      ].join(" ")}
                    >
                      {row.qty || row.price ? formatAmount(amount) : ""}
                    </div>
                  </td>
                  <td className={["border-b border-slate-200 text-center align-middle", compact ? "px-1 py-1" : "px-2 py-2"].join(" ")}>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      title={deleteRowLabel}
                      aria-label={deleteRowLabel}
                      className={[
                        "inline-flex items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600",
                        compact ? "h-7 w-7" : "h-9 w-9",
                      ].join(" ")}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr>
              {hideSummaryRows ? (
                <td colSpan={7} className={compact ? "px-3 py-2" : "px-4 py-4"}>
                  <button
                    type="button"
                    onClick={addRow}
                    className={[
                      "font-medium text-[#0A4D34]",
                      compact ? "text-[14px]" : "text-xl",
                    ].join(" ")}
                  >
                    {addRowLabel}
                  </button>
                </td>
              ) : (
                <>
                  <td colSpan={4} className={["border-r border-slate-300 align-top", compact ? "px-3 py-2" : "px-4 py-4"].join(" ")}>
                    {!compact ? <p className="text-sm text-slate-500">{printNote}</p> : null}
                    <button
                      type="button"
                      onClick={addRow}
                      className={[
                        "font-medium text-[#0A4D34]",
                        compact ? "text-[14px]" : "mt-4 text-xl",
                      ].join(" ")}
                    >
                      {addRowLabel}
                    </button>
                  </td>
                  <td colSpan={3} className="p-0">
                    <table className="w-full">
                      <tbody>
                        {[
                          { label: subtotalLabel, value: subtotal },
                          { label: taxDisplay === "included" ? `${taxLabel} (${lang === "ko" ? "포함" : lang === "en" ? "included" : "内税"})` : taxLabel, value: tax },
                          ...(withholding ? [{ label: withholdingLabel, value: -withholding }] : []),
                          { label: totalLabel, value: total },
                        ].map((item) => (
                          <tr key={item.label}>
                            <td
                              className={[
                                "border-b border-l border-slate-300 text-right font-semibold text-slate-800",
                                compact ? "px-3 py-2 text-[13px]" : "px-6 py-6 text-[18px]",
                              ].join(" ")}
                            >
                              {item.label}
                            </td>
                            <td
                              className={[
                                "border-b border-l border-slate-300 bg-slate-50 text-right font-semibold text-slate-600",
                                compact ? "px-3 py-2 text-[13px]" : "px-6 py-6 text-[18px]",
                              ].join(" ")}
                            >
                              {formatAmount(item.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {showTaxBreakdown && !compact ? (
        <div className="mt-8 flex justify-end">
          <div className="w-full max-w-[560px] overflow-x-auto rounded border border-slate-300 bg-white">
            <table className="w-full min-w-[440px] border-collapse">
              <tbody>
                {visibleTaxBreakdown.map((item) => (
                  <tr key={item.taxType}>
                    <td className="border-b border-r border-slate-300 px-6 py-5 text-right text-[17px] font-semibold text-slate-800 last:border-b-0">
                      {getTaxTargetLabel(item.taxType)}
                    </td>
                    <td className="border-b border-r border-slate-300 bg-slate-50 px-6 py-5 text-right text-[17px] font-medium text-slate-700 tabular-nums last:border-b-0">
                      {formatAmount(item.taxableAmount)}
                    </td>
                    <td className="border-b border-r border-slate-300 px-6 py-5 text-right text-[17px] font-semibold text-slate-800 last:border-b-0">
                      {taxLabel}
                    </td>
                    <td className="border-b border-slate-300 bg-slate-50 px-6 py-5 text-right text-[17px] font-medium text-slate-700 tabular-nums last:border-b-0">
                      {formatAmount(item.taxAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {items.length ? (
        <datalist id={itemOptionsId}>
          {items.map((it) => (
            <option key={it.id} value={it.name} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

export type LineItemsUiContent = {
  batchTax: string;
  change: string;
  printNote: string;
  addRow: string;
  subtotal: string;
  tax: string;
  total: string;
  itemHeaders: readonly string[];
  unit: string;
  /** Label for the per-row delete button */
  deleteRow: string;
};

export function DocumentLineItemsTable({
  ui,
  storageKey,
  preferDraftOverInitialRows,
  topNotice,
  onTotalsChange,
  onRowsChange,
  initialRows,
  compact = false,
  initialRowCount,
  hideSummaryRows = false,
  items,
  taxRounding,
  taxDisplay,
  withholdingType,
  documentType,
}: {
  ui: LineItemsUiContent;
  storageKey?: string;
  preferDraftOverInitialRows?: boolean;
  topNotice?: ReactNode;
  onTotalsChange?: (totals: LineItemTotals) => void;
  onRowsChange?: (rows: LineItemRow[]) => void;
  initialRows?: LineItemRow[];
  compact?: boolean;
  initialRowCount?: number;
  hideSummaryRows?: boolean;
  items?: ItemOption[];
  taxRounding?: TaxRounding;
  taxDisplay?: TaxDisplay;
  withholdingType?: WithholdingType;
  documentType?: "estimate" | "invoice" | "delivery_note" | "receipt";
}) {
  return (
    <CommonLineItemsTable
      batchTaxLabel={ui.batchTax}
      changeLabel={ui.change}
      printNote={ui.printNote}
      items={items}
      addRowLabel={ui.addRow}
      subtotalLabel={ui.subtotal}
      taxLabel={ui.tax}
      totalLabel={ui.total}
      itemHeaders={ui.itemHeaders}
      unitPlaceholder={ui.unit}
      deleteRowLabel={ui.deleteRow}
      storageKey={storageKey}
      preferDraftOverInitialRows={preferDraftOverInitialRows}
      topNotice={topNotice}
      onTotalsChange={onTotalsChange}
      onRowsChange={onRowsChange}
      initialRows={initialRows}
      compact={compact}
      initialRowCount={initialRowCount}
      hideSummaryRows={hideSummaryRows}
      taxRounding={taxRounding}
      taxDisplay={taxDisplay}
      withholdingType={withholdingType}
      documentType={documentType}
    />
  );
}

export function TaxRateSelect({
  defaultValue = "10%",
  compact = false,
  value,
  onChange,
}: TaxRateSelectProps) {
  const { lang } = useLanguage();
  const [internalSelected, setInternalSelected] = useState(defaultValue);
  const label = lang === "ko" ? "세율" : lang === "en" ? "Tax rate" : "税率";
  return (
    <select
      aria-label={label}
      value={value ?? internalSelected}
      onChange={(event) => onChange ? onChange(event.target.value) : setInternalSelected(event.target.value)}
      className={[
        "min-w-0 rounded-md border border-slate-300 bg-white px-2 text-slate-900 focus:border-[#1A7A57] focus:outline-none focus:ring-2 focus:ring-[#1A7A57]/20",
        compact ? "min-h-[34px] w-full py-1 text-[13px]" : "min-h-[48px] w-[148px] py-2 text-[16px]",
      ].join(" ")}
    >
      {TAX_RATE_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option === "軽減8%" ? (lang === "ko" ? "경감 8%" : lang === "en" ? "Reduced 8%" : option)
            : option === "対象外" ? (lang === "ko" ? "대상 외" : lang === "en" ? "Exempt" : option) : option}
        </option>
      ))}
    </select>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 5.5l.7 9.1A1.5 1.5 0 0 0 7.7 16h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-9.1M8.5 8.5v4.5M11.5 8.5v4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
