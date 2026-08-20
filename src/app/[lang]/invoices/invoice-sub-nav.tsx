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

  // 청구서 탭은 목록 헤더에 생성 버튼이 있어 서브내비 CTA를 두지 않는다.
  let ctaHref: string | null = null;
  let ctaLabel: string | null = null;
  if (active === "periodic") {
    ctaHref = "/invoices/periodic/new";
    ctaLabel = ui.periodicCreate;
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1260px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-0 lg:px-8">
        {/* pb-px: 활성 탭이 -mb-px로 1px 삐져나오면 overflow-x-auto가 세로 스크롤바까지 만든다.
            패딩으로 흡수하고 -mb-px로 늘어난 높이를 되돌린다. */}
        <div className="-mx-4 -mb-px flex min-w-0 overflow-x-auto px-4 pb-px sm:mx-0 sm:flex-1 sm:px-0">
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
