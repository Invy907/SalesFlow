"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSupportContent, getSupportHref } from "./content";

export default function SupportPage() {
  const { lang } = useLanguage();
  const ui = getSupportContent(lang);

  return (
    <SalesFlowShell activeItem="support">
      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{ui.intro}</p>

        <section className="mt-10">
          <h2 className="text-[20px] font-bold text-slate-900">{ui.guidesSection}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {ui.guides.map((guide) => (
              <Link
                key={guide.key}
                href={getSupportHref(lang, guide.key as "invoice-guide")}
                className="rounded border border-slate-200 bg-white p-6 transition hover:border-[#14a7bb]/40 hover:shadow-sm"
              >
                <h3 className="text-[18px] font-bold text-[#14a7bb]">{guide.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">{guide.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-[20px] font-bold text-slate-900">{ui.faqSection}</h2>
          <div className="mt-5 space-y-4">
            {ui.faqItems.map((item) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded border border-slate-200 bg-white"
              >
                <summary className="cursor-pointer list-none px-5 py-4 text-[16px] font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <ChevronIcon />
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-5 py-4 text-[15px] leading-7 text-slate-600">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="bg-[#dbe8f3] px-5 py-3.5">
            <h2 className="text-[18px] font-semibold text-slate-800">{ui.contactSection}</h2>
          </div>
          <div className="px-5 py-5">
            <p className="max-w-[900px] text-[15px] leading-7 text-slate-600">{ui.contactIntro}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded bg-[#14a7bb] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]"
              >
                {ui.contactButton}
                <ExternalLinkIcon />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded border border-slate-200 px-5 py-3 text-[15px] font-semibold text-[#14a7bb] transition hover:bg-slate-50"
              >
                {ui.helpCenterLink}
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
        </section>
      </div>
    </SalesFlowShell>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 fill-current text-slate-400 transition group-open:rotate-180"
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
    </svg>
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
