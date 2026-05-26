"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Cog,
  Download,
  FileText,
  Globe,
  History,
  Home,
  Inbox,
  LogOut,
  Menu,
  PackageCheck,
  ReceiptText,
  ScrollText,
  Settings,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { MobileShellNavigation } from "@/components/shell-navigation";
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
  | "support"
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
      support: "\u30b5\u30dd\u30fc\u30c8",
      settings: "\u8a2d\u5b9a",
    },
    footer: ["SalesFlow"],
    langLabel: "\u8a00\u8a9e",
    profileMenu: {
      editProfile: "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u7de8\u96c6",
      preferences: "\u8a2d\u5b9a",
      languageSettings: "\u8a00\u8a9e\u8a2d\u5b9a",
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
      support: "\uc9c0\uc6d0",
      settings: "\uc124\uc815",
    },
    footer: ["SalesFlow"],
    langLabel: "\uc5b8\uc5b4",
    profileMenu: {
      editProfile: "\ud504\ub85c\ud544 \uc218\uc815",
      preferences: "\uc124\uc815",
      languageSettings: "\uc5b8\uc5b4 \uc124\uc815",
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
      support: "Support",
      settings: "Settings",
    },
    footer: ["SalesFlow"],
    langLabel: "Language",
    profileMenu: {
      editProfile: "Edit profile",
      preferences: "Settings",
      languageSettings: "Language",
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
  { key: "support", href: "/support" },
  { key: "settings", href: "/settings" },
];

const navIcons: Record<ActiveItem, LucideIcon> = {
  home: Home,
  estimates: FileText,
  "delivery-notes": PackageCheck,
  invoices: ReceiptText,
  receipts: ScrollText,
  orders: ClipboardList,
  reports: BarChart3,
  clients: Building2,
  items: Boxes,
  inbox: Inbox,
  history: History,
  support: CircleHelp,
  settings: Settings,
};

const SIDEBAR_WIDTH = 210;

const primaryNavClass = (active: boolean) =>
  [
    "flex items-center justify-between gap-2 rounded px-3 py-2.5 text-[17px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-white/25",
    active ? "bg-[#58606d] text-white" : "text-white/95 hover:bg-white/8",
  ].join(" ");

const secondaryNavClass = (active: boolean) =>
  [
    "flex items-center gap-2.5 rounded px-3 py-2 text-[15px] transition outline-none focus-visible:ring-2 focus-visible:ring-white/25",
    active ? "bg-[#58606d] text-white" : "text-white/95 hover:bg-white/8",
  ].join(" ");

function SidebarNavIcon({
  icon: Icon,
  size = "md",
}: {
  icon: LucideIcon;
  size?: "md" | "sm";
}) {
  const className = size === "sm" ? "h-4 w-4 shrink-0 opacity-80" : "h-[18px] w-[18px] shrink-0 opacity-80";

  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}

function SidebarDivider() {
  return <div className="my-3 border-t border-slate-300/20" aria-hidden="true" />;
}

function SidebarSubmenu({
  href,
  label,
  active,
  icon,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
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
        <span className="flex min-w-0 items-center gap-2.5">
          <SidebarNavIcon icon={icon} />
          <span className="truncate">{label}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden="true" />
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

const profileMenuItemsBeforeLanguage = [
  { key: "edit-profile", icon: User },
  { key: "preferences", icon: Cog },
] as const;

const profileMenuItemsAfterLanguage = [
  { key: "desktop-app", icon: Download },
  { key: "logout", icon: LogOut },
] as const;

export function SalesFlowShell({ children, activeItem }: SalesFlowShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [mobileLanguageMenuOpen, setMobileLanguageMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const ui = copy[lang] ?? copy.ja;
  const homeHref = "/";

  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
        setLanguageMenuOpen(false);
      }

      if (mobileProfileRef.current && !mobileProfileRef.current.contains(target)) {
        setMobileProfileOpen(false);
        setMobileLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLanguageSelect(nextLang: AppLocale) {
    setLang(nextLang);
    setLanguageMenuOpen(false);
    router.refresh();
  }

  function getProfileMenuLabel(key: (typeof profileMenuItemsBeforeLanguage)[number]["key"]) {
    if (key === "edit-profile") return ui.profileMenu.editProfile;
    return ui.profileMenu.preferences;
  }

  function getProfileMenuLabelAfter(key: (typeof profileMenuItemsAfterLanguage)[number]["key"]) {
    if (key === "desktop-app") return ui.profileMenu.desktopApp;
    return ui.profileMenu.logout;
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
              <img
                src="/salesflow-sf-mark.svg"
                alt=""
                aria-hidden
                className="h-8 w-auto shrink-0"
              />
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
                      icon={navIcons.invoices}
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
                      icon={navIcons.orders}
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
                      icon={navIcons.reports}
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
                    <span className="flex min-w-0 items-center gap-2.5">
                      <SidebarNavIcon icon={navIcons[item.key]} />
                      <span className="truncate">{ui.nav[item.key]}</span>
                    </span>
                  </Link>
                );
              })}

              <SidebarDivider />

              <Link
                href={inboxItem.href}
                className={secondaryNavClass(activeItem === inboxItem.key)}
              >
                <SidebarNavIcon icon={navIcons.inbox} size="sm" />
                <span className="truncate">{ui.nav[inboxItem.key]}</span>
              </Link>

              <SidebarDivider />

              {secondaryItems.map((item) => {
                const href = item.href === "#" ? "#" : item.href;

                return (
                  <Link key={item.key} href={href} className={secondaryNavClass(activeItem === item.key)}>
                    <SidebarNavIcon icon={navIcons[item.key]} size="sm" />
                    <span className="truncate">{ui.nav[item.key]}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-300/20 px-2.5 py-2.5">
            <div ref={profileRef} className="relative">
              <button
                type="button"
                aria-label="Profile menu"
                onClick={() => {
                  setProfileOpen((open) => {
                    if (open) setLanguageMenuOpen(false);
                    return !open;
                  });
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition",
                  profileOpen
                    ? "bg-white/12 text-white"
                    : "text-white/75 hover:bg-white/8 hover:text-white",
                ].join(" ")}
              >
                <AvatarBadge compact />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{profile.name}</span>
              </button>

              {profileOpen ? (
                <ProfileDropdown
                  lang={lang}
                  ui={ui}
                  languageMenuOpen={languageMenuOpen}
                  onToggleLanguageMenu={() => setLanguageMenuOpen((open) => !open)}
                  onLanguageSelect={handleLanguageSelect}
                  getProfileMenuLabel={getProfileMenuLabel}
                  getProfileMenuLabelAfter={getProfileMenuLabelAfter}
                  placement="sidebar"
                />
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>

            <Link href={homeHref} className="flex min-w-0 flex-1 items-center gap-2">
              <img
                src="/salesflow-sf-mark.svg"
                alt=""
                aria-hidden
                className="h-7 w-auto shrink-0"
              />
              <span className="truncate text-lg font-semibold tracking-wide text-slate-800">
                SalesFlow
              </span>
            </Link>

            <div ref={mobileProfileRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="Profile menu"
                aria-expanded={mobileProfileOpen}
                onClick={() => {
                  setMobileProfileOpen((open) => {
                    if (open) setMobileLanguageMenuOpen(false);
                    return !open;
                  });
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100"
              >
                <AvatarBadge compact />
              </button>

              {mobileProfileOpen ? (
                <ProfileDropdown
                  lang={lang}
                  ui={ui}
                  languageMenuOpen={mobileLanguageMenuOpen}
                  onToggleLanguageMenu={() => setMobileLanguageMenuOpen((open) => !open)}
                  onLanguageSelect={(locale) => {
                    handleLanguageSelect(locale);
                    setMobileProfileOpen(false);
                  }}
                  getProfileMenuLabel={getProfileMenuLabel}
                  getProfileMenuLabelAfter={getProfileMenuLabelAfter}
                  placement="header"
                />
              ) : null}
            </div>
          </header>

          {mobileNavOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-black/40"
                onClick={closeMobileNav}
              />
              <aside className="relative flex h-full w-[min(280px,85vw)] flex-col border-r border-slate-300 bg-[#434a56] text-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-300/40 bg-white px-4 py-4">
                  <Link
                    href={homeHref}
                    onClick={closeMobileNav}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <img
                      src="/salesflow-sf-mark.svg"
                      alt=""
                      aria-hidden
                      className="h-7 w-auto shrink-0"
                    />
                    <span className="truncate text-lg font-semibold text-slate-800">SalesFlow</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={closeMobileNav}
                    className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                  <MobileShellNavigation
                    activeItem={activeItem}
                    lang={lang}
                    labels={ui.nav}
                    navIcons={navIcons}
                    homeHref={homeHref}
                    onNavigate={closeMobileNav}
                  />
                </div>

                <div className="shrink-0 border-t border-slate-300/20 px-4 py-3">
                  <p className="truncate text-sm font-medium text-white/90">{profile.name}</p>
                  <p className="truncate text-xs text-white/50">{profile.email}</p>
                </div>
              </aside>
            </div>
          ) : null}

          <div className="flex-1 bg-white pt-14 lg:pt-0">{children}</div>
          <footer className="bg-[#eef3f8] px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
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

type ShellUi = (typeof copy)[AppLocale];

function ProfileDropdown({
  lang,
  ui,
  languageMenuOpen,
  onToggleLanguageMenu,
  onLanguageSelect,
  getProfileMenuLabel,
  getProfileMenuLabelAfter,
  placement,
}: {
  lang: AppLocale;
  ui: ShellUi;
  languageMenuOpen: boolean;
  onToggleLanguageMenu: () => void;
  onLanguageSelect: (locale: AppLocale) => void;
  getProfileMenuLabel: (key: (typeof profileMenuItemsBeforeLanguage)[number]["key"]) => string;
  getProfileMenuLabelAfter: (key: (typeof profileMenuItemsAfterLanguage)[number]["key"]) => string;
  placement: "sidebar" | "header";
}) {
  const positionClass =
    placement === "sidebar"
      ? "absolute bottom-0 left-[calc(100%+8px)] z-20"
      : "absolute right-0 top-[calc(100%+8px)] z-50";

  return (
    <div
      className={[
        positionClass,
        "w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-700/30 bg-[#141c2b] text-white shadow-xl",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <AvatarBadge compact />
        <p className="min-w-0 truncate text-sm font-semibold text-white">{profile.name}</p>
      </div>

      <div className="border-t border-white/10">
        {profileMenuItemsBeforeLanguage.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/4"
            >
              <Icon className="h-4 w-4 text-white/80" strokeWidth={1.75} aria-hidden="true" />
              <span>{getProfileMenuLabel(item.key)}</span>
            </button>
          );
        })}

        <div className="border-t border-white/10">
          <button
            type="button"
            onClick={onToggleLanguageMenu}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/4"
            aria-expanded={languageMenuOpen}
          >
            <Globe className="h-4 w-4 shrink-0 text-white/80" strokeWidth={1.75} aria-hidden="true" />
            <span className="min-w-0 flex-1">{ui.profileMenu.languageSettings}</span>
            <span className="truncate text-xs text-white/45">{localeDisplayNames[lang]}</span>
            <ChevronDown
              className={[
                "h-4 w-4 shrink-0 text-white/50 transition",
                languageMenuOpen ? "rotate-180" : "",
              ].join(" ")}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>

          {languageMenuOpen ? (
            <div className="space-y-0.5 px-2 pb-2">
              {(["ko", "ja", "en"] as const).map((locale) => {
                const selected = locale === lang;

                return (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => onLanguageSelect(locale)}
                    className={[
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                      selected
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <span>{localeDisplayNames[locale]}</span>
                    {selected ? (
                      <Check className="h-4 w-4 text-cyan-300" strokeWidth={2} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {profileMenuItemsAfterLanguage.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              className={[
                "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/4",
                item.key === "logout" ? "border-t border-white/10" : "",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 text-white/80" strokeWidth={1.75} aria-hidden="true" />
              <span>{getProfileMenuLabelAfter(item.key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AvatarBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-full bg-[#6b67f2] font-semibold text-white",
        compact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-sm",
      ].join(" ")}
    >
      {profile.initials}
    </div>
  );
}
