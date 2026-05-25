"use client";

import { useState, type ReactNode } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  DocumentBottomBar,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  FormField,
  HonorificField,
  SectionTitle,
  type LineItemTotals,
} from "../../../documents/new-document-shared";
import { DateFieldInput } from "../../../estimates/date-field-input";
import { getInvoiceContent } from "../../content";
import { InvoiceSubNav } from "../../invoice-sub-nav";

type TabKey = "basic" | "tax" | "email";

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, index) => String(index + 1));

export function NewPeriodicInvoiceClient() {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [dayMode, setDayMode] = useState<"day" | "last">("day");
  const [dayValue, setDayValue] = useState("1");
  const [endMode, setEndMode] = useState<"none" | "date">("none");
  const [endDate, setEndDate] = useState("");
  const [paymentMode, setPaymentMode] = useState<"none" | "due">("none");
  const [paymentMonth, setPaymentMonth] = useState("current");
  const [paymentDay, setPaymentDay] = useState("1");
  const [remarks, setRemarks] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);

  const tabs: { key: TabKey; label: string }[] = ui.periodicNewTabs.map((label, index) => ({
    key: (["basic", "tax", "email"] as TabKey[])[index],
    label,
  }));

  const lineItemsNotice = (
    <p className="text-[14px] leading-7 text-slate-600">{ui.periodicLineItemsNotice}</p>
  );

  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="periodic" />

      <div className="mx-auto max-w-[1260px] px-8 py-8 pb-32">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">{ui.periodicTitle}</h1>
          <a href="#" className="inline-flex items-center gap-1 text-[14px] text-cyan-600 hover:underline">
            {ui.periodicNewAbout}
            <span aria-hidden="true">↗</span>
          </a>
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

        {activeTab === "basic" ? (
          <>
            <div className="mt-10 grid gap-8 xl:grid-cols-2 xl:items-start">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionTitle title={ui.invoiceInfo} />
                <div className="mt-6 space-y-6">
                  <FormField label={ui.client} required={ui.required}>
                    <div className="flex gap-2">
                      <input className="field flex-1" />
                      <HonorificField honorific={ui.companyHonorific} />
                    </div>
                  </FormField>

                  <FormField label={ui.subject}>
                    <input
                      className="field"
                      value={subject}
                      maxLength={70}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                    <div className="mt-1.5 text-right text-xs text-slate-400">{subject.length}/70</div>
                  </FormField>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionTitle title={ui.cycle} />
                <div className="mt-6 space-y-6">
                  <FormField label={ui.startDate} required={ui.required}>
                    <DateFieldInput value={startDate} onChange={setStartDate} placeholder={ui.noDate} />
                  </FormField>

                  <FormField label={ui.cycle} required={ui.required}>
                    <select
                      className="field field-select"
                      value={cycle}
                      onChange={(event) => setCycle(event.target.value)}
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
                              setPaymentMonth(event.target.value);
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
                            value={paymentDay}
                            onFocus={() => setPaymentMode("due")}
                            onChange={(event) => {
                              setPaymentMode("due");
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
                  </FormField>

                  <a href="#" className="inline-block text-sm text-cyan-600 underline">
                    {ui.separateDateLink}
                  </a>
                </div>
              </section>
            </div>

            <DocumentLineItemsTable
              ui={ui}
              storageKey="periodic-invoice-new-line-items"
              topNotice={lineItemsNotice}
              onTotalsChange={setLineItemTotals}
            />

            <div className="mt-12">
              <label className="mb-2 block text-[18px] font-semibold text-slate-800">{ui.remarks}</label>
              <textarea
                className="field min-h-[140px]"
                value={remarks}
                maxLength={1000}
                onChange={(event) => setRemarks(event.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-cyan-600" />
                  {ui.documentRemarks}
                </label>
                <div className="flex items-center gap-2">
                  <a href="#" className="text-cyan-600 underline">
                    {ui.documentSettings} ↗
                  </a>
                  <span className="text-slate-400">
                    {remarks.length}/1000
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <SectionTitle title={ui.bankTransferTitle} />
              <p className="mt-2 text-sm text-slate-500">{ui.bankTransferNote}</p>
              <button type="button" className="mt-3 text-[15px] font-medium text-cyan-600">
                {ui.addBankAccount}
              </button>
            </div>
          </>
        ) : null}

        {activeTab === "tax" ? (
          <>
            <p className="mt-8 text-sm text-slate-600">
              {ui.taxSettingsNote}{" "}
              <a href="#" className="text-cyan-600 underline">
                {ui.taxSettingsLink} ↗
              </a>
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
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                      <input
                        type="radio"
                        name="periodicTaxRounding"
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
                  {[ui.withholdingNone, ui.withholdingWith, ui.withholdingWithout].map((label, index) => (
                    <label key={label} className="flex items-center gap-3 text-[16px] text-slate-800">
                      <input
                        type="radio"
                        name="periodicWithholding"
                        defaultChecked={index === 0}
                        className="h-4 w-4 accent-cyan-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <DocumentLineItemsTable
              ui={ui}
              storageKey="periodic-invoice-new-line-items"
              topNotice={lineItemsNotice}
              onTotalsChange={setLineItemTotals}
            />
          </>
        ) : null}

        {activeTab === "email" ? (
          <div className="mt-10 max-w-[760px] space-y-6">
            <section>
              <SectionTitle title={ui.periodicEmailTitle} />
              <p className="mt-3 text-sm text-slate-500">{ui.periodicEmailNote}</p>
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
                placeholder={ui.periodicEmailSubjectPlaceholder}
              />
            </FormField>

            <FormField label={ui.periodicEmailBody}>
              <textarea
                className="field min-h-[180px]"
                disabled={!emailEnabled}
                placeholder={ui.periodicEmailBodyPlaceholder}
              />
            </FormField>
          </div>
        ) : null}
      </div>

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
        "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition",
        checked
          ? "border-cyan-300 bg-cyan-50/40"
          : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="h-4 w-4 shrink-0 accent-cyan-600"
      />
      {label ? (
        <span className="min-w-[3rem] text-[15px] font-medium text-slate-800">{label}</span>
      ) : null}
      {children ? <div className="min-w-0 flex-1">{children}</div> : null}
    </label>
  );
}
