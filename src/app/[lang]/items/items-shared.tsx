"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { getItemsContent, getItemsHref } from "./content";

export function ItemsNavTabs({ active }: { active: "list" | "bulk" }) {
  const { lang } = useLanguage();
  const ui = getItemsContent(lang);

  const tabs = [
    { key: "list" as const, label: ui.tabs[0], href: getItemsHref(lang, "list") },
    { key: "bulk" as const, label: ui.tabs[1], href: getItemsHref(lang, "bulk") },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={[
              "rounded px-5 py-2.5 text-[15px] font-medium transition",
              isActive
                ? "bg-[#14a7bb] text-white shadow-sm"
                : "bg-[#dbe8f3] text-slate-700 hover:bg-[#c9dce9]",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export { BulkSection as ItemsSection, BulkInfoTable as ItemsInfoTable } from "../list-page-shared";
