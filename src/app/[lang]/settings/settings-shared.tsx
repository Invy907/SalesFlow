"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent, getSettingsTabHref, type SettingsTabKey } from "./content";

export function SettingsSubNav({ active }: { active: SettingsTabKey }) {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);

  return (
    <div className="border-b border-slate-200 bg-[#eef3f8]">
      <div className="mx-auto max-w-[1260px] overflow-x-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-max gap-1 py-3">
          {ui.tabKeys.map((key, index) => {
            const isActive = key === active;
            const href = getSettingsTabHref(lang, key);
            const label = ui.tabs[index];
            const isImplemented = href !== "#";

            const className = [
              "whitespace-nowrap rounded px-4 py-2.5 text-[15px] font-medium transition",
              isActive
                ? "bg-[#14a7bb] text-white shadow-sm"
                : isImplemented
                  ? "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  : "text-slate-400 hover:bg-white/50",
            ].join(" ");

            if (!isImplemented) {
              return (
                <span key={key} className={className} aria-disabled="true">
                  {label}
                </span>
              );
            }

            return (
              <Link key={key} href={href} className={className}>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SettingsSectionHeader({ title }: { title: string }) {
  return (
    <div className="rounded-sm bg-[#dbe8f3] px-5 py-3">
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
    <div className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-1 md:grid-cols-[220px_1fr] md:items-start">
      <div>
        <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-800">
          <span>{label}</span>
          {required ? (
            <span className="rounded bg-[#f59b45] px-2 py-0.5 text-xs font-bold text-white">
              {required}
            </span>
          ) : null}
        </div>
        {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
      </div>
      <div>{children}</div>
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
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full min-w-[480px] border-collapse text-[15px]">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
              <td className="w-[240px] bg-[#f8fafc] px-5 py-4 font-medium text-slate-700">
                {row.label}
              </td>
              <td className="px-5 py-4 text-slate-800">{row.value}</td>
              {row.action ? (
                <td className="px-5 py-4 text-right">
                  <a
                    href={row.action.href ?? "#"}
                    className="inline-flex items-center gap-1 text-[#14a7bb] hover:underline"
                  >
                    {row.action.label}
                    <ExternalLinkIcon />
                  </a>
                </td>
              ) : (
                <td className="hidden md:table-cell" />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="grid gap-8 border-b border-slate-200 py-8 xl:grid-cols-[220px_1fr]">
      <div>
        <p className="mb-3 text-[16px] font-semibold text-slate-800">{templateLabel}</p>
        <div className="overflow-hidden rounded border border-cyan-400 bg-white">
          <div className="h-[280px] overflow-hidden bg-linear-to-b from-white to-slate-50 px-2 pt-2">
            {preview}
          </div>
          <div className="bg-[#14a7bb] py-2.5 text-center text-[15px] font-semibold text-white">
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
          <a href="#" className="text-[#14a7bb] hover:underline">
            {customizeLink}
          </a>
        </p>
        <div className="mt-6 max-w-[640px] space-y-1">{children}</div>
      </div>
    </div>
  );
}

export function SettingsSaveBar({ label, onSave }: { label: string; onSave?: () => void }) {
  return (
    <div className="sticky bottom-0 border-t border-slate-300 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1260px] justify-center px-4 py-5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onSave}
          className="w-full max-w-[280px] rounded bg-[#14a7bb] px-10 py-4 text-[17px] font-semibold text-white transition hover:bg-[#1096a8] sm:w-auto sm:min-w-[280px]"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

export function SettingsWarningAlert({ message }: { message: string }) {
  return (
    <div className="mb-8 rounded border border-[#f5c2c7] bg-[#fdf2f2] px-6 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg text-red-500" aria-hidden="true">
          ⚠
        </span>
        <p className="text-[15px] font-semibold leading-7 text-slate-800">{message}</p>
      </div>
    </div>
  );
}

export function SettingsEmailAlert({
  title,
  body,
  buttonLabel,
}: {
  title: string;
  body: string;
  buttonLabel: string;
}) {
  return (
    <div className="mb-8 rounded border border-[#f5c2c7] bg-[#fdf2f2] px-6 py-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg text-red-500" aria-hidden="true">
          ⚠
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-slate-800">{title}</p>
          <p className="mt-2 text-[14px] leading-7 text-slate-600">{body}</p>
          <button
            type="button"
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
  helpSuffix,
  linkText,
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
  helpSuffix?: string;
  linkText?: string;
  products?: readonly string[];
  buttonLabel: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-6 last:border-b-0">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {icon ?? <IntegrationIconPlaceholder />}
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-slate-800">{title}</p>
          <p className="mt-2 text-[14px] leading-7 text-slate-600">
            {description}
            {linkText ? (
              <>
                {" "}
                <a href="#" className="text-[#14a7bb] hover:underline">
                  ({linkText})
                </a>
              </>
            ) : null}
          </p>
          {note ? <p className="mt-2 text-[13px] text-slate-500">{note}</p> : null}
          {helpText && helpLink ? (
            <p className="mt-2 text-[13px] text-slate-500">
              {helpText}
              <a href="#" className="text-[#14a7bb] hover:underline">
                {helpLink}
              </a>
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
        className="shrink-0 rounded border border-slate-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
  enabled,
  enabledLabel,
  enableLabel,
  disableLabel,
}: {
  title: string;
  description: string;
  linkText?: string;
  enabled?: boolean;
  enabledLabel: string;
  enableLabel: string;
  disableLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-6 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[16px] font-semibold text-slate-800">{title}</p>
          {enabled ? (
            <span className="text-[14px] font-medium text-[#14a7bb]">✓ {enabledLabel}</span>
          ) : null}
        </div>
        <p className="mt-2 text-[14px] leading-7 text-slate-600">
          {description}
          {linkText ? (
            <>
              {" "}
              <a href="#" className="inline-flex items-center gap-1 text-[#14a7bb] hover:underline">
                {linkText}
                <ExternalLinkIcon />
              </a>
            </>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded border border-slate-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50"
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
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#14a7bb] text-white">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
        <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
      </svg>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
      <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
    </svg>
  );
}
