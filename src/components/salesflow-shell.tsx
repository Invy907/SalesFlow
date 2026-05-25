"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage, type AppLocale } from "@/contexts/language-context";
import { getOrdersContent, getOrdersHref } from "@/app/[lang]/orders/content";
import { getInvoiceContent, getInvoiceHref } from "@/app/[lang]/invoices/content";
import { getReportsContent, getReportsTabHref } from "@/app/[lang]/reports/content";

type ActiveItem =
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
  | "settings";

type SalesFlowShellProps = {
  children: ReactNode;
  activeItem: ActiveItem;
};

const profile = {
  initials: "IL",
  name: "Inhyuk Lee",
  email: "bluebourne907@gmail.com",
};

const copy = {
  ja: {
    nav: {
      home: "\u30db\u30fc\u30e0",
      estimates: "\u898b\u7a4d\u66f8",
      "delivery-notes": "\u7d0d\u54c1\u66f8",
      invoices: "\u8acb\u6c42\u66f8",
      receipts: "\u9818\u53ce\u66f8",
      orders: "\u53d7\u6ce8\u7ba1\u7406",
      reports: "\u30ec\u30dd\u30fc\u30c8",
      clients: "\u53d6\u5f15\u5148",
      items: "\u54c1\u76ee\u7ba1\u7406",
      inbox: "\u53d7\u4fe1\u7bb1",
      history: "\u3054\u5229\u7528\u5c65\u6b74",
      settings: "\u8a2d\u5b9a",
    },
    footer: ["SalesFlow"],
    langLabel: "\u8a00\u8a9e",
    profileMenu: {
      editProfile: "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u7de8\u96c6",
      preferences: "\u8a2d\u5b9a",
      desktopApp: "\u30c7\u30b9\u30af\u30c8\u30c3\u30d7\u30a2\u30d7\u30ea\u3092\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9",
      logout: "\u30ed\u30b0\u30a2\u30a6\u30c8",
    },
  },
  ko: {
    nav: {
      home: "\ud648",
      estimates: "\uacac\uc801\uc11c",
      "delivery-notes": "\ub0a9\ud488\uc11c",
      invoices: "\uccad\uad6c\uc11c",
      receipts: "\uc601\uc218\uc99d",
      orders: "\uc218\uc8fc \uad00\ub9ac",
      reports: "\ub9ac\ud3ec\ud2b8",
      clients: "\uac70\ub798\ucc98",
      items: "\ud488\ubaa9 \uad00\ub9ac",
      inbox: "\ubc1b\uc740 \ubb38\uc11c\ud568",
      history: "\uc774\uc6a9 \ub0b4\uc5ed",
      settings: "\uc124\uc815",
    },
    footer: ["SalesFlow"],
    langLabel: "\uc5b8\uc5b4",
    profileMenu: {
      editProfile: "\ud504\ub85c\ud544 \uc218\uc815",
      preferences: "\uc124\uc815",
      desktopApp: "\ub370\uc2a4\ud06c\ud1b1 \uc571 \ub2e4\uc6b4\ub85c\ub4dc",
      logout: "\ub85c\uadf8\uc544\uc6c3",
    },
  },
  en: {
    nav: {
      home: "Home",
      estimates: "Estimates",
      "delivery-notes": "Delivery Notes",
      invoices: "Invoices",
      receipts: "Receipts",
      orders: "Order Management",
      reports: "Reports",
      clients: "Clients",
      items: "Item Management",
      inbox: "Inbox",
      history: "Usage History",
      settings: "Settings",
    },
    footer: ["SalesFlow"],
    langLabel: "Language",
    profileMenu: {
      editProfile: "Edit profile",
      preferences: "Settings",
      desktopApp: "Download desktop app",
      logout: "Log out",
    },
  },
} as const;

const primaryItems: Array<{ key: ActiveItem; href: string }> = [
  { key: "home", href: "" },
  { key: "estimates", href: "/estimates" },
  { key: "delivery-notes", href: "/delivery-notes" },
  { key: "invoices", href: "/invoices" },
  { key: "receipts", href: "/receipts" },
  { key: "orders", href: "/orders" },
  { key: "reports", href: "/reports" },
];

const inboxItem = { key: "inbox" as const, href: "/inbox" };

const secondaryItems: Array<{ key: ActiveItem; href: string }> = [
  { key: "clients", href: "/clients" },
  { key: "items", href: "/items" },
  { key: "history", href: "/usage" },
  { key: "settings", href: "/settings" },
];

const SIDEBAR_WIDTH = 210;

const primaryNavClass = (active: boolean) =>
  [
    "flex items-center justify-between rounded px-4 py-3 text-[19px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-white/25",
    active ? "bg-[#58606d] text-white" : "text-white/95 hover:bg-white/8",
  ].join(" ");

const secondaryNavClass = (active: boolean) =>
  [
    "block rounded px-4 py-2.5 text-[17px] transition outline-none focus-visible:ring-2 focus-visible:ring-white/25",
    active ? "bg-[#58606d] text-white" : "text-white/95 hover:bg-white/8",
  ].join(" ");

function SidebarDivider() {
  return <div className="my-3 border-t border-slate-300/20" aria-hidden="true" />;
}

function SidebarSubmenu({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [menuTop, setMenuTop] = useState(0);
  const [menuLeft, setMenuLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    const rect = anchorRef.current?.getBoundingClientRect();
    const aside = anchorRef.current?.closest("aside");
    const asideRect = aside?.getBoundingClientRect();
    if (rect) setMenuTop(rect.top);
    if (asideRect) setMenuLeft(asideRect.right);
    setOpen(true);
  }

  function startHide() {
    timerRef.current = setTimeout(() => setOpen(false), 120);
  }

  function cancelHide() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  return (
    <div ref={anchorRef} onMouseEnter={show} onMouseLeave={startHide}>
      <Link href={href} className={primaryNavClass(active)}>
        <span>{label}</span>
        <ChevronRightIcon />
      </Link>
      {open ? (
        <div
          className="fixed z-50 min-w-[180px] rounded-r border border-l-0 border-slate-300 bg-white py-1.5 shadow-md"
          style={{ left: menuLeft, top: menuTop }}
          onMouseEnter={cancelHide}
          onMouseLeave={startHide}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SidebarFlyoutLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 text-[15px] text-slate-700 hover:bg-slate-50 hover:text-[#14a7bb]"
    >
      {label}
    </Link>
  );
}

const localeDisplayNames: Record<AppLocale, string> = {
  ja: "\u65e5\u672c\u8a9e",
  ko: "\ud55c\uad6d\uc5b4",
  en: "English",
};

const profileMenuItems = [
  { key: "edit-profile", icon: <UserIcon /> },
  { key: "preferences", icon: <CogIcon /> },
  { key: "desktop-app", icon: <DownloadIcon /> },
  { key: "logout", icon: <LogoutIcon /> },
] as const;

export function SalesFlowShell({ children, activeItem }: SalesFlowShellProps) {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const ui = copy[lang] ?? copy.ja;
  const homeHref = "/";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }

      if (languageRef.current && !languageRef.current.contains(target)) {
        setLanguageOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLanguageSelect(nextLang: AppLocale) {
    setLang(nextLang);
    setLanguageOpen(false);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-300 bg-[#434a56] text-white lg:flex"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div className="border-b border-slate-300/40 bg-white px-4 py-5">
            <Link href={homeHref} className="flex items-center gap-2.5">
              <div className="h-7 w-4 bg-cyan-500 [clip-path:polygon(0_0,100%_0,100%_70%,45%_100%,0_100%)]" />
              <span className="text-[22px] font-semibold tracking-wide text-slate-800">
                SalesFlow
              </span>
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="space-y-1 px-3 py-5">
              {primaryItems.map((item) => {
                const href =
                  item.key === "home"
                    ? homeHref
                    : item.href === "#"
                      ? "#"
                      : item.href;

                if (item.key === "invoices") {
                  const invoiceTabs = getInvoiceContent(lang).subNav;
                  return (
                    <SidebarSubmenu
                      key={item.key}
                      href={href}
                      label={ui.nav[item.key]}
                      active={activeItem === item.key}
                    >
                      <SidebarFlyoutLink
                        href={getInvoiceHref(lang, "invoices")}
                        label={invoiceTabs[0]}
                      />
                      <SidebarFlyoutLink
                        href={getInvoiceHref(lang, "periodic")}
                        label={invoiceTabs[1]}
                      />
                      <SidebarFlyoutLink
                        href={getInvoiceHref(lang, "csv_upload")}
                        label={invoiceTabs[2]}
                      />
                    </SidebarSubmenu>
                  );
                }

                if (item.key === "orders") {
                  const orderTabs = getOrdersContent(lang).submenu;
                  return (
                    <SidebarSubmenu
                      key={item.key}
                      href={href}
                      label={ui.nav[item.key]}
                      active={activeItem === item.key}
                    >
                      <SidebarFlyoutLink
                        href={getOrdersHref(lang, "management")}
                        label={orderTabs.management}
                      />
                      <SidebarFlyoutLink href={getOrdersHref(lang, "form")} label={orderTabs.form} />
                    </SidebarSubmenu>
                  );
                }

                if (item.key === "reports") {
                  const reportTabs = getReportsContent(lang).tabs;
                  return (
                    <SidebarSubmenu
                      key={item.key}
                      href={href}
                      label={ui.nav[item.key]}
                      active={activeItem === item.key}
                    >
                      {(["main", "receivables", "collections"] as const).map((tab) => (
                        <SidebarFlyoutLink
                          key={tab}
                          href={getReportsTabHref(lang, tab)}
                          label={reportTabs[tab]}
                        />
                      ))}
                    </SidebarSubmenu>
                  );
                }

                return (
                  <Link key={item.key} href={href} className={primaryNavClass(activeItem === item.key)}>
                    <span>{ui.nav[item.key]}</span>
                  </Link>
                );
              })}

              <SidebarDivider />

              <Link
                href={inboxItem.href}
                className={secondaryNavClass(activeItem === inboxItem.key)}
              >
                {ui.nav[inboxItem.key]}
              </Link>

              <SidebarDivider />

              {secondaryItems.map((item) => {
                const href = item.href === "#" ? "#" : item.href;

                return (
                  <Link key={item.key} href={href} className={secondaryNavClass(activeItem === item.key)}>
                    {ui.nav[item.key]}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 px-3 pb-4">
            <div className="relative border-t border-slate-300/20 pt-4">
              <div ref={languageRef} className="relative">
                <button
                  type="button"
                  aria-label={localeDisplayNames[lang]}
                  onClick={() => {
                    setLanguageOpen((open) => !open);
                    setProfileOpen(false);
                  }}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                    languageOpen
                      ? "border-white bg-[#0f1627] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]"
                      : "border-white/20 bg-[#39414d] text-white/75 hover:border-white/40 hover:text-white",
                  ].join(" ")}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/6">
                    <GlobeIcon />
                  </span>
                  <span>
                    <span className="block text-xs font-medium text-white/45">{ui.langLabel}</span>
                    <span className="block text-sm font-semibold text-white">
                      {localeDisplayNames[lang]}
                    </span>
                  </span>
                </button>

                {languageOpen ? (
                  <div className="absolute bottom-[76px] left-0 z-20 w-[252px] overflow-hidden rounded-[20px] border border-slate-200 bg-white py-4 shadow-[0_24px_48px_rgba(15,23,42,0.16)]">
                    {(["ko", "ja", "en"] as const).map((locale) => {
                      const selected = locale === lang;

                      return (
                        <button
                          key={locale}
                          type="button"
                          onClick={() => handleLanguageSelect(locale)}
                          className={[
                            "flex w-full items-center justify-between px-5 py-3 text-left text-[20px] font-medium transition",
                            selected
                              ? "bg-[#eef2ff] text-[#4338ca]"
                              : "text-slate-700 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <span>{localeDisplayNames[locale]}</span>
                          <span className={selected ? "opacity-100" : "opacity-0"}>
                            <CheckIcon />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div ref={profileRef} className="relative mt-3">
                <button
                  type="button"
                  aria-label="Profile menu"
                  onClick={() => {
                    setProfileOpen((open) => !open);
                    setLanguageOpen(false);
                  }}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                    profileOpen
                      ? "border-[#6b5cff] bg-[#0f1627] shadow-[0_0_0_2px_rgba(107,92,255,0.9)]"
                      : "border-white/12 bg-white/[0.03] hover:border-white/18 hover:bg-white/4",
                  ].join(" ")}
                >
                  <AvatarBadge />
                  <span className="min-w-0 truncate text-sm font-semibold text-white">
                    {profile.name}
                  </span>
                </button>

                {profileOpen ? (
                  <div className="absolute bottom-0 left-[72px] z-20 w-[338px] overflow-hidden rounded-[22px] border border-slate-700/30 bg-[#141c2b] text-white shadow-[0_30px_60px_rgba(7,13,26,0.36)]">
                    <div className="flex items-center gap-4 px-[22px] py-[20px]">
                      <AvatarBadge />
                      <p className="min-w-0 truncate text-[18px] font-semibold text-white">
                        {profile.name}
                      </p>
                    </div>

                    <div className="border-t border-white/10">
                      {profileMenuItems.map((item) => {
                        const label =
                          item.key === "edit-profile"
                            ? ui.profileMenu.editProfile
                            : item.key === "preferences"
                              ? ui.profileMenu.preferences
                              : item.key === "desktop-app"
                                ? ui.profileMenu.desktopApp
                                : ui.profileMenu.logout;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={[
                              "flex w-full items-center gap-4 px-[22px] py-[16px] text-left text-[18px] transition hover:bg-white/4",
                              item.key === "logout" ? "border-t border-white/10" : "",
                            ].join(" ")}
                          >
                            <span className="text-white/80">{item.icon}</span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <div className="flex-1 bg-white">{children}</div>
          <footer className="bg-[#eef3f8] px-6 py-3">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3">
                {ui.footer.map((item) => (
                  <a key={item} href="#" className="transition hover:text-slate-600">
                    {item}
                  </a>
                ))}
              </div>
              <div>{ui.langLabel}</div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

function AvatarBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "flex items-center justify-center rounded-full bg-[#6b67f2] font-semibold text-white",
        compact ? "h-8 w-8 text-[11px]" : "h-[48px] w-[48px] text-[17px]",
      ].join(" ")}
    >
      {profile.initials}
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current opacity-70">
      <path d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-.02Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
      <circle cx="12" cy="12" r="8.25" strokeWidth="1.7" />
      <path
        d="M3.75 12h16.5M12 3.75a12.3 12.3 0 0 1 0 16.5m0-16.5a12.3 12.3 0 0 0 0 16.5"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
      <path d="M12 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 12 11Z" strokeWidth="1.7" />
      <path d="M5.5 19.25a6.5 6.5 0 0 1 13 0" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
      <path
        d="m9.25 4.75.5 1.75a6.65 6.65 0 0 1 2.5 0l.5-1.75h2.5l.5 1.75c.65.24 1.26.6 1.8 1.06l1.7-.56 1.25 2.16-1.3 1.22c.1.4.15.8.15 1.22s-.05.82-.15 1.22l1.3 1.22-1.25 2.16-1.7-.56a6.73 6.73 0 0 1-1.8 1.06l-.5 1.75h-2.5l-.5-1.75a6.65 6.65 0 0 1-2.5 0l-.5 1.75h-2.5l-.5-1.75a6.73 6.73 0 0 1-1.8-1.06l-1.7.56-1.25-2.16 1.3-1.22A5.15 5.15 0 0 1 5.5 12c0-.42.05-.82.15-1.22l-1.3-1.22L5.6 7.4l1.7.56c.54-.46 1.15-.82 1.8-1.06l.5-1.75h2.65Z"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.35" strokeWidth="1.7" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
      <path
        d="M12 4.75v8.5m0 0 3-3m-3 3-3-3"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 15.75v2.5A1.75 1.75 0 0 0 7.5 20h9a1.75 1.75 0 0 0 1.75-1.75v-2.5"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current">
      <path
        d="m5.75 12.75 4.1 4.1 8.4-9.6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
      <path
        d="M10.25 5.25H7.5A1.75 1.75 0 0 0 5.75 7v10A1.75 1.75 0 0 0 7.5 18.75h2.75"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 12h6.25m0 0-2.5-2.5m2.5 2.5-2.5 2.5"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
