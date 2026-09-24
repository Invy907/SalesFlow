"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { CreateOrderModal, type OrderLineItemInitial } from "./create-order-modal";
import { getOrdersContent } from "./content";
import { ListPageTabs, ListPrimaryButton, ListSearchBar } from "../list-page-shared";
import { OrderSubNav } from "./order-sub-nav";
import { StatusAddInlineForm } from "./status-add-inline-form";
import { createOrderStatus } from "@/lib/actions/orders";
import type { ClientOptionRow } from "@/lib/db/clients";

export type OrderCreateInitial = {
  sourceEstimateId?: string | null;
  clientId?: string | null;
  clientName?: string;
  subject?: string;
  lines?: OrderLineItemInitial[];
};

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
  tabCounts,
  activeTab,
  subStatusId,
  rows,
  detail,
  query,
  clients,
  createInitial,
}: {
  statuses: OrderStatusOption[];
  tabCounts: { unprocessed: number; processed: number; trashed: number };
  activeTab: number;
  subStatusId: string | null;
  rows: OrderRow[];
  detail: OrderDetail | null;
  query: string;
  clients: ClientOptionRow[];
  createInitial?: OrderCreateInitial | null;
}) {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);
  const router = useRouter();
  const [statusPending, startStatusTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(Boolean(createInitial));
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [search, setSearch] = useState(query);
  const [extraStatuses, setExtraStatuses] = useState<OrderStatusOption[]>([]);

  const allStatuses = [...statuses, ...extraStatuses];

  const tabLabels = [
    `${ui.unprocessed} ${tabCounts.unprocessed}`,
    `${ui.processed} ${tabCounts.processed}`,
    `${ui.trash} ${tabCounts.trashed}`,
  ];

  const subFilterStatuses = allStatuses.filter(
    (s) => s.systemKey === "unprocessed" || s.systemKey === null,
  );

  function navigate(next: {
    tab?: number;
    status?: string | null;
    q?: string;
    orderId?: string | null;
  }) {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    params.set("tab", String(tab));
    const q = next.q ?? search;
    if (q) params.set("q", q);
    if (tab === 0 && next.status) params.set("status", next.status);
    const orderId = next.orderId === undefined ? detail?.id : next.orderId;
    if (orderId) params.set("orderId", orderId);
    router.push(`/${lang}/orders${params.toString() ? `?${params}` : ""}`);
  }

  function cancelAddStatus() {
    setIsAddingStatus(false);
    setNewStatusName("");
    setStatusError(null);
  }

  function submitAddStatus() {
    const trimmed = newStatusName.trim();
    if (!trimmed) return;
    setStatusError(null);
    startStatusTransition(async () => {
      const result = await createOrderStatus(trimmed);
      if (result.ok) {
        setExtraStatuses((prev) => [
          ...prev,
          { id: result.data.id, name: trimmed, systemKey: null, count: 0 },
        ]);
        cancelAddStatus();
        router.refresh();
      } else {
        setStatusError(result.error);
      }
    });
  }

  const listTitle =
    activeTab === 2
      ? ui.trash
      : activeTab === 1
        ? ui.processed
        : subFilterStatuses.find((s) => s.id === subStatusId)?.name ?? ui.unprocessed;

  return (
    <SalesFlowShell activeItem="orders">
      <OrderSubNav active="management" />
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-[28px] font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere] sm:text-[32px]">{ui.title}</h1>
            <ListPrimaryButton label={ui.createOrder} onClick={() => setIsModalOpen(true)} />
          </div>

          <ListSearchBar
            placeholder={ui.searchPlaceholder}
            searchLabel={ui.search}
            defaultValue={search}
            onSearch={(q) => {
              setSearch(q);
              navigate({ q, orderId: null });
            }}
          />
        </div>

        <div className="mt-6">
          <ListPageTabs
            tabs={tabLabels}
            activeIndex={activeTab}
            onTabChange={(index) => navigate({ tab: index, status: null, orderId: null })}
            align="start"
            size="md"
          />
        </div>

        {activeTab === 0 && subFilterStatuses.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ status: null, orderId: null })}
              className={[
                "rounded border px-3 py-1.5 text-[13px] transition",
                !subStatusId
                  ? "border-[#1A7A57] bg-[#E8F5EF] font-medium text-slate-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {ui.unprocessed}
            </button>
            {subFilterStatuses.map((status) => (
              <button
                key={status.id}
                type="button"
                onClick={() => navigate({ status: status.id, orderId: null })}
                className={[
                  "rounded border px-3 py-1.5 text-[13px] transition",
                  subStatusId === status.id
                    ? "border-[#1A7A57] bg-[#E8F5EF] font-medium text-slate-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {status.name} {status.count}
              </button>
            ))}
            {isAddingStatus ? (
              <StatusAddInlineForm
                placeholder={ui.statusPlaceholder}
                cancelLabel={ui.cancel}
                addLabel={ui.add}
                value={newStatusName}
                onChange={setNewStatusName}
                onCancel={cancelAddStatus}
                onSubmit={submitAddStatus}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingStatus(true)}
                disabled={statusPending}
                className="text-[13px] font-medium text-[#0A4D34] hover:underline disabled:opacity-50"
              >
                + {ui.addStatus}
              </button>
            )}
            {statusError ? <p className="text-[13px] text-red-600">{statusError}</p> : null}
          </div>
        ) : null}

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-0 overflow-hidden rounded border border-slate-200 bg-white xl:min-h-[720px] xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="border-b border-slate-200 xl:border-r xl:border-b-0">
            <div className="border-b border-slate-200 px-4 py-3 text-[15px] font-semibold text-slate-800">
              {listTitle} {rows.length}
            </div>

            {rows.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center px-4 py-8 text-center text-[15px] text-slate-500 xl:min-h-[560px]">
                {ui.emptyList}
              </div>
            ) : (
              <ul className="max-h-[36dvh] divide-y divide-slate-100 overflow-y-auto xl:max-h-[640px]">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ orderId: row.id })}
                      className={[
                        "w-full px-4 py-3.5 text-left transition",
                        detail?.id === row.id ? "bg-[#E8F5EF]/70" : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <span className="min-w-0 max-w-full text-[14px] font-semibold text-slate-900 [overflow-wrap:anywhere]">
                          {row.clientName || ui.noClient}
                        </span>
                        <span className="min-w-0 max-w-full text-[13px] tabular-nums text-slate-600 [overflow-wrap:anywhere]">
                          {yen(row.total)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-slate-500">
                        {row.subject || ui.detail.noValue}
                      </p>
                      <p className="mt-1 text-[12px] tabular-nums text-slate-400 [overflow-wrap:anywhere]">
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
            <section className="flex min-h-[160px] items-center justify-center px-4 py-8 text-center text-[15px] text-slate-500 sm:px-6 xl:min-h-[560px]">
              {ui.emptyDetail}
            </section>
          )}
        </div>
      </div>

      {isModalOpen ? (
        <CreateOrderModal
          ui={ui.modal}
          lang={lang}
          statuses={allStatuses
            .filter((s) => s.systemKey !== "trash")
            .map((s) => ({ id: s.id, name: s.name }))}
          clients={clients}
          initial={createInitial ?? undefined}
          statusFormLabels={{
            statusPlaceholder: ui.statusPlaceholder,
            cancel: ui.cancel,
            add: ui.add,
            addStatus: ui.addStatus,
          }}
          onClose={() => setIsModalOpen(false)}
          onAddCustomStatus={(name) => {
            setStatusError(null);
            startStatusTransition(async () => {
              const result = await createOrderStatus(name);
              if (result.ok) {
                setExtraStatuses((prev) => [
                  ...prev,
                  { id: result.data.id, name, systemKey: null, count: 0 },
                ]);
                router.refresh();
              } else {
                setStatusError(result.error);
              }
            });
          }}
          onCreated={(orderId) => {
            setIsModalOpen(false);
            navigate({ orderId });
          }}
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
    <section className="min-w-0 px-4 py-5 sm:px-6 xl:min-h-[560px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 max-w-full text-[18px] font-semibold text-slate-900 [overflow-wrap:anywhere]">
          {detail.clientName || ui.noClient}
        </h2>
        <p className="min-w-0 max-w-full text-[18px] font-bold tabular-nums text-slate-900 [overflow-wrap:anywhere]">{yen(detail.total)}</p>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="flex gap-3 text-[14px]">
            <dt className="w-[88px] shrink-0 text-slate-500">{field.label}</dt>
            <dd className="min-w-0 flex-1 text-slate-800 [overflow-wrap:anywhere]">{field.value}</dd>
          </div>
        ))}
      </dl>

      {detail.comment ? (
        <div className="mt-6">
          <p className="text-[13px] font-semibold text-slate-500">{d.comment}</p>
          <p className="mt-1 whitespace-pre-line text-[14px] leading-6 text-slate-700 [overflow-wrap:anywhere]">
            {detail.comment}
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        <p className="text-[13px] font-semibold text-slate-500">{d.items}</p>
        {detail.lineItems.length === 0 ? (
          <p className="mt-3 text-[14px] text-slate-400">{d.noItems}</p>
        ) : (
          <div className="mt-3 min-w-0 overflow-x-auto rounded border border-slate-200" tabIndex={0} role="region" aria-label={d.items}>
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
                    <td className="max-w-[260px] px-3 py-2.5 text-slate-800 [overflow-wrap:anywhere]">{item.name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {item.qty.toLocaleString("ja-JP")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {yen(item.unitPrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-900">
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
