"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocalizedFileInput } from "@/components/localized-file-input";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  getCompanyProfile,
  saveCompanyProfile,
  type CompanyProfile,
} from "@/lib/company-profile";
import { getSettingsContent } from "../content";
import {
  SettingsFormField,
  SettingsSaveBar,
  SettingsSectionHeader,
  SettingsSubNav,
  SettingsWarningAlert,
} from "../settings-shared";

export default function SettingsCompanyPage() {
  return (
    <Suspense fallback={null}>
      <SettingsCompanyPageContent />
    </Suspense>
  );
}

function SettingsCompanyPageContent() {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const company = ui.company;
  const searchParams = useSearchParams();
  const showOrderFormAlert = searchParams.get("from") === "order-form";

  const [profile, setProfile] = useState<CompanyProfile>({
    postalCode: "",
    addressLine1: "",
    companyNameLine1: "Raon",
    tel: "070-9116-9716",
    fax: "",
    email: "bluebourne907@gmail.com",
  });

  useEffect(() => {
    const saved = getCompanyProfile();
    if (saved) {
      setProfile(saved);
    }
  }, []);

  function updateField<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    saveCompanyProfile(profile);
  }

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="company" />

      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-24 lg:px-8 lg:py-10 lg:pb-28">
        {showOrderFormAlert ? <SettingsWarningAlert message={company.orderFormAlert} /> : null}

        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{company.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{company.intro}</p>

        <div className="mt-10 overflow-hidden rounded border border-slate-200 bg-white">
          <SettingsSectionHeader title={company.basicSection} />

          <div className="px-6">
            <SettingsFormField
              label={company.postalCode}
              required={company.required}
              hint={company.postalCodeHint}
            >
              <div className="flex flex-wrap gap-3">
                <input
                  className="field w-full max-w-[180px]"
                  placeholder="000-0000"
                  value={profile.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                />
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {company.postalCodeLookup}
                </button>
              </div>
            </SettingsFormField>

            <SettingsFormField label={company.address} required={company.addressRequired}>
              <input
                className="field"
                placeholder={company.addressPlaceholder1}
                value={profile.addressLine1}
                onChange={(event) => updateField("addressLine1", event.target.value)}
              />
              <input className="field mt-2" placeholder={company.addressPlaceholder2} />
              <input className="field mt-2" />
            </SettingsFormField>

            <SettingsFormField label={company.companyName} required={company.companyRequired}>
              <input
                className="field"
                value={profile.companyNameLine1}
                onChange={(event) => updateField("companyNameLine1", event.target.value)}
              />
              <input className="field mt-2" />
              <input className="field mt-2" />
            </SettingsFormField>

            <SettingsFormField label={company.tel}>
              <input
                className="field max-w-[320px]"
                value={profile.tel}
                onChange={(event) => updateField("tel", event.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.fax}>
              <input
                className="field max-w-[320px]"
                value={profile.fax}
                onChange={(event) => updateField("fax", event.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.email}>
              <input
                className="field max-w-[480px]"
                type="email"
                value={profile.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField
              label={company.invoiceNumber}
              hint={
                <>
                  {company.invoiceNumberHint}{" "}
                  <a href="#" className="text-[#14a7bb] hover:underline">
                    {company.invoiceNumberLink}
                  </a>
                </>
              }
            >
              <input
                className="field max-w-[320px]"
                placeholder={company.invoiceNumberPlaceholder}
              />
            </SettingsFormField>

            <SettingsFormField label={company.logo} hint={company.logoHint}>
              <LocalizedFileInput name="companyLogo" accept=".png,.jpg,.jpeg,.gif" />
            </SettingsFormField>

            <SettingsFormField label={company.seal} hint={company.sealHint}>
              <LocalizedFileInput name="companySeal" accept=".png,.jpg,.jpeg,.gif" />
            </SettingsFormField>
          </div>
        </div>
      </div>

      <SettingsSaveBar label={ui.save} onSave={handleSave} />
    </SalesFlowShell>
  );
}
