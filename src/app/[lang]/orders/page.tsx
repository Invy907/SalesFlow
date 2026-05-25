"use client";

import { useMemo, useState } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { CreateOrderModal } from "./create-order-modal";
import { getOrdersContent } from "./content";
import { OrderSubNav } from "./order-sub-nav";
import { StatusAddInlineForm } from "./status-add-inline-form";

type ActiveStatus = "unprocessed" | "processed" | "trash" | (string & {});

export default function OrdersPage() {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>("unprocessed");

  const statuses = useMemo(
    () => [ui.unprocessed, ui.processed, ...customStatuses],
    [ui.unprocessed, ui.processed, customStatuses],
  );

  const activeStatusLabel = useMemo(() => {
    if (activeStatus === "unprocessed") return ui.unprocessed;
    if (activeStatus === "processed") return ui.processed;
    if (activeStatus === "trash") return ui.trash;
    return activeStatus;
  }, [activeStatus, ui.unprocessed, ui.processed, ui.trash]);

  function startAddStatus() {
    setIsAddingStatus(true);
    setNewStatusName("");
  }

  function cancelAddStatus() {
    setIsAddingStatus(false);
    setNewStatusName("");
  }

  function confirmAddStatus() {
    const trimmed = newStatusName.trim();
    if (!trimmed || statuses.includes(trimmed)) {
      return;
    }

    setCustomStatuses((prev) => [...prev, trimmed]);
    setActiveStatus(trimmed);
    cancelAddStatus();
  }

  function handleAddCustomStatus(name: string) {
    const trimmed = name.trim();
    if (!trimmed || statuses.includes(trimmed)) {
      return;
    }

    setCustomStatuses((prev) => [...prev, trimmed]);
    setActiveStatus(trimmed);
  }

  return (
    <SalesFlowShell activeItem="orders">
      <OrderSubNav active="management" />
      <div className="mx-auto max-w-[1440px] px-8 py-8 pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>

          <div className="flex w-full max-w-[720px] rounded border border-slate-300 bg-white">
            <input
              className="min-w-0 flex-1 px-4 py-3 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
              placeholder={ui.searchPlaceholder}
            />
            <button className="border-l border-slate-300 px-4 text-sm text-slate-600">
              {ui.searchDetail}
            </button>
            <button className="border-l border-slate-300 px-5 text-[15px] font-medium text-slate-700">
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
                <StatusRow
                  label={ui.unprocessed}
                  count="0"
                  active={activeStatus === "unprocessed"}
                  onClick={() => setActiveStatus("unprocessed")}
                  variant="inbox"
                />

                {isAddingStatus ? (
                  <StatusAddInlineForm
                    placeholder={ui.statusPlaceholder}
                    cancelLabel={ui.cancel}
                    addLabel={ui.add}
                    value={newStatusName}
                    onChange={setNewStatusName}
                    onCancel={cancelAddStatus}
                    onSubmit={confirmAddStatus}
                  />
                ) : null}

                {customStatuses.map((status) => (
                  <StatusRow
                    key={status}
                    label={status}
                    count="0"
                    active={activeStatus === status}
                    onClick={() => setActiveStatus(status)}
                    variant="inbox"
                  />
                ))}

                {customStatuses.length > 0 || isAddingStatus ? (
                  <div className="border-t border-slate-200 pt-2" />
                ) : null}

                <StatusRow
                  label={ui.processed}
                  count="0"
                  active={activeStatus === "processed"}
                  onClick={() => setActiveStatus("processed")}
                  variant="inbox"
                />
                <StatusRow
                  label={ui.trash}
                  active={activeStatus === "trash"}
                  onClick={() => setActiveStatus("trash")}
                  variant="trash"
                />
              </div>

              {!isAddingStatus ? (
                <button
                  type="button"
                  onClick={startAddStatus}
                  className="mt-4 text-[14px] font-medium text-[#14a7bb] hover:underline"
                >
                  + {ui.addStatus}
                </button>
              ) : null}
            </div>
          </aside>

          <section className="border-b border-slate-200 xl:border-r xl:border-b-0">
            <div className="border-b border-slate-200 px-4 py-3 text-[15px] font-semibold text-slate-800">
              {activeStatusLabel} 0
            </div>
            <div className="flex min-h-[560px] items-center justify-center px-4 text-[15px] text-slate-300">
              {ui.emptyList}
            </div>
          </section>

          <section className="flex min-h-[560px] items-center justify-center px-6 text-[15px] text-slate-300">
            {ui.emptyDetail}
          </section>
        </div>
      </div>

      {isModalOpen ? (
        <CreateOrderModal
          ui={ui.modal}
          lang={lang}
          statuses={statuses}
          statusFormLabels={{
            statusPlaceholder: ui.statusPlaceholder,
            cancel: ui.cancel,
            add: ui.add,
            addStatus: ui.addStatus,
          }}
          onClose={() => setIsModalOpen(false)}
          onAddCustomStatus={handleAddCustomStatus}
        />
      ) : null}
    </SalesFlowShell>
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
  count?: string;
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
        {variant === "trash" ? (
          <TrashIcon active={active} />
        ) : (
          <InboxIcon active={active} />
        )}
        <span>{label}</span>
      </span>
      {count ? <span className="tabular-nums">{count}</span> : null}
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
