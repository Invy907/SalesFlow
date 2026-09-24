"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import type { AppLocale } from "@/contexts/language-context";
import {
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  formatDocumentAmount,
  toIsoDate,
  type LineItemRow,
  type LineItemTotals,
} from "../documents/new-document-shared";
import { DateFieldInput } from "../estimates/date-field-input";
import { getEstimateContent } from "../estimates/content";
import type { getOrdersContent } from "./content";
import { StatusAddInlineForm } from "./status-add-inline-form";
import { createOrder } from "@/lib/actions/orders";
import { taxCategoryFromLabel } from "@/lib/tax";
import type { ClientOptionRow } from "@/lib/db/clients";
import { ModalDialog } from "@/components/modal-dialog";

export type OrderLineItemInitial = LineItemRow;
export type OrderStatusSelectOption = { id: string; name: string };

type ModalUi = ReturnType<typeof getOrdersContent>["modal"];
type StatusFormLabels = Pick<
  ReturnType<typeof getOrdersContent>,
  "statusPlaceholder" | "cancel" | "add" | "addStatus"
>;

const compactFieldClass = "field w-full py-2 text-[14px]";
const compactSelectClass = "field-select field w-full min-w-0 py-2 text-[14px]";

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBlankLineRow(row: LineItemRow) {
  return !row.name && !row.qty && !row.unit && !row.price;
}

export function CreateOrderModal({
  ui,
  lang,
  statuses,
  clients,
  initial,
  statusFormLabels,
  onClose,
  onAddCustomStatus,
  onCreated,
}: {
  ui: ModalUi;
  lang: AppLocale;
  statuses: OrderStatusSelectOption[];
  clients: ClientOptionRow[];
  initial?: {
    sourceEstimateId?: string | null;
    clientId?: string | null;
    clientName?: string;
    subject?: string;
    lines?: LineItemRow[];
  };
  statusFormLabels: StatusFormLabels;
  onClose: () => void;
  onAddCustomStatus: (name: string) => void;
  onCreated: (orderId: string) => void;
}) {
  const lineItemsUi = getEstimateContent(lang);
  const [orderDate, setOrderDate] = useState(() => toDateInputValue());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [clientId, setClientId] = useState<string | null>(initial?.clientId ?? null);
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState(statuses[0]?.id ?? "");
  const [totals, setTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [rows, setRows] = useState<LineItemRow[]>(initial?.lines?.length ? initial.lines : []);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function cancelAddStatus() {
    setIsAddingStatus(false);
    setNewStatusName("");
  }

  function confirmAddStatus() {
    const trimmed = newStatusName.trim();
    if (!trimmed || statuses.some((s) => s.name === trimmed)) {
      return;
    }

    onAddCustomStatus(trimmed);
    cancelAddStatus();
  }

  function handleSave() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const lineItems = rows
        .filter((r) => !isBlankLineRow(r))
        .map((r) => {
          const taxCategory = taxCategoryFromLabel(r.tax);
          return {
            name: r.name,
            qty: r.qty === "" ? 1 : Number(r.qty),
            unit: r.unit,
            unitPrice: r.price === "" ? 0 : Number(r.price),
            taxCategory,
            taxRateSnapshot: 0,
          };
        });

      const result = await createOrder({
        clientId,
        subject,
        orderDate: new Date(toIsoDate(orderDate)),
        deliveryDate: deliveryDate ? new Date(toIsoDate(deliveryDate)) : null,
        statusId: status || null,
        comment,
        sourceEstimateId: initial?.sourceEstimateId ?? null,
        lineItems,
      });

      if (result.ok) {
        onCreated(result.data);
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  }

  return (
    <ModalDialog label={ui.title} onClose={onClose} className="max-w-[980px] overflow-hidden rounded-lg">
      <div className="relative flex max-h-[calc(100dvh_-_2rem)] w-full min-w-0 flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="min-w-0 text-[18px] font-semibold text-slate-900">{ui.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label={lang === "ko" ? "닫기" : lang === "en" ? "Close" : "閉じる"}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-2.5">
            <CompactFormField label={ui.client} required={ui.required}>
              <input
                className={compactFieldClass}
                list="order-client-options"
                value={clientName}
                onChange={(e) => {
                  const name = e.target.value;
                  const match = clients.find((c) => c.name === name);
                  setClientName(name);
                  setClientId(match ? match.id : null);
                }}
              />
              <datalist id="order-client-options">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </CompactFormField>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <CompactFormField label={ui.orderDate} required={ui.required}>
                <div className="[&_.field]:py-2 [&_.field]:text-[14px]">
                  <DateFieldInput value={orderDate} onChange={setOrderDate} placeholder="YYYY/MM/DD" />
                </div>
              </CompactFormField>
              <CompactFormField label={ui.deliveryDate}>
                <div className="[&_.field]:py-2 [&_.field]:text-[14px]">
                  <DateFieldInput value={deliveryDate} onChange={setDeliveryDate} placeholder="YYYY/MM/DD" />
                </div>
              </CompactFormField>
              <CompactFormField label={ui.time}>
                <input className={compactFieldClass} />
              </CompactFormField>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <CompactFormField label={ui.subject}>
                <input className={compactFieldClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </CompactFormField>
            </div>

            <CompactFormField label={ui.status}>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={compactSelectClass}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {statuses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {!isAddingStatus ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingStatus(true)}
                      className="shrink-0 text-[13px] font-medium text-[#0A4D34] hover:underline"
                    >
                      + {statusFormLabels.addStatus}
                    </button>
                  ) : null}
                </div>
                {isAddingStatus ? (
                  <StatusAddInlineForm
                    placeholder={statusFormLabels.statusPlaceholder}
                    cancelLabel={statusFormLabels.cancel}
                    addLabel={statusFormLabels.add}
                    value={newStatusName}
                    onChange={setNewStatusName}
                    onCancel={cancelAddStatus}
                    onSubmit={confirmAddStatus}
                  />
                ) : null}
              </div>
            </CompactFormField>

            <div>
              <textarea
                className={`${compactFieldClass} min-h-[72px] resize-none`}
                placeholder={ui.commentPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 min-w-0">
            <DocumentLineItemsTable
              ui={lineItemsUi}
              storageKey="orders-create-modal-line-items-v3"
              initialRows={rows.length ? rows : undefined}
              onTotalsChange={setTotals}
              onRowsChange={setRows}
              compact
              initialRowCount={5}
            />
          </div>

          {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
          {Object.keys(fieldErrors).length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-[13px] text-red-600">
              {Object.entries(fieldErrors).map(([key, msg]) => (
                <li key={key}>{msg}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-slate-700 [overflow-wrap:anywhere]">
            <span>
              {lineItemsUi.subtotal}{" "}
              <strong className="ml-1 tabular-nums">{formatDocumentAmount(totals.subtotal)} 円</strong>
            </span>
            <span>
              {lineItemsUi.tax}{" "}
              <strong className="ml-1 tabular-nums">{formatDocumentAmount(totals.tax)} 円</strong>
            </span>
            <span className="font-semibold text-slate-800">
              {lineItemsUi.total}{" "}
              <strong className="ml-1 text-[18px] tabular-nums">{formatDocumentAmount(totals.total)} 円</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="w-full rounded bg-[#0A4D34] px-7 py-2 text-[14px] font-semibold text-white transition hover:bg-[#083D29] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {ui.save}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

function CompactFormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="rounded bg-[#0A4D34] px-1.5 py-0.5 text-[10px] font-bold text-white">{required}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
