"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { SettingsEmailAlert } from "../../settings/settings-shared";
import { getOrdersContent, getOrdersHref } from "../content";
import { getSupportHref } from "../../support/content";
import { OrderMainInner } from "../order-main-inner";
import { OrderSubNav } from "../order-sub-nav";

export default function OrderFormPage() {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);
  const landing = ui.form.landing;
  const newHref = getOrdersHref(lang, "form-new");

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

          <div className="py-16 text-center">
            <p className="text-[18px] font-bold text-slate-900">{landing.ctaHeading}</p>
            <Link
              href={newHref}
              className="mt-6 inline-flex w-full max-w-full items-center justify-center rounded bg-[#0A4D34] px-8 py-4 text-[16px] font-semibold text-white transition hover:bg-[#083D29] sm:w-auto sm:min-w-[280px]"
            >
              {landing.ctaButton}
            </Link>
            <div className="mt-5">
              <Link
                href={getSupportHref(lang, "order-form-guide")}
                className="text-[14px] font-medium text-[#0A4D34] hover:underline"
              >
                {ui.form.guideLink}
              </Link>
            </div>
          </div>
        </div>
      </OrderMainInner>
    </SalesFlowShell>
  );
}
