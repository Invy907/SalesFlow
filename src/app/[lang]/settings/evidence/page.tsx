"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
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

      <div className="mx-auto w-full min-w-0 [overflow-wrap:anywhere] max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <p className="mb-6 rounded-lg bg-slate-100 p-4 text-sm text-slate-600">{lang === "ko" ? "외부 증빙·회계 서비스 연동은 아직 지원하지 않습니다." : lang === "en" ? "External evidence and accounting integrations are not available yet." : "外部の証憑管理・会計サービスとの連携にはまだ対応していません。"}</p>

        <h1 className="text-2xl font-bold sm:text-[30px] tracking-tight text-slate-900">{evidence.title}</h1>
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
        </div>
      </div>
    </SalesFlowShell>
  );
}
