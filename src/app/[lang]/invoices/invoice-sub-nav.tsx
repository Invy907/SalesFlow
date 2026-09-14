"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { SubNavBand } from "../list-page-shared";
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

  const tabs = subNavRoutes.map((key, index) => ({
    key,
    label: ui.subNav[index],
    href: hrefs[key],
  }));

  // 청구서 탭은 목록 헤더에 생성 버튼이 있어 서브내비 CTA를 두지 않는다.
  let ctaHref: string | null = null;
  let ctaLabel: string | null = null;
  if (active === "periodic") {
    ctaHref = "/invoices/periodic/new";
    ctaLabel = ui.periodicCreate;
  }

  return (
    <SubNavBand
      tabs={tabs}
      activeKey={active}
      extra={
        ctaHref && ctaLabel ? (
          <Link
            href={ctaHref}
            className="inline-flex w-full items-center justify-center rounded bg-[#0A4D34] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#083D29] sm:w-auto"
          >
            {ctaLabel}
          </Link>
        ) : undefined
      }
    />
  );
}
