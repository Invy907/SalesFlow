"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { getInvoiceContent } from "./content";

export type SubNavActive = "invoices" | "periodic" | "csv_upload";

const subNavRoutes: SubNavActive[] = ["invoices", "periodic", "csv_upload"];

export function InvoiceSubNav({ active }: { active: SubNavActive }) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);

  const base = `/${lang}`;
  const hrefs: Record<SubNavActive, string> = {
    invoices: `${base}/invoices`,
    periodic: `${base}/invoices/periodic`,
    csv_upload: `${base}/invoices/csv_upload`,
  };

  let ctaHref: string | null = null;
  let ctaLabel: string | null = null;
  if (active === "invoices") {
    ctaHref = `${base}/invoices/new`;
    ctaLabel = ui.createInvoice;
  } else if (active === "periodic") {
    ctaHref = "#";
    ctaLabel = ui.periodicCreate;
  }

  return (
    <div className="border-b border-slate-200 bg-white px-[42px]">
      <div className="flex h-[52px] w-[935px] items-center gap-4">
        {subNavRoutes.map((key, index) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={hrefs[key]}
              className={
                isActive
                  ? "rounded-full bg-[#14a7bb] px-4 py-1.5 text-[13px] font-semibold text-white"
                  : "text-[13px] font-medium text-[#14a7bb] hover:underline"
              }
            >
              {ui.subNav[index]}
            </Link>
          );
        })}
        {ctaHref && ctaLabel ? (
          <Link
            href={ctaHref}
            className="ml-auto inline-flex items-center justify-center rounded bg-[#f59b45] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#ef8d32]"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
