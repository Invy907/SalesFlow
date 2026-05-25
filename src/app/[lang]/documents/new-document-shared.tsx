"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LocalizedFileInput } from "@/components/localized-file-input";
import { DateFieldInput } from "../estimates/date-field-input";
import { toDateInputValue } from "../estimates/date-field-utils";

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

type SenderDetailFieldsProps = {
  storagePrefix: string;
  buttonLabel?: string;
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
  topNotice?: ReactNode;
  onTotalsChange?: (totals: LineItemTotals) => void;
  storageKey?: string;
  compact?: boolean;
  initialRowCount?: number;
  hideSummaryRows?: boolean;
};

type TaxRateSelectProps = {
  defaultValue?: string;
  compact?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

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
};

export type LineItemTotals = {
  subtotal: number;
  tax: number;
  total: number;
};

function createEmptyRow(): LineItemRow {
  return { name: "", qty: "", unit: "", price: "", tax: "10%" };
}

function parseNumberInput(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTaxRate(value: string) {
  if (value === "\u5bfe\u8c61\u5916") {
    return 0;
  }
  if (value === "\u8efd\u6e1b8%" || value === "8%") {
    return 0.08;
  }
  if (value === "5%") {
    return 0.05;
  }
  return 0.1;
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
};

export function DocumentBottomBar({
  subtotalLabel,
  taxLabel,
  totalLabel,
  saveLabel,
  totals,
}: DocumentBottomBarProps) {
  return (
    <div className="sticky bottom-0 border-t border-slate-300 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1260px] items-center justify-between gap-4 px-8 py-4">
        <div className="flex items-center gap-8 text-[18px] text-slate-700">
          <span>
            {subtotalLabel}{" "}
            <strong className="ml-2 text-[22px] tabular-nums">{formatDocumentAmount(totals.subtotal)} 円</strong>
          </span>
          <span>
            {taxLabel}{" "}
            <strong className="ml-2 text-[22px] tabular-nums">{formatDocumentAmount(totals.tax)} 円</strong>
          </span>
        </div>
        <div className="flex items-center gap-10">
          <span className="text-[22px] font-semibold text-slate-800">
            {totalLabel}{" "}
            <strong className="ml-4 text-[44px] tabular-nums">{formatDocumentAmount(totals.total)} 円</strong>
          </span>
          <button
            type="button"
            className="rounded bg-[#14a7bb] px-12 py-4 text-[18px] font-semibold text-white transition hover:bg-[#1096a8]"
          >
            {saveLabel}
          </button>
        </div>
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
    <div data-active-item={activeItem} className="mx-auto max-w-[1260px] px-8 py-10 pb-32">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{title}</h1>
        {titleAddon}
        {titleLink}
      </div>

      <div className="mt-8 flex gap-8 border-b border-slate-200 text-[18px] text-slate-500">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
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

      {children}
    </div>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <h2 className="text-[24px] font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-[16px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="rounded bg-[#f59b45] px-2 py-0.5 text-xs font-bold text-white">{required}</span>
        ) : null}
      </div>
      {children}
    </label>
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
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <FormField key={field.label} label={field.label} required={field.required}>
          <DateFieldInput value={field.value} onChange={field.onChange} placeholder={field.placeholder} />
        </FormField>
      ))}
    </div>
  );
}

export function useDocumentDateFields(initialPrimaryValue?: string) {
  const [primaryDate, setPrimaryDate] = useState(() => toDateInputValue(initialPrimaryValue));
  const [secondaryDate, setSecondaryDate] = useState("");

  return {
    primaryDate,
    setPrimaryDate,
    secondaryDate,
    setSecondaryDate,
  };
}

export function HonorificField({ honorific }: { honorific?: string }) {
  return (
    <div className="flex w-20 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xl text-slate-700">
      {honorific || "\u69d8"}
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
              <input className="field flex-1" />
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
            {numberHint ? <div className="mb-2 text-sm text-cyan-600">{numberHint}</div> : null}
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
          <button className="text-[15px] font-medium text-cyan-600">{detailLinkLabel}</button>
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
        <div className="flex gap-3">
          <input className="field w-[180px]" placeholder={postalCodePlaceholder} />
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
          <input className="field flex-1" placeholder={contactPlaceholder} />
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
  buttonLabel = "詳細（住所, 連絡先など）",
}: SenderDetailFieldsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-2 text-[15px] font-medium text-cyan-600"
      >
        <span className={["text-xs transition", isOpen ? "rotate-90" : ""].join(" ")}>▶</span>
        <span>{buttonLabel}</span>
      </button>

      {isOpen ? (
        <div className="mt-5 space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <FormField label="郵便番号">
            <p className="mb-2 text-sm text-slate-500">000-0000形式(半角)で入力してください</p>
            <div className="flex flex-wrap gap-3">
              <input
                name={`${storagePrefix}PostalCode`}
                className="field w-[180px]"
                placeholder="000-0000"
              />
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700"
              >
                郵便番号から検索
              </button>
            </div>
          </FormField>

          <FormField label="住所">
            <input name={`${storagePrefix}Address1`} className="field" />
            <input name={`${storagePrefix}Address2`} className="field mt-2" />
            <input name={`${storagePrefix}Address3`} className="field mt-2" />
          </FormField>

          <FormField label="TEL">
            <input name={`${storagePrefix}Tel`} className="field max-w-[320px]" />
          </FormField>

          <FormField label="FAX">
            <input name={`${storagePrefix}Fax`} className="field max-w-[320px]" />
          </FormField>

          <FormField label="メールアドレス">
            <input name={`${storagePrefix}Email`} className="field" />
          </FormField>

          <FormField label="登録番号">
            <p className="mb-2 text-sm text-slate-500">
              適格請求書(インボイス)に記載が必要な番号です。{" "}
              <a href="#" className="text-cyan-600 underline">
                適格請求書について詳しく
              </a>
            </p>
            <input name={`${storagePrefix}InvoiceNumber`} className="field max-w-[320px]" />
          </FormField>

          <FormField label="ロゴ">
            <p className="text-sm text-slate-500">窓付封筒対応テンプレートはロゴが印字されません</p>
            <p className="mb-3 text-sm text-slate-500">1MB までの png/jpeg/gif形式に対応</p>
            <LocalizedFileInput name={`${storagePrefix}Logo`} accept=".png,.jpg,.jpeg,.gif" />
          </FormField>

          <FormField label="印影">
            <p className="mb-3 text-sm text-slate-500">1MB までの png/jpeg/gif形式に対応</p>
            <LocalizedFileInput name={`${storagePrefix}Seal`} accept=".png,.jpg,.jpeg,.gif" />
          </FormField>
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
  topNotice,
  onTotalsChange,
  storageKey,
  compact = false,
  initialRowCount,
  hideSummaryRows = false,
}: LineItemsTableProps) {
  const defaultRowCount = initialRowCount ?? (compact ? 1 : 5);
  const [rows, setRows] = useState<LineItemRow[]>(() => Array.from({ length: defaultRowCount }, createEmptyRow));
  const [bulkTax, setBulkTax] = useState("10%");
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setHasLoaded(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { rows?: LineItemRow[]; bulkTax?: string };
        if (saved.rows?.length) {
          setRows(saved.rows);
        }
        if (saved.bulkTax) {
          setBulkTax(saved.bulkTax);
        }
      }
    } catch {
      // Ignore invalid draft data and keep defaults.
    }

    setHasLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !hasLoaded || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        rows,
        bulkTax,
      }),
    );
  }, [bulkTax, hasLoaded, rows, storageKey]);

  const updateRow = (index: number, key: keyof LineItemRow, nextValue: string) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: nextValue } : row)),
    );
  };

  const applyBulkTax = () => {
    setRows((current) => current.map((row) => ({ ...row, tax: bulkTax })));
  };

  const addRow = () => {
    setRows((current) => [...current, createEmptyRow()]);
  };

  const subtotal = rows.reduce((sum, row) => sum + parseNumberInput(row.qty) * parseNumberInput(row.price), 0);
  const taxBreakdown = TAX_RATE_OPTIONS.map((taxType) => {
    const taxableAmount = rows.reduce((sum, row) => {
      if (row.tax !== taxType) {
        return sum;
      }
      return sum + parseNumberInput(row.qty) * parseNumberInput(row.price);
    }, 0);

    const rate = getTaxRate(taxType);
    const taxAmount = Math.floor(taxableAmount * rate);

    return {
      taxType,
      taxableAmount,
      taxAmount,
      rate,
    };
  }).filter((item) => item.taxableAmount > 0);

  const tax = taxBreakdown.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal + tax;
  const visibleTaxBreakdown = taxBreakdown.filter((item) => item.rate > 0);
  const showTaxBreakdown = visibleTaxBreakdown.length > 0;

  useEffect(() => {
    onTotalsChange?.({ subtotal, tax, total });
  }, [onTotalsChange, subtotal, tax, total]);

  return (
    <div className={compact ? "mt-2 min-w-0" : "mt-12"}>
      {topNotice}

      <div className={["flex flex-wrap items-center justify-end gap-2 md:flex-nowrap", compact ? "mb-2" : "mb-4"].join(" ")}>
        <span className={["shrink-0 whitespace-nowrap text-slate-600", compact ? "text-[13px]" : ""].join(" ")}>
          {batchTaxLabel}
        </span>
        <TaxRateSelect value={bulkTax} onChange={setBulkTax} compact={compact} />
        <span className={["shrink-0 whitespace-nowrap text-slate-600", compact ? "text-[13px]" : ""].join(" ")}>
          {"\u306b"}
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

      <div className={compact ? "min-w-0 rounded border border-slate-300" : "overflow-x-auto rounded border border-slate-300"}>
        <table
          className={[
            "w-full table-fixed border-collapse bg-white text-left",
            compact ? "min-w-0" : "min-w-[1080px]",
          ].join(" ")}
        >
          <colgroup>
            <col className="w-[29%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className={["bg-[#f5f7fa] text-slate-800", compact ? "text-[13px]" : "text-[16px]"].join(" ")}>
            <tr>
              {itemHeaders.map((header) => (
                <th
                  key={header}
                  className={[
                    "border-b border-r border-slate-300 text-center font-semibold last:border-r-0",
                    compact ? "px-2 py-1.5" : "px-4 py-4",
                  ].join(" ")}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const amount = parseNumberInput(row.qty) * parseNumberInput(row.price);
              const inputClass = compact
                ? "w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-1 py-1 text-[13px] leading-normal text-slate-800 outline-none transition focus:border-cyan-400"
                : "w-full border-0 border-b border-dashed border-slate-300 bg-transparent px-2 py-2 text-[17px] leading-normal text-slate-800 outline-none transition focus:border-cyan-400";

              return (
                <tr key={index}>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      className={inputClass}
                      value={row.name}
                      onChange={(event) => updateRow(index, "name", event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      inputMode="decimal"
                      className={[inputClass, "text-right"].join(" ")}
                      value={row.qty}
                      onChange={(event) => updateRow(index, "qty", event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      className={[inputClass, "text-center text-slate-700"].join(" ")}
                      placeholder={unitPlaceholder}
                      value={row.unit}
                      onChange={(event) => updateRow(index, "unit", event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <input
                      inputMode="numeric"
                      className={[inputClass, "text-right"].join(" ")}
                      value={row.price}
                      onChange={(event) => updateRow(index, "price", event.target.value)}
                    />
                  </td>
                  <td className={["border-b border-r border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <TaxRateSelect compact value={row.tax} onChange={(value) => updateRow(index, "tax", value)} />
                  </td>
                  <td className={["border-b border-slate-200 align-middle", compact ? "px-1 py-1" : "px-3 py-2"].join(" ")}>
                    <div
                      className={[
                        "flex items-center justify-end rounded-md bg-slate-50 text-right font-medium tabular-nums leading-normal text-slate-700",
                        compact ? "min-h-[30px] px-2 py-0.5 text-[13px]" : "min-h-[52px] px-4 py-2 text-[17px]",
                      ].join(" ")}
                    >
                      {row.qty || row.price ? formatAmount(amount) : ""}
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              {hideSummaryRows ? (
                <td colSpan={6} className={compact ? "px-3 py-2" : "px-4 py-4"}>
                  <button
                    type="button"
                    onClick={addRow}
                    className={[
                      "font-medium text-cyan-600",
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
                        "font-medium text-cyan-600",
                        compact ? "text-[14px]" : "mt-4 text-xl",
                      ].join(" ")}
                    >
                      {addRowLabel}
                    </button>
                  </td>
                  <td colSpan={2} className="p-0">
                    <table className="w-full">
                      <tbody>
                        {[
                          { label: subtotalLabel, value: subtotal },
                          { label: taxLabel, value: tax },
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
          <div className="w-full max-w-[560px] overflow-hidden rounded border border-slate-300 bg-white">
            <table className="w-full border-collapse">
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
};

export function DocumentLineItemsTable({
  ui,
  storageKey,
  topNotice,
  onTotalsChange,
  compact = false,
  initialRowCount,
  hideSummaryRows = false,
}: {
  ui: LineItemsUiContent;
  storageKey?: string;
  topNotice?: ReactNode;
  onTotalsChange?: (totals: LineItemTotals) => void;
  compact?: boolean;
  initialRowCount?: number;
  hideSummaryRows?: boolean;
}) {
  return (
    <CommonLineItemsTable
      batchTaxLabel={ui.batchTax}
      changeLabel={ui.change}
      printNote={ui.printNote}
      addRowLabel={ui.addRow}
      subtotalLabel={ui.subtotal}
      taxLabel={ui.tax}
      totalLabel={ui.total}
      itemHeaders={ui.itemHeaders}
      unitPlaceholder={ui.unit}
      storageKey={storageKey}
      topNotice={topNotice}
      onTotalsChange={onTotalsChange}
      compact={compact}
      initialRowCount={initialRowCount}
      hideSummaryRows={hideSummaryRows}
    />
  );
}

export function TaxRateSelect({
  defaultValue = "10%",
  compact = false,
  value,
  onChange,
}: TaxRateSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState(defaultValue);
  const selected = value ?? internalSelected;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={compact ? "relative w-full min-w-0" : "relative w-[148px]"}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={[
          "flex w-full items-center justify-between gap-1 rounded-md border border-sky-300 bg-white px-2 text-left leading-normal text-slate-900 shadow-[0_0_0_1px_rgba(125,211,252,0.08)] transition",
          compact ? "min-h-[30px] py-1 text-[13px]" : "min-h-[52px] py-2.5 text-[16px]",
          isOpen ? "ring-2 ring-sky-200" : "hover:border-sky-400",
        ].join(" ")}
      >
        <span className="min-w-0 flex-1 font-medium">{selected}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500">
          <path
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+2px)] z-30 w-full overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
          {TAX_RATE_OPTIONS.map((option) => {
            const isSelected = option === selected;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (onChange) {
                    onChange(option);
                  } else {
                    setInternalSelected(option);
                  }
                  setIsOpen(false);
                }}
                className={[
                  "block w-full px-4 py-3 text-left text-[16px] transition",
                  isSelected
                    ? "bg-[#2d6fd2] font-semibold text-white"
                    : "bg-white text-slate-900 hover:bg-sky-50",
                ].join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
