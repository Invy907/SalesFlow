"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { SettingsEmailAlert } from "../../settings/settings-shared";
import { getOrdersContent, getOrdersHref } from "../content";
import { OrderMainInner } from "../order-main-inner";
import { OrderSubNav } from "../order-sub-nav";

const featureIcons = [
  <svg key="table" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M3 10h18M9 10v9M15 10v9" />
  </svg>,
  <svg key="user" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    <path d="M17 9l1.5 1.5L21 8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="repeat" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 7h10a3 3 0 0 1 0 6H9" strokeLinecap="round" />
    <path d="M7 7 5 5M7 7 5 9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 17H7a3 3 0 0 1 0-6h8" strokeLinecap="round" />
    <path d="M17 17l2 2M17 17l2-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
];

function StepPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded border border-slate-200 bg-white p-3 text-left shadow-sm">
        <div className="text-[10px] font-semibold text-slate-700">受注フォームの新規作成</div>
        <div className="mt-2 space-y-1.5">
          <div className="h-2 w-3/4 rounded bg-slate-100" />
          <div className="h-2 w-1/2 rounded bg-slate-100" />
          <div className="mt-2 h-16 rounded border border-slate-200 bg-slate-50" />
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="rounded border border-slate-200 bg-white p-3 text-left shadow-sm">
        <div className="text-[10px] font-semibold text-slate-700">注文フォーム</div>
        <div className="mt-2 space-y-1">
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-2 text-[9px] text-slate-500">
              <span className="flex-1 truncate">品目 {row}</span>
              <span className="w-8 rounded border border-slate-200 px-1 text-center">0</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-3 text-left shadow-sm">
      <div className="text-[10px] font-semibold text-slate-700">受注管理</div>
      <div className="mt-2 space-y-1">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-2 border-b border-slate-100 pb-1 text-[9px] text-slate-500">
            <span className="w-12">2026/05</span>
            <span className="flex-1 truncate">取引先 {row}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaSection({ heading, buttonLabel, href }: { heading: string; buttonLabel: string; href: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-[18px] font-bold text-slate-900">{heading}</p>
      <Link
        href={href}
        className="mt-6 inline-flex min-w-[360px] items-center justify-center rounded bg-[#14a7bb] px-8 py-4 text-[16px] font-semibold text-white transition hover:bg-[#1096a8]"
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

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

          <div className="text-center">
            <p className="text-[15px] font-medium text-[#14a7bb]">{landing.subtitle}</p>
            <h1 className="mt-3 whitespace-pre-line text-[34px] font-bold leading-tight text-[#14a7bb]">
              {landing.title}
            </h1>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-10">
            {landing.features.map((feature, index) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#14a7bb] text-white">
                  {featureIcons[index]}
                </div>
                <h2 className="mt-5 text-[17px] font-bold text-slate-900">{feature.title}</h2>
                <p className="mt-3 text-[14px] leading-7 text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          <CtaSection heading={landing.ctaHeading} buttonLabel={landing.ctaButton} href={newHref} />

          <div className="border-t border-slate-200 pt-12">
            <h2 className="text-center text-[22px] font-bold text-[#14a7bb]">{landing.howTitle}</h2>
            <div className="mt-10 grid grid-cols-3 gap-8">
              {landing.steps.map((step, index) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-[140px] w-full max-w-[260px] items-center justify-center rounded border border-slate-200 bg-[#f5f7fa] p-4">
                    <StepPreview index={index} />
                  </div>
                  <p className="mt-4 text-[14px] font-semibold leading-6 text-slate-800">{step.title}</p>
                </div>
              ))}
            </div>
          </div>

          <CtaSection heading={landing.ctaHeading} buttonLabel={landing.ctaButton} href={newHref} />
        </div>
      </OrderMainInner>
    </SalesFlowShell>
  );
}
