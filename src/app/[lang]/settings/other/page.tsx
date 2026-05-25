"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
  SettingsFeatureRow,
  SettingsIntegrationRow,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export default function SettingsOtherPage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const other = ui.other;

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="other" />

      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{other.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{other.intro}</p>

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={other.featuresSection} />
            {other.features.map((feature) => (
              <SettingsFeatureRow
                key={feature.title}
                title={feature.title}
                description={feature.desc}
                linkText={"link" in feature ? feature.link : undefined}
                enabled={"enabled" in feature ? feature.enabled : undefined}
                enabledLabel={other.enabled}
                enableLabel={other.enable}
                disableLabel={other.disable}
              />
            ))}
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={other.integrationsSection} />
            <SettingsIntegrationRow
              title={other.calendar.title}
              description={other.calendar.desc}
              linkText={other.calendar.link}
              buttonLabel={other.calendar.button}
            />
          </section>
        </div>
      </div>
    </SalesFlowShell>
  );
}
