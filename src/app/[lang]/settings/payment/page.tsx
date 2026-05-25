"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import {
  SettingsIntegrationRow,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export default function SettingsPaymentPage() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const payment = ui.payment;

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="payment" />

      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{payment.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{payment.intro}</p>

        <div className="mt-10">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={payment.accountSection} />
            <SettingsIntegrationRow
              title={payment.cardPayment.title}
              description={payment.cardPayment.desc}
              linkText={payment.cardPayment.link}
              buttonLabel={payment.cardPayment.button}
            />
            <SettingsIntegrationRow
              title={payment.deferredPayment.title}
              description={payment.deferredPayment.desc}
              linkText={payment.deferredPayment.link}
              note={payment.deferredPayment.note}
              helpText={payment.deferredPayment.helpPrefix}
              helpLink={payment.deferredPayment.helpLink}
              helpSuffix={payment.deferredPayment.helpSuffix}
              buttonLabel={payment.deferredPayment.button}
            />
          </section>
        </div>
      </div>
    </SalesFlowShell>
  );
}
