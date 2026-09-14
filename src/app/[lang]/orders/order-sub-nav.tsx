"use client";

import { useLanguage } from "@/contexts/language-context";
import { SubNavBand } from "../list-page-shared";
import { getOrdersContent, getOrdersHref } from "./content";

export type OrderSubNavActive = "management" | "form";

export function OrderSubNav({ active }: { active: OrderSubNavActive }) {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);

  const tabs = [
    { key: "management", label: ui.submenu.management, href: getOrdersHref(lang, "management") },
    { key: "form", label: ui.submenu.form, href: getOrdersHref(lang, "form") },
  ];

  return <SubNavBand tabs={tabs} activeKey={active} />;
}
