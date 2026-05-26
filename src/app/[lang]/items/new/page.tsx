"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { RequiredBadge } from "../../list-page-shared";
import { getItemsContent, getItemsHref } from "../content";

type TaxRateOption = "company" | "10%" | "reduced8" | "8%" | "exempt" | "5%";

export default function NewItemPage() {
  const { lang } = useLanguage();
  const ui = getItemsContent(lang);
  const form = ui.newItem;
  const [taxRate, setTaxRate] = useState<TaxRateOption>("company");
  const [withholdingExempt, setWithholdingExempt] = useState(false);

  const taxOptions: Array<{ value: TaxRateOption; label: string; help?: string }> = [
    { value: "company", label: form.taxFollowCompany, help: form.taxFollowCompanyHelp },
    { value: "10%", label: form.tax10 },
    { value: "reduced8", label: form.taxReduced8 },
    { value: "8%", label: form.tax8 },
    { value: "exempt", label: form.taxExempt },
    { value: "5%", label: form.tax5 },
  ];

  return (
    <SalesFlowShell activeItem="items">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{form.title}</h1>
          <Link href={getItemsHref(lang, "list")} className="text-[15px] text-[#14a7bb] hover:underline">
            {form.backToList}
          </Link>
        </div>

        <div className="mt-8 max-w-[760px] rounded border border-slate-200 bg-white">
          <div className="divide-y divide-slate-200 px-6 py-2 md:px-8">
            <ItemFormSection label={form.itemName} required={form.required} hint={form.itemNameHint}>
              <input className="field" maxLength={255} />
            </ItemFormSection>

            <ItemFormSection label={form.unit} hint={form.unitHint}>
              <input className="field max-w-[220px]" maxLength={255} />
            </ItemFormSection>

            <ItemFormSection label={form.unitPrice} hint={form.unitPriceHint}>
              <div className="flex items-center gap-3">
                <input className="field max-w-[280px]" inputMode="numeric" maxLength={15} />
                <span className="text-[15px] text-slate-700">{form.yen}</span>
              </div>
            </ItemFormSection>

            <ItemFormSection label={form.taxRateSetting}>
              <div className="space-y-3">
                {taxOptions.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-3 text-[15px] text-slate-800">
                    <input
                      type="radio"
                      name="taxRate"
                      checked={taxRate === option.value}
                      onChange={() => setTaxRate(option.value)}
                      className="h-4 w-4 accent-cyan-600"
                    />
                    <span className="flex items-center gap-2">
                      {option.label}
                      {option.help ? (
                        <button
                          type="button"
                          title={option.help}
                          aria-label={option.help}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-bold text-slate-500"
                        >
                          ?
                        </button>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </ItemFormSection>

            <ItemFormSection label={form.withholdingTax}>
              <label className="inline-flex cursor-pointer items-center gap-3 text-[15px] text-slate-800">
                <input
                  type="checkbox"
                  checked={withholdingExempt}
                  onChange={(event) => setWithholdingExempt(event.target.checked)}
                  className="h-4 w-4 accent-cyan-600"
                />
                {form.withholdingExempt}
              </label>
            </ItemFormSection>
          </div>

          <div className="border-t border-slate-200 px-6 py-6 md:px-8">
            <button
              type="button"
              className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8]"
            >
              {form.save}
            </button>
          </div>
        </div>
      </div>
    </SalesFlowShell>
  );
}

function ItemFormSection({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="py-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[16px] font-semibold text-slate-800">{label}</span>
        {required ? <RequiredBadge label={required} /> : null}
      </div>
      {hint ? <p className="mb-3 text-[14px] text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}
