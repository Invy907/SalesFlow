"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
  SettingsInfoTable,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export default function SettingsAccountPage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const account = ui.account;

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="account" />

      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{account.title}</h1>

        <div className="mt-10 space-y-10">
          <section>
            <SettingsSectionHeader title={account.contractSection} />
            <div className="mt-4">
              <SettingsInfoTable
                rows={[
                  {
                    label: account.contractEntity,
                    value: account.contractEntityValue,
                  },
                  {
                    label: account.contractPlan,
                    value: account.contractPlanValue,
                    action: { label: account.planUpgrade },
                  },
                  {
                    label: account.yayoiSoftware,
                    value: account.yayoiSoftwareValue,
                    action: { label: account.integrationSettings },
                  },
                  {
                    label: account.serviceContractId,
                    value: account.serviceContractIdValue,
                  },
                ]}
              />
            </div>
          </section>

          <section>
            <SettingsSectionHeader title={account.yayoiIdSection} />
            <div className="mt-4 rounded border border-slate-200 bg-white p-6">
              <p className="text-[15px] leading-7 text-slate-600">{account.yayoiIdDesc}</p>
              <div className="mt-6 flex flex-wrap gap-4">
                <ActionButton label={account.yayoiIdButton} />
                <ActionButton label={account.contractInfoButton} />
              </div>
            </div>
          </section>

          <section>
            <SettingsSectionHeader title={account.systemSection} />
            <div className="mt-4">
              <SettingsInfoTable
                rows={[
                  {
                    label: account.userId,
                    value: account.userIdValue,
                  },
                ]}
              />
            </div>
          </section>
        </div>
      </div>
    </SalesFlowShell>
  );
}

function ActionButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded bg-[#14a7bb] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]"
    >
      {label}
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
        <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
      </svg>
    </button>
  );
}
