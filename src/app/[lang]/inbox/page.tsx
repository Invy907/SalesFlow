"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { SettingsEmailAlert } from "../settings/settings-shared";
import { getInboxContent } from "./content";

export default function InboxPage() {
  const { lang } = useLanguage();
  const ui = getInboxContent(lang);

  return (
    <SalesFlowShell activeItem="inbox">
      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <SettingsEmailAlert
          title={ui.emailAlert.title}
          body={ui.emailAlert.body}
          buttonLabel={ui.emailAlert.button}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#14a7bb] hover:underline"
          >
            <HelpCircleIcon />
            {ui.helpLink}
            <ExternalLinkIcon />
          </a>
        </div>

        <div className="mt-20 flex min-h-[420px] items-center justify-center text-[20px] text-slate-300">
          {ui.empty}
        </div>
      </div>
    </SalesFlowShell>
  );
}

function HelpCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-1 3a1 1 0 0 0 0 2h1v3a1 1 0 1 0 2 0v-4a1 1 0 0 0-1-1H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
      <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 0 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
      <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 1 0 0-2H5Z" />
    </svg>
  );
}
