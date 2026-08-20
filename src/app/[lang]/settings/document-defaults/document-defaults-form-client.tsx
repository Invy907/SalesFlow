"use client";

import { useState, useTransition } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { saveDocumentDefaults } from "@/lib/actions/company";
import { getSettingsContent } from "../content";
import {
  SettingsSaveBar,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export type DocumentDefaultsForm = {
  numberingRule: string;
  estimateMessage: string;
  estimateRemarks: string;
  invoiceMessage: string;
  invoiceRemarks: string;
  taxDisplayDefault: string;
  taxRoundingDefault: string;
};

function previewNumbering(rule: string, now = new Date()) {
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const m = rule.match(/\{連番:([YMDA]),(\d+)\}/);
  const digits = m ? Math.min(9, Math.max(1, Number(m[2]))) : 3;
  return rule
    .replace(/\{Y\}/g, yyyy)
    .replace(/\{M\}/g, mm)
    .replace(/\{D\}/g, dd)
    .replace(/\{連番:[YMDA],\d+\}/g, "1".padStart(digits, "0"));
}

export function DocumentDefaultsFormClient({ initial }: { initial: DocumentDefaultsForm }) {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const doc = ui.documentDefaults;

  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveDocumentDefaults({
        numberingRule: form.numberingRule,
        estimateMessage: form.estimateMessage,
        estimateRemarks: form.estimateRemarks,
        invoiceMessage: form.invoiceMessage,
        invoiceRemarks: form.invoiceRemarks,
        taxDisplayDefault: form.taxDisplayDefault,
        taxRoundingDefault: form.taxRoundingDefault,
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="document-defaults" />

      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-24 lg:px-8 lg:py-10 lg:pb-28">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{doc.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{doc.intro}</p>

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white px-6 py-6">
            <SettingsSectionHeader title={doc.commonSection} />
            <h3 className="mt-6 text-[18px] font-semibold text-slate-900">{doc.numberingTitle}</h3>
            <p className="mt-2 text-sm text-slate-500">{doc.numberingDesc}</p>
            <input
              className="field mt-4 max-w-[640px] font-mono text-[15px]"
              value={form.numberingRule}
              onChange={(e) => setForm((f) => ({ ...f, numberingRule: e.target.value }))}
            />
            <p className="mt-3 text-sm font-medium text-slate-600">{doc.numberingPreview}</p>
            <div className="mt-2 max-w-[640px] rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700">
              {previewNumbering(form.numberingRule)}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">税表示</span>
                <select
                  className="field mt-2 bg-white"
                  value={form.taxDisplayDefault}
                  onChange={(e) => setForm((f) => ({ ...f, taxDisplayDefault: e.target.value }))}
                >
                  <option value="separate">税別</option>
                  <option value="included">税込</option>
                  <option value="exempt">免税</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">端数処理</span>
                <select
                  className="field mt-2 bg-white"
                  value={form.taxRoundingDefault}
                  onChange={(e) => setForm((f) => ({ ...f, taxRoundingDefault: e.target.value }))}
                >
                  <option value="round_down">切り捨て</option>
                  <option value="round_up">切り上げ</option>
                  <option value="round_half">四捨五入</option>
                </select>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white px-6 py-6 space-y-4">
            <h3 className="text-[18px] font-semibold">{doc.sections.estimate}</h3>
            <textarea
              className="field min-h-[80px]"
              value={form.estimateMessage}
              onChange={(e) => setForm((f) => ({ ...f, estimateMessage: e.target.value }))}
            />
            <textarea
              className="field min-h-[80px]"
              placeholder={doc.estimateRemarksPlaceholder}
              value={form.estimateRemarks}
              onChange={(e) => setForm((f) => ({ ...f, estimateRemarks: e.target.value }))}
            />
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white px-6 py-6 space-y-4">
            <h3 className="text-[18px] font-semibold">{doc.sections.invoice}</h3>
            <textarea
              className="field min-h-[80px]"
              value={form.invoiceMessage}
              onChange={(e) => setForm((f) => ({ ...f, invoiceMessage: e.target.value }))}
            />
            <textarea
              className="field min-h-[80px]"
              placeholder={doc.invoiceRemarksPlaceholder}
              value={form.invoiceRemarks}
              onChange={(e) => setForm((f) => ({ ...f, invoiceRemarks: e.target.value }))}
            />
          </section>
        </div>
      </div>

      <SettingsSaveBar label={ui.save} onSave={handleSave} pending={pending} error={error} />
    </SalesFlowShell>
  );
}
