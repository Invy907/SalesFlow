"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  DocumentBottomBar,
  DocumentDateFieldRow,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  HonorificField as SharedHonorificField,
  type LineItemRow,
  type LineItemTotals,
} from "../documents/new-document-shared";
import { createInvoice } from "@/lib/actions/invoices";
import { taxCategoryFromLabel, taxRateSnapshotFor } from "@/lib/tax";
import { toIsoDate } from "../estimates/date-field-utils";
import { getInvoiceContent } from "./content";
import type { BankAccountOption, ClientOption } from "./invoice-form-data";

export type InvoiceFormInitial = {
  clientId: string | null;
  clientName: string;
  issueDate: string;
  paymentDue: string;
  documentNumber: string;
  subject: string;
  senderCompanyName: string;
  taxDisplay: string;
  taxRounding: string;
  templateKey: string;
  templateMessage: string;
  remarks: string;
  bankAccountIds: string[];
  lines: LineItemRow[];
};

export function InvoiceFormClient({
  initial,
  clients,
  bankAccounts,
}: {
  initial: InvoiceFormInitial;
  clients: ClientOption[];
  bankAccounts: BankAccountOption[];
}) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const router = useRouter();

  const [totals, setTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>(initial.lines);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [primaryDate, setPrimaryDate] = useState(() =>
    initial.issueDate ? initial.issueDate.replace(/\//g, "-") : "",
  );
  const [secondaryDate, setSecondaryDate] = useState(() =>
    initial.paymentDue ? initial.paymentDue.replace(/\//g, "-") : "",
  );

  const handleRowsChange = useCallback((next: LineItemRow[]) => setRows(next), []);
  const handleTotalsChange = useCallback((next: LineItemTotals) => setTotals(next), []);

  function toggleBankAccount(id: string) {
    setForm((f) => {
      const has = f.bankAccountIds.includes(id);
      if (has) return { ...f, bankAccountIds: f.bankAccountIds.filter((x) => x !== id) };
      if (f.bankAccountIds.length >= 3) return f;
      return { ...f, bankAccountIds: [...f.bankAccountIds, id] };
    });
  }

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
        taxDisplay: form.taxDisplay as "separate" | "separate_on_invoice" | "included" | "exempt",
        taxRounding: form.taxRounding as "round_down" | "round_up" | "round_half",
        withholdingType: "none",
        templateKey: form.templateKey,
        templateMessage: form.templateMessage,
        remarks: form.remarks,
        recipientSnapshot: { clientName: form.clientName },
        senderSnapshot: { companyName: form.senderCompanyName },
        bankAccountIds: form.bankAccountIds,
        lineItems,
      });

      if (!result.ok) {
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
          {ui.newTitle}
        </h1>

        <div className="mt-10 grid gap-8 xl:grid-cols-2">
          <section>
            <h2 className="border-b border-slate-200 pb-3 text-[24px] font-semibold text-slate-900">
              {ui.invoiceInfo}
            </h2>
            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="mb-2 block font-semibold">{ui.client}</span>
                <div className="flex gap-2">
                  <input
                    className="field flex-1"
                    list="invoice-client-options"
                    value={form.clientName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const match = clients.find((c) => c.name === name);
                      setForm((f) => ({
                        ...f,
                        clientName: name,
                        clientId: match?.id ?? null,
                      }));
                    }}
                  />
                  <SharedHonorificField honorific={ui.companyHonorific} />
                </div>
                <datalist id="invoice-client-options">
                  {clients.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </label>

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

              <label className="block">
                <span className="mb-2 block font-semibold">{ui.subject}</span>
                <input
                  className="field"
                  maxLength={70}
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="border-b border-slate-200 pb-3 text-[24px] font-semibold text-slate-900">
              振込先
            </h2>
            <div className="mt-5 space-y-3">
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  入金口座が未登録です。設定から登録してください。
                </p>
              ) : (
                bankAccounts.map((b) => (
                  <label key={b.id} className="flex items-center gap-3 text-[15px]">
                    <input
                      type="checkbox"
                      checked={form.bankAccountIds.includes(b.id)}
                      onChange={() => toggleBankAccount(b.id)}
                      className="h-4 w-4 accent-cyan-600"
                    />
                    <span>
                      {b.bankName} {b.branchName} {b.accountNumber}
                    </span>
                  </label>
                ))
              )}
            </div>
          </section>
        </div>

        <DocumentLineItemsTable
          ui={ui}
          storageKey="invoice-new-line-items"
          onTotalsChange={handleTotalsChange}
          onRowsChange={handleRowsChange}
        />

        <label className="mt-12 block">
          <span className="mb-2 block text-[18px] font-semibold text-slate-800">{ui.remarks}</span>
          <textarea
            className="field min-h-[140px]"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
        </label>
      </div>

      <DocumentBottomBar
        subtotalLabel={ui.subtotal}
        taxLabel={ui.tax}
        totalLabel={ui.total}
        saveLabel={ui.save}
        totals={totals}
        onSave={handleSave}
        pending={pending}
        error={error}
      />
    </SalesFlowShell>
  );
}
