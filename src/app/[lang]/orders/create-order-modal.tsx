"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { AppLocale } from "@/contexts/language-context";
import {
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  formatDocumentAmount,
  type LineItemTotals,
} from "../documents/new-document-shared";
import { DateFieldInput } from "../estimates/date-field-input";
import { getEstimateContent } from "../estimates/content";
import type { getOrdersContent } from "./content";
import { StatusAddInlineForm } from "./status-add-inline-form";

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

function toOrderNumber(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}-001`;
}

export function CreateOrderModal({
  ui,
  lang,
  statuses,
  statusFormLabels,
  onClose,
  onAddCustomStatus,
}: {
  ui: ModalUi;
  lang: AppLocale;
  statuses: readonly string[];
  statusFormLabels: StatusFormLabels;
  onClose: () => void;
  onAddCustomStatus: (name: string) => void;
}) {
  const lineItemsUi = getEstimateContent(lang);
  const [orderDate, setOrderDate] = useState(() => toDateInputValue());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderTime, setOrderTime] = useState("");
  const [orderNumber] = useState(() => toOrderNumber());
  const [status, setStatus] = useState(statuses[0] ?? "");
  const [totals, setTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");

  function cancelAddStatus() {
    setIsAddingStatus(false);
    setNewStatusName("");
  }

  function confirmAddStatus() {
    const trimmed = newStatusName.trim();
    if (!trimmed || statuses.includes(trimmed)) {
      return;
    }

    onAddCustomStatus(trimmed);
    setStatus(trimmed);
    cancelAddStatus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[980px] min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-[18px] font-semibold text-slate-900">{ui.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-3">
          <div className="min-w-0 space-y-2.5">
            <CompactFormField label={ui.client} required={ui.required}>
              <input className={compactFieldClass} />
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
                <input
                  className={compactFieldClass}
                  value={orderTime}
                  onChange={(event) => setOrderTime(event.target.value)}
                />
              </CompactFormField>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <CompactFormField label={ui.orderNumber}>
                <input className={compactFieldClass} defaultValue={orderNumber} />
              </CompactFormField>
              <CompactFormField label={ui.subject}>
                <input className={compactFieldClass} />
              </CompactFormField>
            </div>

            <CompactFormField label={ui.status}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <select
                    className={compactSelectClass}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {!isAddingStatus ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingStatus(true)}
                      className="shrink-0 text-[13px] font-medium text-[#14a7bb] hover:underline"
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
              />
            </div>
          </div>

          <div className="mt-3 min-w-0">
            <DocumentLineItemsTable
              ui={lineItemsUi}
              storageKey="orders-create-modal-line-items-v3"
              onTotalsChange={setTotals}
              compact
              initialRowCount={5}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-4 text-[14px] text-slate-700">
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
            className="rounded bg-[#14a7bb] px-7 py-2 text-[14px] font-semibold text-white transition hover:bg-[#1096a8]"
          >
            {ui.save}
          </button>
        </div>
      </div>
    </div>
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
      <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="rounded bg-[#f59b45] px-1.5 py-0.5 text-[10px] font-bold text-white">{required}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
