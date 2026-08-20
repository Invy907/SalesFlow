"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { CreateOrderModal } from "./create-order-modal";
import { getOrdersContent } from "./content";
import { OrderSubNav } from "./order-sub-nav";
import { StatusAddInlineForm } from "./status-add-inline-form";

export type OrderStatusOption = {
  id: string;
  name: string;
  systemKey: string | null;
  count: number;
};

export type OrderRow = {
  id: string;
  orderNumber: string;
  clientName: string;
  subject: string;
  orderDate: string;
  deliveryDate: string;
  statusName: string;
  total: number;
};

export type OrderDetail = OrderRow & {
  comment: string;
  lineItems: { id: string; name: string; qty: number; unitPrice: number; amount: number }[];
};

const yen = (v: number) => `¥${Math.round(v).toLocaleString("ja-JP")}`;

export function OrdersClient({
  statuses,
  trashCount,
  activeStatusId,
  isTrash,
  rows,
  detail,
  query,
}: {
  statuses: OrderStatusOption[];
  trashCount: number;
  activeStatusId: string | null;
  isTrash: boolean;
  rows: OrderRow[];
  detail: OrderDetail | null;
  query: string;
}) {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [search, setSearch] = useState(query);

  const processed = statuses.filter((s) => s.systemKey === "processed");
  const unprocessed = statuses.filter((s) => s.systemKey === "unprocessed");
  const custom = statuses.filter((s) => !s.systemKey);

  const activeStatus = statuses.find((s) => s.id === activeStatusId);
  const activeLabel = isTrash ? ui.trash : (activeStatus?.name ?? ui.unprocessed);
  const activeCount = isTrash ? trashCount : rows.length;

  function navigate(next: { status?: string; q?: string; orderId?: string | null }) {
    const params = new URLSearchParams();
    const status = next.status ?? (isTrash ? "trash" : activeStatusId ?? "");
    const q = next.q ?? search;
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const orderId = next.orderId === undefined ? detail?.id : next.orderId;
    if (orderId) params.set("orderId", orderId);
    router.push(`/orders${params.toString() ? `?${params}` : ""}`);
  }

  function cancelAddStatus() {
    setIsAddingStatus(false);
    setNewStatusName("");
  }

  return (
    <SalesFlowShell activeItem="orders">
      <OrderSubNav active="management" />
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>

          <div className="flex w-full max-w-[720px] rounded border border-slate-300 bg-white">
            <input
              className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
              placeholder={ui.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate({ q: search.trim(), orderId: null });
              }}
            />
            <button className="border-l border-slate-300 px-4 text-sm text-slate-600">
              {ui.searchDetail}
            </button>
            <button
              type="button"
              onClick={() => navigate({ q: search.trim(), orderId: null })}
              className="border-l border-slate-300 px-5 text-[15px] font-medium text-slate-700"
            >
              {ui.search}
            </button>
          </div>
        </div>

        <div className="mt-6 grid min-h-[720px] grid-cols-1 gap-0 overflow-hidden rounded border border-slate-200 bg-white xl:grid-cols-[240px_320px_1fr]">
          <aside className="border-b border-slate-200 p-5 xl:border-r xl:border-b-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full rounded bg-[#f59b45] px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-[#ef8d32]"
            >
              {ui.createOrder}
            </button>

            <div className="mt-8">
              <p className="text-[13px] text-slate-400">{ui.status}</p>
              <div className="mt-3 space-y-2">
                {unprocessed.map((status) => (
                  <StatusRow
                    key={status.id}
                    label={status.name || ui.unprocessed}
                    count={status.count}
                    active={!isTrash && activeStatusId === status.id}
                    onClick={() => navigate({ status: status.id, orderId: null })}
                    variant="inbox"
                  />
                ))}

                {isAddingStatus ? (
                  <StatusAddInlineForm
                    placeholder={ui.statusPlaceholder}
                    cancelLabel={ui.cancel}
                    addLabel={ui.add}
                    value={newStatusName}
                    onChange={setNewStatusName}
                    onCancel={cancelAddStatus}
                    onSubmit={cancelAddStatus}
                  />
                ) : null}

                {custom.map((status) => (
                  <StatusRow
                    key={status.id}
                    label={status.name}
                    count={status.count}
                    active={!isTrash && activeStatusId === status.id}
                    onClick={() => navigate({ status: status.id, orderId: null })}
                    variant="inbox"
                  />
                ))}

                {custom.length > 0 || isAddingStatus ? (
                  <div className="border-t border-slate-200 pt-2" />
                ) : null}

                {processed.map((status) => (
                  <StatusRow
                    key={status.id}
                    label={status.name || ui.processed}
                    count={status.count}
                    active={!isTrash && activeStatusId === status.id}
                    onClick={() => navigate({ status: status.id, orderId: null })}
                    variant="inbox"
                  />
                ))}

                <StatusRow
                  label={ui.trash}
                  count={trashCount}
                  active={isTrash}
                  onClick={() => navigate({ status: "trash", orderId: null })}
                  variant="trash"
                />
              </div>

              {!isAddingStatus ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingStatus(true);
                    setNewStatusName("");
                  }}
                  className="mt-4 text-[14px] font-medium text-[#14a7bb] hover:underline"
                >
                  + {ui.addStatus}
                </button>
              ) : null}
            </div>
          </aside>

          <section className="border-b border-slate-200 xl:border-r xl:border-b-0">
            <div className="border-b border-slate-200 px-4 py-3 text-[15px] font-semibold text-slate-800">
              {activeLabel} {activeCount}
            </div>

            {rows.length === 0 ? (
              <div className="flex min-h-[560px] items-center justify-center px-4 text-[15px] text-slate-300">
                {ui.emptyList}
              </div>
            ) : (
              <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ orderId: row.id })}
                      className={[
                        "w-full px-4 py-3.5 text-left transition",
                        detail?.id === row.id ? "bg-cyan-50/70" : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[14px] font-semibold text-slate-900">
                          {row.clientName || ui.noClient}
                        </span>
                        <span className="shrink-0 text-[13px] tabular-nums text-slate-600">
                          {yen(row.total)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-slate-500">
                        {row.subject || ui.detail.noValue}
                      </p>
                      <p className="mt-1 text-[12px] tabular-nums text-slate-400">
                        {row.orderNumber} · {row.orderDate}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail ? (
            <OrderDetailPanel detail={detail} ui={ui} />
          ) : (
            <section className="flex min-h-[560px] items-center justify-center px-6 text-[15px] text-slate-300">
              {ui.emptyDetail}
            </section>
          )}
        </div>
      </div>

      {isModalOpen ? (
        <CreateOrderModal
          ui={ui.modal}
          lang={lang}
          statuses={statuses.filter((s) => s.systemKey !== "trash").map((s) => s.name)}
          statusFormLabels={{
            statusPlaceholder: ui.statusPlaceholder,
            cancel: ui.cancel,
            add: ui.add,
            addStatus: ui.addStatus,
          }}
          onClose={() => setIsModalOpen(false)}
          onAddCustomStatus={() => undefined}
        />
      ) : null}
    </SalesFlowShell>
  );
}

function OrderDetailPanel({
  detail,
  ui,
}: {
  detail: OrderDetail;
  ui: ReturnType<typeof getOrdersContent>;
}) {
  const d = ui.detail;
  const fields = [
    { label: d.client, value: detail.clientName || ui.noClient },
    { label: d.orderNumber, value: detail.orderNumber || d.noValue },
    { label: d.orderDate, value: detail.orderDate || d.noValue },
    { label: d.deliveryDate, value: detail.deliveryDate || d.noValue },
    { label: d.status, value: detail.statusName || d.noValue },
    { label: d.subject, value: detail.subject || d.noValue },
  ];

  return (
    <section className="min-h-[560px] px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[18px] font-semibold text-slate-900">
          {detail.clientName || ui.noClient}
        </h2>
        <p className="text-[18px] font-bold tabular-nums text-slate-900">{yen(detail.total)}</p>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="flex gap-3 text-[14px]">
            <dt className="w-[88px] shrink-0 text-slate-500">{field.label}</dt>
            <dd className="min-w-0 flex-1 truncate text-slate-800">{field.value}</dd>
          </div>
        ))}
      </dl>

      {detail.comment ? (
        <div className="mt-6">
          <p className="text-[13px] font-semibold text-slate-500">{d.comment}</p>
          <p className="mt-1 whitespace-pre-line text-[14px] leading-6 text-slate-700">
            {detail.comment}
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        <p className="text-[13px] font-semibold text-slate-500">{d.items}</p>
        {detail.lineItems.length === 0 ? (
          <p className="mt-3 text-[14px] text-slate-400">{d.noItems}</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[420px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f8fafc]">
                  {d.itemHeaders.map((header, i) => (
                    <th
                      key={header}
                      className={[
                        "px-3 py-2.5 font-semibold text-slate-700",
                        i === 0 ? "text-left" : "text-right",
                      ].join(" ")}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-2.5 text-slate-800">{item.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {item.qty.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {yen(item.unitPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">
                      {yen(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function StatusRow({
  label,
  count,
  active,
  variant,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  variant: "inbox" | "trash";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full cursor-pointer items-center justify-between rounded border px-3 py-2.5 text-left text-[14px] transition",
        active
          ? "border-cyan-500 bg-white font-medium text-slate-800"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="flex items-center gap-2.5">
        {variant === "trash" ? <TrashIcon active={active} /> : <InboxIcon active={active} />}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined ? <span className="tabular-nums">{count}</span> : null}
    </button>
  );
}

function InboxIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={["h-[18px] w-[18px] fill-current", active ? "text-cyan-600" : "text-slate-400"].join(" ")}
    >
      <path d="M2.5 5.5A2.5 2.5 0 0 1 5 3h10a2.5 2.5 0 0 1 2.5 2.5v9A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-9ZM5 4.5a1 1 0 0 0-1 1v8.5h12V5.5a1 1 0 0 0-1-1H5Zm2.75 2a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

function TrashIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={["h-[18px] w-[18px] fill-current", active ? "text-cyan-600" : "text-slate-400"].join(" ")}
    >
      <path d="M8.5 3a1 1 0 0 0-1 1v.5H5.75a.75.75 0 0 0 0 1.5h.708l.54 9.18A1.75 1.75 0 0 0 8.69 17h2.62a1.75 1.75 0 0 0 1.742-1.82l.54-9.18h.708a.75.75 0 0 0 0-1.5H12.5V4a1 1 0 0 0-1-1h-3ZM7 5h6l-.52 8.84a.25.25 0 0 1-.249.16H7.77a.25.25 0 0 1-.249-.16L7 5Zm2.25 2.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm3.5.75a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5Z" />
    </svg>
  );
}
