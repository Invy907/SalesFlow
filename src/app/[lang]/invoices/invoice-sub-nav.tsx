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
      <div className="mx-auto flex max-w-[1260px] items-center px-8">
        {subNavRoutes.map((key, index) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={hrefs[key]}
              className={[
                "px-5 py-4 text-[15px] font-medium transition",
                isActive
                  ? "-mb-px rounded-t border border-b-white border-slate-300 bg-white text-slate-900"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {ui.subNav[index]}
            </Link>
          );
        })}
        {ctaHref && ctaLabel ? (
          <div className="ml-auto">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded bg-[#f59b45] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#ef8d32]"
            >
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
