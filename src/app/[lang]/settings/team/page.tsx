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
              <div className="w-full max-w-lg">
                <label className="block text-xs font-medium text-slate-500">{team.emailLabel}</label>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_8.5rem_auto] items-stretch gap-2 overflow-x-auto">
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="h-10 min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                  <select
                    aria-label={team.roleLabel}
                    defaultValue="member"
                    className="h-10 w-[8.5rem] shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="admin">{team.roleAdmin}</option>
                    <option value="member">{team.roleMember}</option>
                    <option value="viewer">{team.roleViewer}</option>
                  </select>
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-slate-100 px-4 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed"
                  >
                    {team.inviteButton}
                  </button>
                </div>
              </div>
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
