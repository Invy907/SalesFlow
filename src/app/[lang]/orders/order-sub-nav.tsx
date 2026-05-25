"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { getOrdersContent, getOrdersHref } from "./content";

export type OrderSubNavActive = "management" | "form";

export function OrderSubNav({ active }: { active: OrderSubNavActive }) {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);

  const tabs: Array<{ key: OrderSubNavActive; label: string; href: string }> = [
    { key: "management", label: ui.submenu.management, href: getOrdersHref(lang, "management") },
    { key: "form", label: ui.submenu.form, href: getOrdersHref(lang, "form") },
  ];

  return (
    <div className="border-b border-slate-200 bg-white px-[42px]">
      <div className="flex h-[52px] w-[935px] items-center gap-4">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                isActive
                  ? "rounded-full bg-[#14a7bb] px-4 py-1.5 text-[13px] font-semibold text-white"
                  : "text-[13px] font-medium text-[#14a7bb] hover:underline"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
