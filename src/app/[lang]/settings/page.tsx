"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent, getSettingsTabHref } from "./content";
import { SettingsSubNav } from "./settings-shared";

export default function SettingsTopPage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="top" />

      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.pageTitle}</h1>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {ui.cards.map((card) => {
            const href = getSettingsTabHref(lang, card.key);
            const isLink = href !== "#";

            const body = (
              <>
                <h2 className="text-[20px] font-bold text-[#14a7bb]">{card.title}</h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">{card.description}</p>
              </>
            );

            if (!isLink) {
              return (
                <div
                  key={card.key}
                  className="rounded border border-slate-200 bg-white p-6 opacity-70"
                >
                  {body}
                </div>
              );
            }

            return (
              <Link
                key={card.key}
                href={href}
                className="rounded border border-slate-200 bg-white p-6 transition hover:border-cyan-300 hover:shadow-md"
              >
                {body}
              </Link>
            );
          })}
        </div>
      </div>
    </SalesFlowShell>
  );
}
