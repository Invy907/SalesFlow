"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { getOrdersContent, getOrdersHref } from "@/app/[lang]/orders/content";
import { getInvoiceContent, getInvoiceHref } from "@/app/[lang]/invoices/content";
import { getReportsContent, getReportsTabHref } from "@/app/[lang]/reports/content";
import type { AppLocale } from "@/contexts/language-context";

export type ShellActiveItem =
  | "home"
  | "estimates"
  | "delivery-notes"
  | "invoices"
  | "receipts"
  | "orders"
  | "reports"
  | "clients"
  | "items"
  | "inbox"
  | "history"
  | "support"
  | "settings";

type NavLabels = Record<ShellActiveItem, string>;

const primaryItems: Array<{ key: ShellActiveItem; href: string }> = [
  { key: "home", href: "" },
  { key: "estimates", href: "/estimates" },
  { key: "invoices", href: "/invoices" },
  { key: "delivery-notes", href: "/delivery-notes" },
  { key: "receipts", href: "/receipts" },
  { key: "orders", href: "/orders" },
  { key: "reports", href: "/reports" },
];

const inboxItem = { key: "inbox" as const, href: "/inbox" };

const secondaryItems: Array<{ key: ShellActiveItem; href: string }> = [
  { key: "clients", href: "/clients" },
  { key: "items", href: "/items" },
  { key: "history", href: "/usage" },
  { key: "support", href: "/support" },
  { key: "settings", href: "/settings" },
];

const primaryNavClass = (active: boolean) =>
  [
    "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[14px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-[#0A4D34]/30",
    active ? "bg-[#EAF3EF] text-[#0A4D34]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

const secondaryNavClass = (active: boolean) =>
  [
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-[#0A4D34]/30",
    active ? "bg-[#EAF3EF] text-[#0A4D34]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

function ShellNavIcon({
  icon: Icon,
}: {
  icon: LucideIcon;
  size?: "md" | "sm";
}) {
  return <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />;
}

function ShellDivider() {
  return <div className="my-3 border-t border-slate-200" aria-hidden="true" />;
}

function MobileSubmenu({
  href,
  label,
  active,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const [expanded, setExpanded] = useState(active);

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link
          href={href}
          onClick={onNavigate}
          className={[primaryNavClass(active), "min-w-0 flex-1"].join(" ")}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <ShellNavIcon icon={icon} />
            <span className="truncate">{label}</span>
          </span>
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={label}
          onClick={() => setExpanded((value) => !value)}
          className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-[#0A4D34]"
        >
          <ChevronRight
            className={["h-4 w-4 transition", expanded ? "rotate-90" : ""].join(" ")}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>
      </div>
      {expanded ? (
        <div className="ml-9 mt-1 space-y-0.5 border-l border-slate-200 pl-3 pb-1">{children}</div>
      ) : null}
    </div>
  );
}

function NestedNavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded py-2 pr-2 text-[14px] text-slate-600 hover:bg-[#EAF3EF] hover:text-[#0A4D34]"
    >
      {label}
    </Link>
  );
}

type ShellNavigationProps = {
  activeItem: ShellActiveItem;
  lang: AppLocale;
  labels: NavLabels;
  navIcons: Record<ShellActiveItem, LucideIcon>;
  homeHref?: string;
  onNavigate?: () => void;
};

export function MobileShellNavigation({
  activeItem,
  lang,
  labels,
  navIcons,
  homeHref = "/",
  onNavigate,
}: ShellNavigationProps) {
  function resolveHref(itemHref: string) {
    if (itemHref === "") return homeHref;
    if (itemHref === "#") return "#";
    return itemHref;
  }

  return (
    <div className="space-y-1 px-3 py-4">
      {primaryItems.map((item) => {
        const href = resolveHref(item.href);

        if (item.key === "invoices") {
          const invoiceTabs = getInvoiceContent(lang).subNav;
          return (
            <MobileSubmenu
              key={item.key}
              href={href}
              label={labels[item.key]}
              icon={navIcons.invoices}
              active={activeItem === item.key}
              onNavigate={onNavigate}
            >
              <NestedNavLink
                href={getInvoiceHref(lang, "invoices")}
                label={invoiceTabs[0]}
                onNavigate={onNavigate}
              />
              <NestedNavLink
                href={getInvoiceHref(lang, "periodic")}
                label={invoiceTabs[1]}
                onNavigate={onNavigate}
              />
              <NestedNavLink
                href={getInvoiceHref(lang, "csv_upload")}
                label={invoiceTabs[2]}
                onNavigate={onNavigate}
              />
            </MobileSubmenu>
          );
        }

        if (item.key === "orders") {
          const orderTabs = getOrdersContent(lang).submenu;
          return (
            <MobileSubmenu
              key={item.key}
              href={href}
              label={labels[item.key]}
              icon={navIcons.orders}
              active={activeItem === item.key}
              onNavigate={onNavigate}
            >
              <NestedNavLink
                href={getOrdersHref(lang, "management")}
                label={orderTabs.management}
                onNavigate={onNavigate}
              />
              <NestedNavLink
                href={getOrdersHref(lang, "form")}
                label={orderTabs.form}
                onNavigate={onNavigate}
              />
            </MobileSubmenu>
          );
        }

        if (item.key === "reports") {
          const reportTabs = getReportsContent(lang).tabs;
          return (
            <MobileSubmenu
              key={item.key}
              href={href}
              label={labels[item.key]}
              icon={navIcons.reports}
              active={activeItem === item.key}
              onNavigate={onNavigate}
            >
              {(["main", "receivables", "collections"] as const).map((tab) => (
                <NestedNavLink
                  key={tab}
                  href={getReportsTabHref(lang, tab)}
                  label={reportTabs[tab]}
                  onNavigate={onNavigate}
                />
              ))}
            </MobileSubmenu>
          );
        }

        return (
          <Link
            key={item.key}
            href={href}
            onClick={onNavigate}
            className={primaryNavClass(activeItem === item.key)}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <ShellNavIcon icon={navIcons[item.key]} />
              <span className="truncate">{labels[item.key]}</span>
            </span>
          </Link>
        );
      })}

      <ShellDivider />

      <Link
        href={inboxItem.href}
        onClick={onNavigate}
        className={secondaryNavClass(activeItem === inboxItem.key)}
      >
        <ShellNavIcon icon={navIcons.inbox} size="sm" />
        <span className="truncate">{labels[inboxItem.key]}</span>
      </Link>

      <ShellDivider />

      {secondaryItems.map((item) => {
        const href = resolveHref(item.href);

        return (
          <Link
            key={item.key}
            href={href}
            onClick={onNavigate}
            className={secondaryNavClass(activeItem === item.key)}
          >
            <ShellNavIcon icon={navIcons[item.key]} size="sm" />
            <span className="truncate">{labels[item.key]}</span>
          </Link>
        );
      })}
    </div>
  );
}
