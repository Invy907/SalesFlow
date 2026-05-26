"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
  SettingsSaveBar,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export default function SettingsDisplayPage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const display = ui.display;

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="display" />

      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-24 lg:px-8 lg:py-10 lg:pb-28">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{display.title}</h1>

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={display.listSection} />
            <div className="px-6 py-6">
              <label className="block text-[16px] font-semibold text-slate-800">
                {display.listPerPageLabel}
              </label>
              <p className="mt-2 text-[14px] text-slate-600">
                {display.listPerPageDesc}{" "}
                <a href="#" className="inline-flex items-center gap-1 text-[#14a7bb] hover:underline">
                  {display.help}
                  <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
                    <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
                    <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
                  </svg>
                </a>
              </p>
              <div className="mt-4 flex items-center gap-2">
                <select className="field w-[100px] bg-white" defaultValue="30">
                  {display.pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="text-[15px] text-slate-600">{display.itemsUnit}</span>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={display.homeSection} />
            <div className="px-6 py-6">
              <p className="text-[14px] text-slate-600">{display.homeDesc}</p>
              <select className="field mt-4 max-w-[240px] bg-white" defaultValue="home">
                <option value="home">{display.homeOptionHome}</option>
              </select>
            </div>
          </section>
        </div>
      </div>

      <SettingsSaveBar label={ui.save} />
    </SalesFlowShell>
  );
}
