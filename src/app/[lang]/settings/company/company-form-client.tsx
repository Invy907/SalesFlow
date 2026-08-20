"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { LocalizedFileInput } from "@/components/localized-file-input";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  saveCompanyProfile,
  uploadCompanyLogo,
  uploadCompanySeal,
} from "@/lib/actions/company";
import { getSettingsContent } from "../content";
import {
  SettingsFormField,
  SettingsSaveBar,
  SettingsSectionHeader,
  SettingsSubNav,
  SettingsWarningAlert,
} from "../settings-shared";

export type CompanyProfileForm = {
  orgId: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  companyNameLine1: string;
  companyNameLine2: string;
  companyNameLine3: string;
  tel: string;
  fax: string;
  email: string;
  invoiceRegistrationNumber: string;
  representativeName: string;
};

function validateInvoiceReg(value: string): boolean {
  if (!value.trim()) return true;
  return /^T\d{13}$/.test(value.trim());
}

export function CompanyFormClient({ initial }: { initial: CompanyProfileForm }) {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const company = ui.company;
  const searchParams = useSearchParams();
  const showOrderFormAlert = searchParams.get("from") === "order-form";

  const [profile, setProfile] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [invoiceRegError, setInvoiceRegError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateField<K extends keyof CompanyProfileForm>(key: K, value: CompanyProfileForm[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    if (key === "invoiceRegistrationNumber") setInvoiceRegError(null);
  }

  function handleInvoiceRegChange(value: string) {
    const digits = value.replace(/^T/, "").replace(/\D/g, "").slice(0, 13);
    updateField("invoiceRegistrationNumber", digits ? `T${digits}` : "");
  }

  function handleSave() {
    if (!validateInvoiceReg(profile.invoiceRegistrationNumber)) {
      setInvoiceRegError("T + 13桁の数字で入力してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveCompanyProfile({
        postalCode: profile.postalCode,
        addressLine1: profile.addressLine1,
        addressLine2: profile.addressLine2,
        addressLine3: profile.addressLine3,
        companyNameLine1: profile.companyNameLine1,
        companyNameLine2: profile.companyNameLine2,
        companyNameLine3: profile.companyNameLine3,
        tel: profile.tel,
        fax: profile.fax,
        email: profile.email,
        invoiceRegistrationNumber: profile.invoiceRegistrationNumber,
        representativeName: profile.representativeName,
      });
      if (!result.ok) setError(result.error);
    });
  }

  async function handleLogo(file: File | null) {
    if (!file) return;
    const result = await uploadCompanyLogo(profile.orgId, file);
    if (!result.ok) setError(result.error);
  }

  async function handleSeal(file: File | null) {
    if (!file) return;
    const result = await uploadCompanySeal(profile.orgId, file);
    if (!result.ok) setError(result.error);
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
              <input
                className="field w-full max-w-[180px]"
                placeholder="000-0000"
                value={profile.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.address} required={company.addressRequired}>
              <input
                className="field"
                placeholder={company.addressPlaceholder1}
                value={profile.addressLine1}
                onChange={(e) => updateField("addressLine1", e.target.value)}
              />
              <input
                className="field mt-2"
                placeholder={company.addressPlaceholder2}
                value={profile.addressLine2}
                onChange={(e) => updateField("addressLine2", e.target.value)}
              />
              <input
                className="field mt-2"
                value={profile.addressLine3}
                onChange={(e) => updateField("addressLine3", e.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.companyName} required={company.companyRequired}>
              <input
                className="field"
                value={profile.companyNameLine1}
                onChange={(e) => updateField("companyNameLine1", e.target.value)}
              />
              <input
                className="field mt-2"
                value={profile.companyNameLine2}
                onChange={(e) => updateField("companyNameLine2", e.target.value)}
              />
              <input
                className="field mt-2"
                value={profile.companyNameLine3}
                onChange={(e) => updateField("companyNameLine3", e.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.tel}>
              <input
                className="field max-w-[320px]"
                value={profile.tel}
                onChange={(e) => updateField("tel", e.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.fax}>
              <input
                className="field max-w-[320px]"
                value={profile.fax}
                onChange={(e) => updateField("fax", e.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.email}>
              <input
                className="field max-w-[480px]"
                type="email"
                value={profile.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </SettingsFormField>

            <SettingsFormField label={company.invoiceNumber} hint={company.invoiceNumberHint}>
              <input
                className="field max-w-[320px]"
                placeholder={company.invoiceNumberPlaceholder}
                value={profile.invoiceRegistrationNumber}
                onChange={(e) => handleInvoiceRegChange(e.target.value)}
                maxLength={14}
              />
              {invoiceRegError ? <p className="mt-1 text-sm text-red-600">{invoiceRegError}</p> : null}
            </SettingsFormField>

            <SettingsFormField label={company.logo} hint={company.logoHint}>
              <LocalizedFileInput
                name="companyLogo"
                accept=".png,.jpg,.jpeg,.gif"
                onChange={handleLogo}
              />
            </SettingsFormField>

            <SettingsFormField label={company.seal} hint={company.sealHint}>
              <LocalizedFileInput
                name="companySeal"
                accept=".png,.jpg,.jpeg,.gif"
                onChange={handleSeal}
              />
            </SettingsFormField>
          </div>
        </div>
      </div>

      <SettingsSaveBar label={ui.save} onSave={handleSave} pending={pending} error={error} />
    </SalesFlowShell>
  );
}

export default function SettingsCompanyPageClient({ initial }: { initial: CompanyProfileForm }) {
  return (
    <Suspense fallback={null}>
      <CompanyFormClient initial={initial} />
    </Suspense>
  );
}
