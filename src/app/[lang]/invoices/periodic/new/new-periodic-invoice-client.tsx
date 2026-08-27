"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition, type ReactNode } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { appHrefs } from "@/lib/app-hrefs";
import {
  DocumentBottomBar,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  FormField,
  HonorificField,
  SectionTitle,
  type LineItemRow,
  type LineItemTotals,
} from "../../../documents/new-document-shared";
import { taxCategoryFromLabel, taxRateSnapshotFor } from "@/lib/tax";
import { DateFieldInput } from "../../../estimates/date-field-input";
import { getInvoiceContent } from "../../content";
import { InvoiceSubNav } from "../../invoice-sub-nav";
import {
  createPeriodicSchedule,
  updatePeriodicSchedule,
} from "@/lib/actions/periodic-invoices";
import type { z } from "zod";
import type {
  taxDisplaySchema,
  taxRoundingSchema,
  withholdingTypeSchema,
} from "@/lib/validators/document";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";

type TaxDisplayMode = z.infer<typeof taxDisplaySchema>;
type TaxRounding = z.infer<typeof taxRoundingSchema>;
type WithholdingType = z.infer<typeof withholdingTypeSchema>;

type TabKey = "basic" | "tax" | "email";
type PeriodicCycleValue = "monthly" | "yearly" | "weekly";
type PaymentMonthValue = "current" | "next";

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, index) => String(index + 1));
const DRAFT_STORAGE_KEY = "periodic-invoice-new-line-items";

// 화면 라디오 순서 ↔ DB enum (신규 청구서 화면과 동일)
const TAX_DISPLAY_ORDER: TaxDisplayMode[] = ["separate", "included", "exempt"];
const TAX_ROUNDING_ORDER: TaxRounding[] = ["round_down", "round_up", "round_half"];
const WITHHOLDING_ORDER: WithholdingType[] = ["none", "with_recovery", "without_recovery"];

export type PeriodicClientOption = { id: string; name: string };

export type PeriodicFormDefaults = {
  taxDisplay: TaxDisplayMode;
  taxRounding: TaxRounding;
  withholdingType: WithholdingType;
  templateKey: string;
  remarks: string;
};

/** 편집 화면에서 넘어오는 기존 예약. 없으면 신규 작성. */
export type PeriodicScheduleFormValue = {
  id: string;
  clientId: string | null;
  clientName: string;
  subject: string;
  startDate: string;
  cycle: PeriodicCycleValue;
  dayMode: "day" | "last";
  dayValue: string;
  endMode: "none" | "date";
  endDate: string;
  paymentMode: "none" | "due";
  paymentMonth: PaymentMonthValue;
  paymentDayMode: "day" | "last";
  paymentDay: string;
  emailEnabled: boolean;
  emailSubject: string;
  emailBody: string;
  taxDisplay: TaxDisplayMode;
  taxRounding: TaxRounding;
  withholdingType: WithholdingType;
  templateKey: string;
  outputLocale: string;
  showClientHonorific: boolean;
  remarks: string;
  lineItems: LineItemRow[];
};

export function NewPeriodicInvoiceClient({
  clients,
  defaults,
  schedule,
}: {
  clients: PeriodicClientOption[];
  defaults: PeriodicFormDefaults;
  schedule?: PeriodicScheduleFormValue;
}) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const router = useRouter();
  const isEdit = Boolean(schedule);

  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [clientId, setClientId] = useState<string | null>(schedule?.clientId ?? null);
  const [clientName, setClientName] = useState(schedule?.clientName ?? "");
  const [subject, setSubject] = useState(schedule?.subject ?? "");
  const [startDate, setStartDate] = useState(schedule?.startDate ?? "");
  const [cycle, setCycle] = useState<PeriodicCycleValue>(schedule?.cycle ?? "monthly");
  const [dayMode, setDayMode] = useState<"day" | "last">(schedule?.dayMode ?? "day");
  const [dayValue, setDayValue] = useState(schedule?.dayValue ?? "1");
  const [endMode, setEndMode] = useState<"none" | "date">(schedule?.endMode ?? "none");
  const [endDate, setEndDate] = useState(schedule?.endDate ?? "");
  const [paymentMode, setPaymentMode] = useState<"none" | "due">(schedule?.paymentMode ?? "none");
  const [paymentMonth, setPaymentMonth] = useState<PaymentMonthValue>(
    schedule?.paymentMonth ?? "current",
  );
  const [paymentDayMode, setPaymentDayMode] = useState<"day" | "last">(
    schedule?.paymentDayMode ?? "day",
  );
  const [paymentDay, setPaymentDay] = useState(schedule?.paymentDay ?? "1");
  const [remarks, setRemarks] = useState(schedule?.remarks ?? defaults.remarks);
  const [emailEnabled, setEmailEnabled] = useState(schedule?.emailEnabled ?? false);
  const [emailSubject, setEmailSubject] = useState(schedule?.emailSubject ?? "");
  const [emailBody, setEmailBody] = useState(schedule?.emailBody ?? "");
  const [taxDisplay, setTaxDisplay] = useState<TaxDisplayMode>(
    schedule?.taxDisplay ?? defaults.taxDisplay,
  );
  const [taxRounding, setTaxRounding] = useState<TaxRounding>(
    schedule?.taxRounding ?? defaults.taxRounding,
  );
  const [withholdingType, setWithholdingType] = useState<WithholdingType>(
    schedule?.withholdingType ?? defaults.withholdingType,
  );

  const [rows, setRows] = useState<LineItemRow[]>(schedule?.lineItems ?? []);
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setLineItemTotals(next), []);

  const tabs: { key: TabKey; label: string }[] = ui.periodicNewTabs.map((label, index) => ({
    key: (["basic", "tax", "email"] as TabKey[])[index],
    label,
  }));

  const err = (key: string) =>
    errors[key] ? <p className="mt-1 text-[13px] text-red-600">{errors[key]}</p> : null;

  const lineItemsNotice = (
    <p className="text-[14px] leading-7 text-slate-600">{ui.periodicLineItemsNotice}</p>
  );

  function handleSave() {
    setError(null);
    setErrors({});

    startTransition(async () => {
      const lineItems = rows
        .filter((r) => r.name.trim() !== "" || r.price.trim() !== "")
        .map((r) => {
          const taxCategory = taxCategoryFromLabel(r.tax);
          return {
            name: r.name,
            qty: r.qty === "" ? 1 : r.qty,
            unit: r.unit,
            unitPrice: r.price === "" ? 0 : r.price,
            taxCategory,
            taxRateSnapshot: taxRateSnapshotFor(taxCategory),
          };
        });

      const input = {
        clientId,
        subject,
        startDate,
        cycle,
        dayMode,
        dayValue: dayMode === "day" ? dayValue : null,
        endMode,
        endDate: endMode === "date" ? endDate : null,
        paymentMode,
        paymentMonth: paymentMode === "due" ? paymentMonth : null,
        paymentDayMode,
        paymentDay: paymentMode === "due" && paymentDayMode === "day" ? paymentDay : null,
        emailEnabled,
        emailSubject,
        emailBody,
        taxDisplay,
        taxRounding,
        withholdingType,
        templateKey: schedule?.templateKey ?? defaults.templateKey,
        outputLocale: normalizeDocumentOutputLocale(schedule?.outputLocale, lang),
        showClientHonorific: schedule?.showClientHonorific ?? true,
        remarks,
        lineItems,
      };

      const result = schedule
        ? await updatePeriodicSchedule(schedule.id, input)
        : await createPeriodicSchedule(input);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
        return;
      }

      if (!isEdit && typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      router.push("/invoices/periodic");
      router.refresh();
    });
  }

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="periodic" />

      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:pb-32">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
            {isEdit ? ui.periodicEditTitle : ui.periodicTitle}
          </h1>
          <Link href={appHrefs.supportInvoiceGuide} className="inline-flex items-center gap-1 text-[14px] text-cyan-600 hover:underline">
            {ui.periodicNewAbout}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="mt-6 flex gap-8 border-b border-slate-200 text-[18px] text-slate-500">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
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

        {error ? <p className="mt-4 text-[14px] text-red-600">{error}</p> : null}

        <div className={activeTab === "basic" ? "" : "hidden"}>
          <div className="mt-10 grid gap-8 xl:grid-cols-2 xl:items-start">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle title={ui.invoiceInfo} />
              <div className="mt-6 space-y-6">
                <FormField label={ui.client} required={ui.required}>
                  <div className="flex gap-2">
                    <input
                      className="field flex-1"
                      list="sf-periodic-client-options"
                      value={clientName}
                      onChange={(event) => {
                        const name = event.target.value;
                        setClientName(name);
                        setClientId(clients.find((c) => c.name === name)?.id ?? null);
                      }}
                    />
                    <HonorificField honorific={ui.companyHonorific} />
                  </div>
                  <datalist id="sf-periodic-client-options">
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  {err("clientId")}
                </FormField>

                <FormField label={ui.subject}>
                  <input
                    className="field"
                    value={subject}
                    maxLength={70}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                  <div className="mt-1.5 text-right text-xs text-slate-400">{subject.length}/70</div>
                  {err("subject")}
                </FormField>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle title={ui.cycle} />
              <div className="mt-6 space-y-6">
                <FormField label={ui.startDate} required={ui.required}>
                  <DateFieldInput value={startDate} onChange={setStartDate} placeholder={ui.noDate} />
                  {err("startDate")}
                </FormField>

                <FormField label={ui.cycle} required={ui.required}>
                  <select
                    className="field field-select"
                    value={cycle}
                    onChange={(event) => setCycle(event.target.value as PeriodicCycleValue)}
                  >
                    <option value="monthly">{ui.cycleMonthly}</option>
                    <option value="yearly">{ui.cycleYearly}</option>
                    <option value="weekly">{ui.cycleWeekly}</option>
                  </select>

                  {cycle === "monthly" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <RadioChoice
                        name="periodicDayMode"
                        checked={dayMode === "day"}
                        onSelect={() => setDayMode("day")}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            className="field w-16 text-center"
                            value={dayValue}
                            disabled={dayMode !== "day"}
                            onChange={(event) =>
                              setDayValue(event.target.value.replace(/\D/g, "").slice(0, 2))
                            }
                          />
                          <span className="text-sm text-slate-600">{ui.daySuffix}</span>
                        </div>
                      </RadioChoice>
                      <RadioChoice
                        name="periodicDayMode"
                        checked={dayMode === "last"}
                        onSelect={() => setDayMode("last")}
                        label={ui.lastDay}
                      />
                    </div>
                  ) : null}
                  {err("dayValue")}
                </FormField>

                <FormField label={ui.endDate}>
                  <div className="space-y-2">
                    <RadioChoice
                      name="periodicEndMode"
                      checked={endMode === "none"}
                      onSelect={() => {
                        setEndMode("none");
                        setEndDate("");
                      }}
                      label={ui.endDateNone}
                    />
                    <RadioChoice
                      name="periodicEndMode"
                      checked={endMode === "date"}
                      onSelect={() => setEndMode("date")}
                    >
                      <DateFieldInput
                        value={endDate}
                        onChange={(value) => {
                          setEndMode("date");
                          setEndDate(value);
                        }}
                        placeholder={ui.noDate}
                        inactive={endMode === "none"}
                        onActivate={() => setEndMode("date")}
                      />
                    </RadioChoice>
                  </div>
                  {err("endDate")}
                </FormField>

                <FormField label={ui.paymentDue}>
                  <div className="space-y-2">
                    <RadioChoice
                      name="periodicPaymentMode"
                      checked={paymentMode === "none"}
                      onSelect={() => setPaymentMode("none")}
                      label={ui.endDateNone}
                    />
                    <RadioChoice
                      name="periodicPaymentMode"
                      checked={paymentMode === "due"}
                      onSelect={() => setPaymentMode("due")}
                    >
                      <div className="flex flex-wrap gap-2">
                        <select
                          className={[
                            "field field-select min-w-[120px] flex-1",
                            paymentMode !== "due" ? "opacity-60" : "",
                          ].join(" ")}
                          value={paymentMonth}
                          onFocus={() => setPaymentMode("due")}
                          onChange={(event) => {
                            setPaymentMode("due");
                            setPaymentMonth(event.target.value as PaymentMonthValue);
                          }}
                        >
                          <option value="current">{ui.paymentDueMonthCurrent}</option>
                          <option value="next">{ui.paymentDueMonthNext}</option>
                        </select>
                        <select
                          className={[
                            "field field-select min-w-[100px] flex-1",
                            paymentMode !== "due" ? "opacity-60" : "",
                          ].join(" ")}
                          value={paymentDayMode === "last" ? "last" : paymentDay}
                          onFocus={() => setPaymentMode("due")}
                          onChange={(event) => {
                            setPaymentMode("due");
                            if (event.target.value === "last") {
                              setPaymentDayMode("last");
                              return;
                            }
                            setPaymentDayMode("day");
                            setPaymentDay(event.target.value);
                          }}
                        >
                          {PAYMENT_DAYS.map((day) => (
                            <option key={day} value={day}>
                              {day}
                              {ui.daySuffix}
                            </option>
                          ))}
                          <option value="last">{ui.lastDay}</option>
                        </select>
                      </div>
                    </RadioChoice>
                  </div>
                  {err("paymentDay")}
                </FormField>

                <Link href={appHrefs.settingsDocumentDefaults} className="inline-block text-sm text-cyan-600 underline">
                  {ui.separateDateLink}
                </Link>
              </div>
            </section>
          </div>
        </div>

        <div className={activeTab === "tax" ? "" : "hidden"}>
          <p className="mt-8 text-sm text-slate-600">
            {ui.taxSettingsNote}{" "}
            <Link href={appHrefs.settingsDocumentDefaults} className="text-cyan-600 underline">
              {ui.taxSettingsLink} ↗
            </Link>
          </p>

          <div className="mt-10 space-y-10">
            <section>
              <SectionTitle title={ui.taxSettingsTitle} />
              <div className="mt-4 space-y-3">
                {[ui.taxSeparate, ui.taxIncluded, ui.taxExempt].map((label, index) => (
                  <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                    <input
                      type="radio"
                      name="periodicTaxDisplay"
                      checked={taxDisplay === TAX_DISPLAY_ORDER[index]}
                      onChange={() => setTaxDisplay(TAX_DISPLAY_ORDER[index])}
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
                      name="periodicTaxRounding"
                      checked={taxRounding === TAX_ROUNDING_ORDER[index]}
                      onChange={() => setTaxRounding(TAX_ROUNDING_ORDER[index])}
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
                <Link href={appHrefs.supportInvoiceGuide} className="text-sm text-cyan-600 underline">
                  {ui.withholdingLink} ↗
                </Link>
              </p>
              <div className="mt-4 space-y-3">
                {[ui.withholdingNone, ui.withholdingWith, ui.withholdingWithout].map((label, index) => (
                  <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                    <input
                      type="radio"
                      name="periodicWithholding"
                      checked={withholdingType === WITHHOLDING_ORDER[index]}
                      onChange={() => setWithholdingType(WITHHOLDING_ORDER[index])}
                      className="h-4 w-4 accent-cyan-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* 명세는 기본정보·과세설정 탭이 공유한다. 탭 전환으로 입력이 날아가지 않게 한 번만 마운트한다. */}
        <div className={activeTab === "email" ? "hidden" : ""}>
          <DocumentLineItemsTable
            ui={ui}
            storageKey={isEdit ? undefined : DRAFT_STORAGE_KEY}
            initialRows={schedule?.lineItems}
            topNotice={lineItemsNotice}
            onTotalsChange={handleTotalsChange}
            onRowsChange={handleRowsChange}
          />
          {err("lineItems")}

          <div className="mt-12">
            <label className="mb-2 block text-[18px] font-semibold text-slate-800">{ui.remarks}</label>
            <textarea
              className="field min-h-[140px]"
              value={remarks}
              maxLength={1000}
              onChange={(event) => setRemarks(event.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <span>{ui.periodicLineItemsNotice}</span>
              <span className="text-slate-400">{remarks.length}/1000</span>
            </div>
          </div>
        </div>

        <div className={activeTab === "email" ? "" : "hidden"}>
          <div className="mt-10 max-w-[760px] space-y-6">
            <section>
              <SectionTitle title={ui.periodicEmailTitle} />
              <p className="mt-3 text-sm text-slate-500">{ui.periodicEmailNote}</p>
              <p className="mt-2 text-sm text-slate-500">{ui.periodicEmailVars}</p>
            </section>

            <label className="flex items-center gap-3 text-[16px] text-slate-800">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(event) => setEmailEnabled(event.target.checked)}
                className="h-4 w-4 accent-cyan-600"
              />
              {ui.periodicEmailEnable}
            </label>

            <FormField label={ui.periodicEmailSubject}>
              <input
                className="field"
                disabled={!emailEnabled}
                value={emailSubject}
                maxLength={200}
                onChange={(event) => setEmailSubject(event.target.value)}
                placeholder={ui.periodicEmailSubjectPlaceholder}
              />
              {err("emailSubject")}
            </FormField>

            <FormField label={ui.periodicEmailBody}>
              <textarea
                className="field min-h-[180px]"
                disabled={!emailEnabled}
                value={emailBody}
                maxLength={4000}
                onChange={(event) => setEmailBody(event.target.value)}
                placeholder={ui.periodicEmailBodyPlaceholder}
              />
              {err("emailBody")}
            </FormField>
          </div>
        </div>
      </div>

      <DocumentBottomBar
        subtotalLabel={ui.subtotal}
        taxLabel={ui.tax}
        totalLabel={ui.total}
        saveLabel={pending ? ui.periodicSaving : ui.save}
        totals={lineItemTotals}
        onSave={handleSave}
        pending={pending}
        error={error}
      />
    </SalesFlowShell>
  );
}

function RadioChoice({
  name,
  checked,
  onSelect,
  label,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition",
        checked ? "border-cyan-500 bg-cyan-50/60" : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 h-4 w-4 accent-cyan-600"
      />
      <div className="min-w-0 flex-1">
        {label ? <span className="text-[15px] text-slate-700">{label}</span> : children}
      </div>
    </label>
  );
}
