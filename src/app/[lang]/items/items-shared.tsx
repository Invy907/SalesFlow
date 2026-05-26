"use client";

import type { ReactNode } from "react";
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

export function ItemsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="bg-[#dbe8f3] px-5 py-3">
        <h2 className="text-[18px] font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function ItemsInfoTable({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full min-w-[480px] border-collapse text-[14px]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
            <td className="w-[240px] whitespace-pre-line bg-[#f8fafc] px-4 py-4 align-top font-medium text-slate-700">
              {row.label}
            </td>
            <td className="px-4 py-4 text-slate-700">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
