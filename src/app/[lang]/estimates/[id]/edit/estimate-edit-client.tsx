"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import {
  DocumentBottomBar,
  DocumentLineItemsTable,
  EMPTY_LINE_ITEM_TOTALS,
  type LineItemTotals,
} from "../../../documents/new-document-shared";
import { getEstimateContent } from "../../content";
import { DateFieldInput } from "../../date-field-input";
import { toDateInputValue } from "../../date-field-utils";

type Props = {
  id: string;
};

type TabKey = "basic" | "recipient" | "tax" | "template";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "basic", label: "基本情報" },
  { key: "recipient", label: "送付先" },
  { key: "tax", label: "課税設定" },
  { key: "template", label: "テンプレート" },
];

export function EstimateEditClient({ id }: Props) {
  const { lang } = useLanguage();
  const ui = getEstimateContent(lang);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [remarks, setRemarks] = useState("");
  const [lineItemTotals, setLineItemTotals] = useState<LineItemTotals>(EMPTY_LINE_ITEM_TOTALS);

  return (
    <>
      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:py-10 lg:pb-32">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">
          見積書の編集
        </h1>

        <div className="mt-10 flex gap-4 border-b border-slate-200 text-[18px] text-slate-500">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "border border-transparent border-b-0 px-5 py-3",
                activeTab === tab.key
                  ? "rounded-t border-cyan-400 bg-white font-semibold text-slate-900 shadow-[inset_0_-2px_0_0_#fff]"
                  : "text-slate-500",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-8">
          {activeTab === "basic" ? <BasicTab ui={ui} /> : null}
          {activeTab === "recipient" ? <RecipientTab /> : null}
          {activeTab === "tax" ? <TaxTab /> : null}
          {activeTab === "template" ? <TemplateTab /> : null}
        </div>

        <DocumentLineItemsTable
          ui={ui}
          storageKey={`estimate-edit-${id}-line-items`}
          onTotalsChange={setLineItemTotals}
        />

        <div className="mt-10">
          <label className="mb-2 block text-[18px] font-semibold text-slate-800">
            備考
          </label>
          <textarea
            className="field min-h-[120px]"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />

          {activeTab === "tax" ? (
            <div className="mt-4 flex items-center gap-4">
              <button className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                文書初期設定の備考を使う
              </button>
              <a href="#" className="text-cyan-600 hover:text-cyan-700">
                文書初期設定
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <DocumentBottomBar
        subtotalLabel={ui.subtotal}
        taxLabel={ui.tax}
        totalLabel={ui.total}
        saveLabel={ui.save}
        totals={lineItemTotals}
      />
    </>
  );
}

function BasicTab({ ui }: { ui: ReturnType<typeof getEstimateContent> }) {
  const [issueDate, setIssueDate] = useState(() => toDateInputValue(ui.issueDateValue));
  const [expiryDate, setExpiryDate] = useState("");

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section>
        <SectionTitle title="見積情報" />
        <div className="mt-5 space-y-5">
          <FormField label="取引先" required="必須">
            <div className="flex items-center justify-between gap-4 rounded border border-slate-200 bg-white px-4 py-4 text-[16px]">
              <div>
                <span className="font-medium text-slate-900">11111 様</span>
                <button className="ml-2 text-cyan-600 hover:text-cyan-700">
                  (編集)
                </button>
              </div>
              <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                他の取引先を指定
              </button>
            </div>
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={ui.issueDate} required={ui.required}>
              <DateFieldInput
                value={issueDate}
                onChange={setIssueDate}
                placeholder={ui.issueDate}
                variant="card"
              />
            </FormField>
            <FormField label={ui.expiryDate}>
              <DateFieldInput
                value={expiryDate}
                onChange={setExpiryDate}
                placeholder={ui.noDate}
                variant="card"
              />
            </FormField>
          </div>

          <FormField label={ui.estimateNumber} required={ui.required}>
            <p className="mb-2 text-sm text-cyan-600">{ui.estimateHint}</p>
            <input className="field" defaultValue={ui.estimateNumberValue} />
          </FormField>

          <FormField label={ui.subject}>
            <input className="field" />
            <div className="mt-1 text-right text-sm text-slate-400">0/70</div>
          </FormField>
        </div>
      </section>

      <section>
        <SectionTitle title={ui.recipientInfo} />
        <div className="mt-5 space-y-5">
          <FormField label={ui.companyName} required={ui.requiredLine}>
            <input className="field" defaultValue={ui.companyValue} />
            <input className="field mt-2" />
            <input className="field mt-2" />
          </FormField>
          <button className="text-[15px] font-medium text-cyan-600">
            {ui.detailLink}
          </button>
        </div>
      </section>
    </div>
  );
}

function RecipientTab() {
  return (
    <div className="max-w-[620px]">
      <FormField label="郵便番号">
        <p className="mb-2 text-sm text-slate-400">000-0000形式(半角)で入力してください。</p>
        <div className="flex gap-2">
          <input className="field max-w-[180px]" placeholder="000-0000" />
          <button className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            郵便番号から検索
          </button>
        </div>
      </FormField>

      <div className="mt-5 space-y-5">
        <FormField label="住所">
          <input className="field" />
          <input className="field mt-2" />
        </FormField>

        <FormField label="名前">
          <input className="field" defaultValue="11111" />
          <input className="field mt-2" placeholder="（例）部署名" />
          <input className="field mt-2" placeholder="（例）課名" />
          <div className="mt-2 flex gap-2">
            <input className="field flex-1" placeholder="（例）担当者名" />
            <div className="field flex w-20 items-center justify-center bg-white text-xl text-slate-700">
              様
            </div>
          </div>
        </FormField>
      </div>
    </div>
  );
}

function TaxTab() {
  return (
    <div className="max-w-[620px] space-y-10">
      <section>
        <SectionTitle title="消費税設定" />
        <div className="mt-5 space-y-3 text-[18px] text-slate-800">
          <RadioRow label="税別表示" checked />
          <RadioRow label="税込表示" />
          <RadioRow label="税込表示（免税）" />
        </div>
      </section>

      <section>
        <SectionTitle title="消費税端数処理" />
        <p className="mt-3 text-sm text-slate-400">
          「小計」にかかる消費税の小数点以下の処理方法を選択できます。
        </p>
        <div className="mt-5 space-y-3 text-[18px] text-slate-800">
          <RadioRow label="切り捨て" checked />
          <RadioRow label="切り上げ" />
          <RadioRow label="四捨五入" />
        </div>
      </section>
    </div>
  );
}

function TemplateTab() {
  return (
    <div className="grid gap-8 xl:grid-cols-[210px_1fr]">
      <div>
        <div className="overflow-hidden rounded border border-cyan-400 bg-white">
          <div className="flex h-[330px] items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfd_100%)] px-4">
            <div className="h-[250px] w-[160px] border border-slate-300 bg-white shadow-sm" />
          </div>
          <div className="bg-[#14a7bb] py-3 text-center text-[18px] font-medium text-white">
            スタンダード
          </div>
        </div>
        <button className="mt-4 rounded border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          テンプレートを変更
        </button>
      </div>

      <div className="max-w-[640px]">
        <h2 className="text-[24px] font-bold text-slate-900">カスタマイズオプション</h2>
        <p className="mt-4 text-[18px] leading-8 text-slate-700">
          テンプレートの内容を変更できます。初期値は文書初期設定で変更可能です
          <a href="#" className="ml-2 text-cyan-600 hover:text-cyan-700">
            → 設定画面へ
          </a>
        </p>

        <div className="mt-8 space-y-5">
          <FormField label="表題">
            <select className="field max-w-[180px] bg-white">
              <option>見積書</option>
              <option>御見積書</option>
            </select>
          </FormField>

          <FormField label="メッセージ">
            <input
              className="field"
              defaultValue="下記のとおりお見積申し上げます。"
            />
          </FormField>

          <div className="pt-2">
            <h3 className="text-[18px] font-semibold text-slate-900">明細項目の表示名</h3>
            <p className="mt-3 text-[18px] text-slate-700">
              この設定は、注文書・注文請書にも適用されます。
            </p>
          </div>

          <InlineInput label="品番・品名" hint="30文字以内で入力してください。" placeholder="品番・品名" />
          <InlineInput label="数量" hint="10文字以内で入力してください。" placeholder="数量" />
          <InlineInput label="単価" hint="10文字以内で入力してください。" placeholder="単価" />
          <InlineInput label="金額" hint="10文字以内で入力してください。" placeholder="金額" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <h2 className="text-[24px] font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-[16px] font-semibold text-slate-800">
        <span>{label}</span>
        {required ? (
          <span className="rounded bg-[#f59b45] px-2 py-0.5 text-xs font-bold text-white">
            {required}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function RadioRow({
  label,
  checked = false,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3">
      <input type="radio" defaultChecked={checked} name={label} />
      <span>{label}</span>
      <span className="text-sm text-slate-400">?</span>
    </label>
  );
}

function InlineInput({
  label,
  hint,
  placeholder,
}: {
  label: string;
  hint: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[18px] font-semibold text-slate-900">{label}</label>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
      <input className="field mt-2 max-w-[410px]" placeholder={placeholder} />
    </div>
  );
}
