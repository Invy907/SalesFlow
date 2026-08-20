"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { RequiredBadge } from "../list-page-shared";
import { createItem, updateItem } from "@/lib/actions/items";
import type { TaxCategory } from "@/lib/tax";
import { getItemsContent, getItemsHref } from "./content";

export type ItemFormValues = {
  id?: string;
  name: string;
  unit: string;
  unitPrice: string;
  taxCategory: TaxCategory;
  withholdingExempt: boolean;
};

export const EMPTY_ITEM: ItemFormValues = {
  name: "",
  unit: "",
  unitPrice: "",
  taxCategory: "follow_company",
  withholdingExempt: false,
};

export function ItemForm({ initial }: { initial: ItemFormValues }) {
  const { lang } = useLanguage();
  const ui = getItemsContent(lang);
  const form = ui.newItem;
  const router = useRouter();

  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const taxOptions: Array<{ value: TaxCategory; label: string; help?: string }> = [
    { value: "follow_company", label: form.taxFollowCompany, help: form.taxFollowCompanyHelp },
    { value: "standard_10", label: form.tax10 },
    { value: "reduced_8", label: form.taxReduced8 },
    { value: "standard_8", label: form.tax8 },
    { value: "exempt", label: form.taxExempt },
    { value: "standard_5", label: form.tax5 },
  ];

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const payload = {
        name: values.name,
        unit: values.unit,
        unitPrice: Number(values.unitPrice),
        taxCategory: values.taxCategory,
        withholdingExempt: values.withholdingExempt,
      };
      const result = values.id
        ? await updateItem(values.id, payload)
        : await createItem(payload);

      if (result.ok) {
        setErrors({});
        router.push(`/${lang}${getItemsHref(lang, "list")}`);
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.error || ui.saveFailed);
      }
    });
  }

  const err = (key: string) =>
    errors[key] ? <p className="mt-1 text-[13px] text-red-600">{errors[key]}</p> : null;

  return (
    <SalesFlowShell activeItem="items">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{form.title}</h1>
          <Link
            href={`/${lang}${getItemsHref(lang, "list")}`}
            className="text-[15px] text-[#14a7bb] hover:underline"
          >
            {form.backToList}
          </Link>
        </div>

        <div className="mt-8 max-w-[760px] rounded border border-slate-200 bg-white">
          <div className="divide-y divide-slate-200 px-6 py-2 md:px-8">
            <ItemFormSection label={form.itemName} required={form.required} hint={form.itemNameHint}>
              <input
                className="field"
                maxLength={255}
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              />
              {err("name")}
            </ItemFormSection>

            <ItemFormSection label={form.unit} hint={form.unitHint}>
              <input
                className="field max-w-[220px]"
                maxLength={255}
                value={values.unit}
                onChange={(e) => setValues((v) => ({ ...v, unit: e.target.value }))}
              />
              {err("unit")}
            </ItemFormSection>

            <ItemFormSection label={form.unitPrice} hint={form.unitPriceHint}>
              <div className="flex items-center gap-3">
                <input
                  className="field max-w-[280px]"
                  inputMode="numeric"
                  maxLength={15}
                  value={values.unitPrice}
                  onChange={(e) => setValues((v) => ({ ...v, unitPrice: e.target.value }))}
                />
                <span className="text-[15px] text-slate-700">{form.yen}</span>
              </div>
              {err("unitPrice")}
            </ItemFormSection>

            <ItemFormSection label={form.taxRateSetting}>
              <div className="space-y-3">
                {taxOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 text-[15px] text-slate-800"
                  >
                    <input
                      type="radio"
                      name="taxRate"
                      checked={values.taxCategory === option.value}
                      onChange={() => setValues((v) => ({ ...v, taxCategory: option.value }))}
                      className="h-4 w-4 accent-cyan-600"
                    />
                    <span className="flex items-center gap-2">
                      {option.label}
                      {option.help ? (
                        <span title={option.help} className="text-xs text-slate-400">?</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
              {err("taxCategory")}
            </ItemFormSection>

            <ItemFormSection label={form.withholdingTax}>
              <label className="inline-flex cursor-pointer items-center gap-3 text-[15px] text-slate-800">
                <input
                  type="checkbox"
                  checked={values.withholdingExempt}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, withholdingExempt: e.target.checked }))
                  }
                  className="h-4 w-4 accent-cyan-600"
                />
                {form.withholdingExempt}
              </label>
            </ItemFormSection>
          </div>

          <div className="border-t border-slate-200 px-6 py-6 md:px-8">
            {message ? <p className="mb-3 text-sm text-red-600">{message}</p> : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded bg-[#14a7bb] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1096a8] disabled:opacity-60"
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
