"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";
import { createOrderFormDraft } from "@/lib/actions/order-forms";
import { taxCategoryFromLabel } from "@/lib/tax";
import { orderFormDraftSchema } from "@/lib/validators/order-form";
import { DateFieldInput } from "../../../estimates/date-field-input";
import { RequiredBadge } from "../../../list-page-shared";
import { getOrdersContent } from "../../content";
import { OrderFormLineItemsTable, createEmptyOrderFormRow, type OrderFormRow } from "../../order-form-line-items";
import { OrderMainInner } from "../../order-main-inner";
import { OrderSubNav } from "../../order-sub-nav";

export type OrderFormInitial = { name: string; subject: string; expirationMode: "date" | "none"; expirationDate: string; rows: OrderFormRow[] };

export default function NewOrderFormClient({ companyName, hasLogo, initial }: { companyName: string; hasLogo: boolean; initial?: OrderFormInitial }) {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);
  const form = ui.form.new;
  const router = useRouter();
  const [client, setClient] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [expirationMode, setExpirationMode] = useState<"date" | "none">(initial?.expirationMode ?? "none");
  const [expirationDate, setExpirationDate] = useState(initial?.expirationDate ?? "");
  const [rows, setRows] = useState<OrderFormRow[]>(initial?.rows.length ? initial.rows : [createEmptyOrderFormRow()]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const draftLabel = lang === "ko" ? "초안으로 저장" : lang === "en" ? "Save draft" : "下書き保存";
  const validationError = lang === "ko" ? "거래처, 제목, 품목명, 0 이상의 정수 단가와 유효한 날짜를 입력해 주세요." : lang === "en" ? "Enter a client, subject, item name, nonnegative whole-number price, and a valid expiration date." : "取引先、件名、品名、0以上の整数の単価、有効な期限を入力してください。";

  function handleSave() {
    if (pending) return;
    const parsed = orderFormDraftSchema.safeParse({ name: client, subject, expirationMode, expirationDate, lines: rows.map((row) => ({ name: row.name, unit: row.unit, unitPrice: row.price.trim() ? Number(row.price) : NaN, taxCategory: taxCategoryFromLabel(row.tax) })) });
    if (!parsed.success) { setError(validationError); return; }
    setError("");
    startTransition(async () => {
      try {
        const result = await createOrderFormDraft(parsed.data);
        if (!result.ok) { setError(result.error); return; }
        router.push(`/${lang}/orders/form`);
        router.refresh();
      } catch {
        setError(lang === "ko" ? "저장하지 못했습니다. 다시 시도해 주세요." : lang === "en" ? "Could not save. Please try again." : "保存できませんでした。もう一度お試しください。");
      }
    });
  }

  return (
    <SalesFlowShell activeItem="orders">
      <OrderSubNav active="form" />

      <OrderMainInner>
        <form className="pt-6" onSubmit={(event) => { event.preventDefault(); handleSave(); }}>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">{form.title}</h1>

          <p className="mt-3 text-sm text-slate-600">{lang === "ko" ? "작성한 폼은 초안으로 저장됩니다. 온라인 공개와 주문 접수는 아직 지원하지 않습니다." : lang === "en" ? "Forms are saved as drafts. Online publishing and order collection are not available yet." : "フォームは下書きとして保存します。オンライン公開と注文受付はまだ利用できません。"}</p>
          {error ? <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p> : null}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            <div>
              <FieldLabel label={form.companyName} />
              <p className="mt-2 text-[15px] text-slate-800 [overflow-wrap:anywhere]">{companyName || "—"}</p>
            </div>

            <div>
              <FieldLabel label={form.logo} />
              <p className="mt-2 text-[15px] text-slate-500">{hasLogo ? (lang === "ko" ? "등록됨" : lang === "en" ? "Registered" : "登録済み") : form.logoEmpty}</p>
            </div>

            <div>
              <FieldLabel label={form.client} required={form.required} />
              <input
                className="mt-2 w-full rounded border border-slate-300 px-3 py-2.5 text-[15px] text-slate-800 outline-none focus:border-[#3AA87A]"
                required
                maxLength={200}
                aria-label={form.client}
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
                    className="h-4 w-4 shrink-0 accent-[#0A4D34]"
                  />
                  <DateFieldInput
                    value={expirationDate}
                    onChange={(value) => { setExpirationDate(value); setExpirationMode("date"); }}
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
                    className="h-4 w-4 shrink-0 accent-[#0A4D34]"
                  />
                  {form.noExpiration}
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel label={form.subject} required={form.required} />
              <div className="relative mt-2">
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2.5 pr-16 text-[15px] text-slate-800 outline-none focus:border-[#3AA87A]"
                  maxLength={70}
                  required
                  aria-label={form.subject}
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
              rows={rows}
              setRows={setRows}
              deleteLabel={lang === "ko" ? "삭제" : lang === "en" ? "Delete" : "削除"}
              headers={form.itemHeaders}
              unitPlaceholder={form.unitPlaceholder}
              addRowLabel={form.addRow}
            />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 pb-8">
            <Link href={`/${lang}/orders/form`} className="text-sm text-slate-600 hover:underline">{lang === "ko" ? "취소" : lang === "en" ? "Cancel" : "キャンセル"}</Link>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-[#0A4D34] px-8 py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#083D29] disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-[280px]"
            >
              {pending ? "…" : draftLabel}
            </button>
          </div>
        </form>
      </OrderMainInner>
    </SalesFlowShell>
  );
}

function FieldLabel({ label, required }: { label: string; required?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[15px] font-semibold text-slate-800">{label}</span>
      {required ? <RequiredBadge label={required} /> : null}
    </div>
  );
}
