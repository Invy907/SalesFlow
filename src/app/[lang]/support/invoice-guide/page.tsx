"use client";

import { useState } from "react";
import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { SectionTitle } from "@/app/[lang]/documents/new-document-shared";
import { getInvoiceContent } from "@/app/[lang]/invoices/content";
import { useLanguage } from "@/contexts/language-context";
import { getSupportHref } from "../content";
import { getInvoiceGuideContent, guideTabKeys, type GuideTabKey } from "./content";

export default function InvoiceGuidePage() {
  const { lang } = useLanguage();
  const ui = getInvoiceGuideContent(lang);
  const invoiceUi = getInvoiceContent(lang);
  const [activeTab, setActiveTab] = useState<GuideTabKey>("basic");

  const tabs: { key: GuideTabKey; label: string }[] = guideTabKeys.map((key, index) => ({
    key,
    label: invoiceUi.newTabs[index] ?? key,
  }));

  const tabPanel = ui.tabContent[activeTab];

  return (
    <SalesFlowShell activeItem="support">
      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <Link
          href={getSupportHref(lang, "top")}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-cyan-600"
        >
          ← {ui.backToSupport}
        </Link>

        <div className="mt-4 flex flex-wrap items-baseline gap-4">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
          <span className="rounded bg-cyan-600 px-2 py-0.5 text-xs font-bold text-white">
            Guide
          </span>
        </div>
        <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">{ui.intro}</p>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div>
            <div className="flex gap-8 overflow-x-auto border-b border-slate-200 text-[18px] text-slate-500">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "shrink-0 border-b-[3px] px-4 pb-3 transition",
                    activeTab === tab.key
                      ? "border-cyan-500 font-semibold text-slate-900"
                      : "border-transparent hover:text-slate-700",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-10 space-y-10">
              {tabPanel.sections.map((section) => (
                <section key={section.title}>
                  <SectionTitle title={section.title} />
                  <div className="mt-5 space-y-3">
                    {section.tips.map((tip) => (
                      <TipCard
                        key={tip.label}
                        label={tip.label}
                        tip={tip.tip}
                        required={"required" in tip && tip.required ? invoiceUi.required : undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {"note" in tabPanel && tabPanel.note ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] leading-7 text-slate-600">
                  {tabPanel.note}
                </p>
              ) : null}

              {"caution" in tabPanel && tabPanel.caution ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] leading-7 text-amber-950">
                  {tabPanel.caution}
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-8">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="bg-[#dbe8f3] px-5 py-3.5">
                <h2 className="text-[16px] font-semibold text-slate-800">{ui.legalTitle}</h2>
              </div>
              <div className="space-y-4 px-5 py-5">
                <p className="text-[14px] leading-7 text-slate-600">{ui.legalIntro}</p>
                <ol className="space-y-2 text-[14px] leading-6 text-slate-700">
                  {ui.legalItems.map((item, index) => (
                    <li key={item} className="flex gap-2">
                      <span className="shrink-0 font-semibold text-cyan-700">{index + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-[13px] leading-6 text-slate-500">{ui.legalNote}</p>
                <a
                  href={ui.ntaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:underline"
                >
                  {ui.legalLink}
                  <ExternalLinkIcon />
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-[16px] font-semibold text-slate-800">{ui.sidebarTitle}</h2>
                <p className="mt-1 text-xs text-slate-500">{ui.sidebarHint}</p>
              </div>
              <ul className="space-y-2 px-5 py-4 text-[14px] text-slate-600">
                {tabs.map((tab) => {
                  const done = tabs.findIndex((item) => item.key === activeTab) > tabs.findIndex((item) => item.key === tab.key);
                  const current = tab.key === activeTab;

                  return (
                    <li key={tab.key}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={[
                          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition",
                          current ? "bg-cyan-50 font-medium text-cyan-800" : "hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                            done
                              ? "bg-cyan-600 text-white"
                              : current
                                ? "border-2 border-cyan-500 text-cyan-700"
                                : "border border-slate-300 text-slate-400",
                          ].join(" ")}
                        >
                          {done ? "✓" : tabs.findIndex((item) => item.key === tab.key) + 1}
                        </span>
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Link
              href="/invoices/new"
              className="flex w-full items-center justify-center rounded-lg bg-[#14a7bb] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]"
            >
              {ui.createInvoice}
            </Link>
          </aside>
        </div>
      </div>
    </SalesFlowShell>
  );
}

function TipCard({
  label,
  tip,
  required,
}: {
  label: string;
  tip: string;
  required?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[16px] font-semibold text-slate-900">{label}</h3>
        {required ? (
          <span className="rounded bg-[#f59b45] px-2 py-0.5 text-xs font-bold text-white">
            {required}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[14px] leading-7 text-slate-600">{tip}</p>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
      <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
      <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
    </svg>
  );
}
