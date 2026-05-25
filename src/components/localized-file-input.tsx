"use client";

import { useId, useState, type ChangeEvent } from "react";
import { getDocumentSharedContent } from "@/app/[lang]/documents/content";
import { useLanguage } from "@/contexts/language-context";

type LocalizedFileInputProps = {
  name: string;
  accept?: string;
};

export function LocalizedFileInput({ name, accept }: LocalizedFileInputProps) {
  const inputId = useId();
  const { lang } = useLanguage();
  const ui = getDocumentSharedContent(lang);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? null);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        {ui.fileChoose}
      </label>
      <input
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
      />
      <span className="text-sm text-slate-500">{fileName ?? ui.fileNoFile}</span>
    </div>
  );
}
