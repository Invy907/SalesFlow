"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
  SettingsEmailAlert,
  SettingsEmptyState,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export default function SettingsTeamPage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const team = ui.team;

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="team" />

      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <SettingsEmailAlert
          title={team.emailAlert.title}
          body={team.emailAlert.body}
          buttonLabel={team.emailAlert.button}
        />

        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{team.title}</h1>

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={team.inviteSection} />
            <div className="px-6 py-6">
              <label className="block text-[16px] font-semibold text-slate-800">{team.emailLabel}</label>
              <input type="email" className="field mt-3 max-w-[480px]" />
              <button
                type="button"
                disabled
                className="mt-4 rounded border border-slate-300 bg-slate-100 px-5 py-2.5 text-[14px] font-semibold text-slate-400"
              >
                {team.inviteButton}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader
              title={`${team.membersSection} (${team.membersUsage})`}
            />
            <SettingsEmptyState message={team.membersEmpty} />
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={team.pendingSection} />
            <SettingsEmptyState message={team.pendingEmpty} />
          </section>
        </div>
      </div>
    </SalesFlowShell>
  );
}
