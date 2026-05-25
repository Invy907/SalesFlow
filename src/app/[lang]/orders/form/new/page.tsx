"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getCompanyProfile, isCompanyProfileComplete } from "@/lib/company-profile";
import { DateFieldInput } from "../../../estimates/date-field-input";
import { RequiredBadge } from "../../../list-page-shared";
import { SettingsEmailAlert } from "../../../settings/settings-shared";
import { getOrdersContent } from "../../content";
import { OrderFormLineItemsTable } from "../../order-form-line-items";
import { OrderMainInner } from "../../order-main-inner";
import { OrderSubNav } from "../../order-sub-nav";

export default function NewOrderFormPage() {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);
  const form = ui.form.new;
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [client, setClient] = useState("");
  const [subject, setSubject] = useState("");
  const [expirationMode, setExpirationMode] = useState<"date" | "none">("none");
  const [expirationDate, setExpirationDate] = useState("");

  useEffect(() => {
    if (!isCompanyProfileComplete()) {
      router.replace("/settings/company?from=order-form");
      return;
    }

    const profile = getCompanyProfile();
    setCompanyName(profile?.companyNameLine1 ?? "");
    setReady(true);
  }, [lang, router]);

  if (!ready) {
    return (
      <SalesFlowShell activeItem="orders">
        <OrderSubNav active="form" />
        <OrderMainInner>
          <div className="pt-6" />
        </OrderMainInner>
      </SalesFlowShell>
    );
  }

  return (
    <SalesFlowShell activeItem="orders">
      <OrderSubNav active="form" />

      <OrderMainInner>
        <div className="pt-6">
          <SettingsEmailAlert
            title={ui.form.emailAlert.title}
            body={ui.form.emailAlert.body}
            buttonLabel={ui.form.emailAlert.button}
          />

          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">{form.title}</h1>

          <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-6">
            <div>
              <FieldLabel label={form.companyName} />
              <p className="mt-2 text-[15px] text-slate-800">{companyName || "—"}</p>
            </div>

            <div>
              <FieldLabel label={form.logo} />
              <p className="mt-2 text-[15px] text-slate-500">{form.logoEmpty}</p>
            </div>

            <div>
              <FieldLabel label={form.client} required={form.required} />
              <input
                className="mt-2 w-full rounded border border-slate-300 px-3 py-2.5 text-[15px] text-slate-800 outline-none focus:border-cyan-400"
                value={client}
                onChange={(event) => setClient(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel label={form.expiration} />
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3 text-[15px] text-slate-800">
                  <input
                    type="radio"
                    name="expirationMode"
                    checked={expirationMode === "date"}
                    onChange={() => setExpirationMode("date")}
                    className="h-4 w-4 accent-cyan-600"
                  />
                  <DateFieldInput
                    value={expirationDate}
                    onChange={setExpirationDate}
                    placeholder={form.noDate}
                    variant="field"
                  />
                </label>
                <label className="flex items-center gap-3 text-[15px] text-slate-800">
                  <input
                    type="radio"
                    name="expirationMode"
                    checked={expirationMode === "none"}
                    onChange={() => setExpirationMode("none")}
                    className="h-4 w-4 accent-cyan-600"
                  />
                  {form.noExpiration}
                </label>
              </div>
            </div>

            <div className="col-span-2">
              <FieldLabel label={form.subject} required={form.required} />
              <div className="relative mt-2">
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2.5 pr-16 text-[15px] text-slate-800 outline-none focus:border-cyan-400"
                  maxLength={70}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-[12px] text-slate-400">
                  {form.charCount(subject.length, 70)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <OrderFormLineItemsTable
              headers={form.itemHeaders}
              unitPlaceholder={form.unitPlaceholder}
              addRowLabel={form.addRow}
            />
          </div>

          <div className="mt-12 flex justify-center pb-8">
            <button
              type="button"
              className="min-w-[280px] rounded bg-[#14a7bb] px-8 py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#1096a8]"
            >
              {form.save}
            </button>
          </div>
        </div>
      </OrderMainInner>
    </SalesFlowShell>
  );
}

function FieldLabel({ label, required }: { label: string; required?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[15px] font-semibold text-slate-800">{label}</span>
      {required ? <RequiredBadge label={required} /> : null}
    </div>
  );
}
