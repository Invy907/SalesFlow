"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { appHrefs } from "@/lib/app-hrefs";
import { SubNavBand } from "../list-page-shared";
import { getSettingsContent, getSettingsTabHref, type SettingsTabKey } from "./content";

export function SettingsSubNav({ active }: { active: SettingsTabKey }) {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);

  const tabs = ui.tabKeys.map((key, index) => {
    const href = getSettingsTabHref(lang, key);
    return {
      key,
      label: ui.tabs[index],
      href,
      disabled: href === "#",
    };
  });

  return <SubNavBand tabs={tabs} activeKey={active} />;
}

export function SettingsSectionHeader({ title }: { title: string }) {
  return (
    <div className="rounded-sm bg-[#dbe8f3] px-4 py-3 [overflow-wrap:anywhere] sm:px-5">
      <h2 className="text-[18px] font-semibold text-slate-800">{title}</h2>
    </div>
  );
}

export function SettingsFormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: string;
  hint?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-3 border-b border-slate-200 py-5 [overflow-wrap:anywhere] md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:items-start md:gap-4 md:py-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-slate-800">
          <span>{label}</span>
          {required ? (
            <span className="rounded bg-[#0A4D34] px-2 py-0.5 text-xs font-bold text-white">
              {required}
            </span>
          ) : null}
        </div>
        {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SettingsInfoTable({
  rows,
}: {
  rows: Array<{
    label: string;
    value: string;
    action?: { label: string; href?: string };
  }>;
}) {
  return (
    <dl className="divide-y divide-slate-200 overflow-hidden rounded border border-slate-200 bg-white text-[15px]">
      {rows.map((row) => (
        <div key={row.label} className="grid min-w-0 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
          <dt className="bg-slate-50 px-4 py-3 font-medium text-slate-700 [overflow-wrap:anywhere] sm:px-5 sm:py-4">
            {row.label}
          </dt>
          <dd className="min-w-0 px-4 py-3 text-slate-800 [overflow-wrap:anywhere] sm:px-5 sm:py-4">
            <span>{row.value}</span>
            {row.action ? (
              <a href={row.action.href ?? "#"} className="mt-2 flex w-fit max-w-full items-start gap-1 text-[#0A4D34] hover:underline">
                <span className="min-w-0">{row.action.label}</span><ExternalLinkIcon />
              </a>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SettingsInlineField({
  label,
  hint,
  placeholder,
  defaultValue,
  multiline = false,
}: {
  label: string;
  hint: string;
  placeholder: string;
  defaultValue?: string;
  multiline?: boolean;
}) {
  return (
    <div className="border-b border-slate-200 py-5 last:border-b-0">
      <label className="block text-[16px] font-semibold text-slate-800">{label}</label>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
      {multiline ? (
        <textarea
          className="field mt-3 min-h-[120px]"
          placeholder={placeholder}
          defaultValue={defaultValue}
        />
      ) : (
        <input className="field mt-3 max-w-[480px]" placeholder={placeholder} defaultValue={defaultValue} />
      )}
    </div>
  );
}

export function SettingsTemplateBlock({
  templateLabel,
  standardLabel,
  changeLabel,
  customizeTitle,
  customizeDesc,
  customizeLink,
  preview,
  children,
}: {
  templateLabel: string;
  standardLabel: string;
  changeLabel: string;
  customizeTitle: string;
  customizeDesc: string;
  customizeLink: string;
  preview: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-8 border-b border-slate-200 py-8 [overflow-wrap:anywhere] xl:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <p className="mb-3 text-[16px] font-semibold text-slate-800">{templateLabel}</p>
        <div className="overflow-hidden rounded border border-[#3AA87A] bg-white">
          <div className="h-[280px] overflow-hidden bg-linear-to-b from-white to-slate-50 px-2 pt-2">
            {preview}
          </div>
          <div className="bg-[#0A4D34] py-2.5 text-center text-[15px] font-semibold text-white">
            {standardLabel}
          </div>
        </div>
        <button
          type="button"
          className="mt-4 rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {changeLabel}
        </button>
      </div>

      <div>
        <h3 className="text-[20px] font-bold text-slate-900">{customizeTitle}</h3>
        <p className="mt-3 text-[15px] leading-7 text-slate-600">
          {customizeDesc}{" "}
          <Link href={appHrefs.settingsDocumentDefaults} className="text-[#0A4D34] hover:underline">
            {customizeLink}
          </Link>
        </p>
        <div className="mt-6 max-w-[640px] space-y-1">{children}</div>
      </div>
    </div>
  );
}

export function SettingsSaveBar({
  label,
  onSave,
  pending,
  error,
}: {
  label: string;
  onSave?: () => void;
  pending?: boolean;
  error?: string | null;
}) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-300 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1260px] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-8">
        {error ? <p className="mb-3 text-center text-sm text-red-600 [overflow-wrap:anywhere]">{error}</p> : null}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onSave}
            disabled={!onSave || pending}
            className="w-full max-w-[280px] rounded bg-[#0A4D34] px-4 py-3 sm:px-10 sm:py-4 text-[17px] font-semibold text-white transition hover:bg-[#083D29] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[280px]"
          >
            {pending ? "..." : label}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsWarningAlert({ message }: { message: string }) {
  return (
    <div className="mb-8 rounded border border-[#f5c2c7] bg-[#fdf2f2] px-4 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg text-red-500" aria-hidden="true">
          ⚠
        </span>
        <p className="min-w-0 text-[15px] font-semibold leading-7 text-slate-800 [overflow-wrap:anywhere]">{message}</p>
      </div>
    </div>
  );
}

export function SettingsEmailAlert({
  title,
  body,
  buttonLabel,
  onButtonClick,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  onButtonClick?: () => void;
}) {
  return (
    <div className="mb-8 rounded border border-[#f5c2c7] bg-[#fdf2f2] px-4 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg text-red-500" aria-hidden="true">
          ⚠
        </span>
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <p className="text-[15px] font-semibold text-slate-800">{title}</p>
          <p className="mt-2 text-[14px] leading-7 text-slate-600">{body}</p>
          <button
            type="button"
            onClick={onButtonClick}
            className="mt-4 rounded border border-slate-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsIntegrationRow({
  title,
  description,
  note,
  helpText,
  helpLink,
  helpHref = appHrefs.support,
  helpSuffix,
  linkText,
  linkHref = appHrefs.support,
  products,
  buttonLabel,
  disabled = false,
  icon,
}: {
  title: string;
  description: string;
  note?: string;
  helpText?: string;
  helpLink?: string;
  helpHref?: string;
  helpSuffix?: string;
  linkText?: string;
  linkHref?: string;
  products?: readonly string[];
  buttonLabel: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 [overflow-wrap:anywhere] last:border-b-0 sm:flex-row sm:gap-6 sm:px-6 sm:py-6">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {icon ?? <IntegrationIconPlaceholder />}
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-slate-800">{title}</p>
          <p className="mt-2 text-[14px] leading-7 text-slate-600">
            {description}
            {linkText ? (
              <>
                {" "}
                <Link href={linkHref} className="text-[#0A4D34] hover:underline">
                  ({linkText})
                </Link>
              </>
            ) : null}
          </p>
          {note ? <p className="mt-2 text-[13px] text-slate-500">{note}</p> : null}
          {helpText && helpLink ? (
            <p className="mt-2 text-[13px] text-slate-500">
              {helpText}
              <Link href={helpHref} className="text-[#0A4D34] hover:underline">
                {helpLink}
              </Link>
              {helpSuffix}
            </p>
          ) : null}
          {products ? (
            <ul className="mt-3 list-inside list-disc text-[13px] leading-6 text-slate-500">
              {products.map((product) => (
                <li key={product}>{product}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        className="w-full max-w-full shrink-0 rounded border border-slate-300 bg-white px-5 py-2.5 sm:w-auto text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export function SettingsFeatureRow({
  title,
  description,
  linkText,
  linkHref = appHrefs.support,
  enabled,
  enabledLabel,
  enableLabel,
  disableLabel,
}: {
  title: string;
  description: string;
  linkText?: string;
  linkHref?: string;
  enabled?: boolean;
  enabledLabel: string;
  enableLabel: string;
  disableLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 [overflow-wrap:anywhere] last:border-b-0 sm:flex-row sm:gap-6 sm:px-6 sm:py-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[16px] font-semibold text-slate-800">{title}</p>
          {enabled ? (
            <span className="text-[14px] font-medium text-[#0A4D34]">✓ {enabledLabel}</span>
          ) : null}
        </div>
        <p className="mt-2 text-[14px] leading-7 text-slate-600">
          {description}
          {linkText ? (
            <>
              {" "}
              <Link href={linkHref} className="inline-flex items-center gap-1 text-[#0A4D34] hover:underline">
                {linkText}
                <ExternalLinkIcon />
              </Link>
            </>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        className="w-full max-w-full shrink-0 rounded border border-slate-300 bg-white px-5 py-2.5 sm:w-auto text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        {enabled ? disableLabel : enableLabel}
      </button>
    </div>
  );
}

export function SettingsEmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-12 text-center text-[15px] text-slate-400">{message}</div>
  );
}

function IntegrationIconPlaceholder() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#0A4D34] text-white">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
        <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
      </svg>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current">
      <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
      <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
    </svg>
  );
}
