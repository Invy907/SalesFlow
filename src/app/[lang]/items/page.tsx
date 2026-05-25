"use client";

import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  CsvDownloadLink,
  LearnMoreLink,
  ListSearchBar,
} from "../list-page-shared";
import { getItemsContent, getItemsHref } from "./content";
import { ItemsNavTabs } from "./items-shared";

export default function ItemsPage() {
  const { lang } = useLanguage();
  const ui = getItemsContent(lang);

  return (
    <SalesFlowShell activeItem="items">
      <div className="mx-auto max-w-[1260px] px-8 py-10 pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <ItemsNavTabs active="list" />
          <Link
            href={getItemsHref(lang, "new")}
            className="inline-flex shrink-0 items-center justify-center rounded bg-[#f59b45] px-6 py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#ef8d32]"
          >
            {ui.createItem}
          </Link>
        </div>

        <h1 className="mt-8 text-[30px] font-bold tracking-tight text-slate-900">{ui.title}</h1>
        <p className="mt-3 max-w-[900px] text-[15px] leading-7 text-slate-600">
          {ui.intro}
          <LearnMoreLink label={ui.learnMore} />
        </p>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <ListSearchBar placeholder={ui.searchPlaceholder} searchLabel={ui.search} />
          <CsvDownloadLink label={ui.csvDownload} />
        </div>

        <div className="mt-16 flex min-h-[480px] items-center justify-center text-[20px] text-slate-300">
          {ui.empty}
        </div>
      </div>
    </SalesFlowShell>
  );
}
