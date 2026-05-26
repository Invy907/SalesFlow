"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { getInvoiceContent } from "./content";

export type SubNavActive = "invoices" | "periodic" | "csv_upload";

const subNavRoutes: SubNavActive[] = ["invoices", "periodic", "csv_upload"];

export function InvoiceSubNav({ active }: { active: SubNavActive }) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);

  const hrefs: Record<SubNavActive, string> = {
    invoices: "/invoices",
    periodic: "/invoices/periodic",
    csv_upload: "/invoices/csv_upload",
  };

  let ctaHref: string | null = null;
  let ctaLabel: string | null = null;
  if (active === "invoices") {
    ctaHref = "/invoices/new";
    ctaLabel = ui.createInvoice;
  } else if (active === "periodic") {
    ctaHref = "/invoices/periodic/new";
    ctaLabel = ui.periodicCreate;
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1260px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-0 lg:px-8">
        <div className="-mx-4 flex min-w-0 overflow-x-auto px-4 sm:mx-0 sm:flex-1 sm:px-0">
          <div className="flex min-w-max">
            {subNavRoutes.map((key, index) => {
              const isActive = active === key;
              return (
                <Link
                  key={key}
                  href={hrefs[key]}
                  className={[
                    "shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition sm:px-5 sm:py-4 sm:text-[15px]",
                    isActive
                      ? "-mb-px rounded-t border border-b-white border-slate-300 bg-white text-slate-900"
                      : "text-slate-500 hover:text-slate-700",
                  ].join(" ")}
                >
                  {ui.subNav[index]}
                </Link>
              );
            })}
          </div>
        </div>
        {ctaHref && ctaLabel ? (
          <div className="shrink-0 sm:ml-auto">
            <Link
              href={ctaHref}
              className="inline-flex w-full items-center justify-center rounded bg-[#f59b45] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef8d32] sm:w-auto sm:text-[15px]"
            >
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
