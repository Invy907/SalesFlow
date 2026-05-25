"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
  SettingsEmailAlert,
  SettingsIntegrationRow,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export default function SettingsEvidencePage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const evidence = ui.evidence;

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="evidence" />

      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <SettingsEmailAlert
          title={evidence.emailAlert.title}
          body={evidence.emailAlert.body}
          buttonLabel={evidence.emailAlert.button}
        />

        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{evidence.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{evidence.intro}</p>

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={evidence.evidenceSection} />
            <SettingsIntegrationRow
              title={evidence.smartEvidence.title}
              description={evidence.smartEvidence.desc}
              linkText={evidence.smartEvidence.link}
              buttonLabel={evidence.smartEvidence.button}
              disabled
            />
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={evidence.accountingSection} />
            <SettingsIntegrationRow
              title={evidence.yayoi.title}
              description={evidence.yayoi.desc}
              products={evidence.yayoi.products}
              buttonLabel={evidence.yayoi.button}
              disabled
            />
            <SettingsIntegrationRow
              title={evidence.freee.title}
              description={evidence.freee.desc}
              buttonLabel={evidence.freee.button}
              disabled
              icon={
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#2864f0] text-xs font-bold text-white">
                  f
                </div>
              }
            />
          </section>
        </div>
      </div>
    </SalesFlowShell>
  );
}
