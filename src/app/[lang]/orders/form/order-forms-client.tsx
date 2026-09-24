"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { deleteOrderFormDraft } from "@/lib/actions/order-forms";
import { getOrdersContent } from "../content";
import { OrderMainInner } from "../order-main-inner";
import { OrderSubNav } from "../order-sub-nav";

type OrderFormRow = {
  id: string; name: string | null; subject: string | null; expiration_date: string | null; is_published: boolean; created_at: string;
  order_form_line_items: Array<{ name_snapshot: string; unit_snapshot: string | null; unit_price_snapshot: number; line_no: number }>;
};

export function OrderFormsClient({ rows, page, totalPages }: { rows: OrderFormRow[]; page: number; totalPages: number }) {
  const { lang } = useLanguage();
  const ui = getOrdersContent(lang);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const text = lang === "ko"
    ? { title: "수주 폼", draft: "초안", published: "공개", copy: "복사하여 새로 작성", delete: "삭제", empty: "저장된 수주 폼이 없습니다.", note: "폼을 초안으로 저장하고 확인할 수 있습니다. 온라인 공개와 주문 접수는 아직 지원하지 않습니다.", confirm: "이 초안을 삭제하시겠습니까?", failed: "삭제하지 못했습니다. 다시 시도해 주세요.", detail: "품목 보기", previous: "이전", next: "다음" }
    : lang === "en"
      ? { title: "Order forms", draft: "Draft", published: "Published", copy: "Copy to a new draft", delete: "Delete", empty: "No saved order forms.", note: "Save and review form drafts. Online publishing and order collection are not available yet.", confirm: "Delete this draft?", failed: "Could not delete. Please try again.", detail: "View items", previous: "Previous", next: "Next" }
      : { title: "受注フォーム", draft: "下書き", published: "公開中", copy: "複製して新規作成", delete: "削除", empty: "保存された受注フォームはありません。", note: "フォームを下書きとして保存・確認できます。オンライン公開と注文受付はまだ利用できません。", confirm: "この下書きを削除しますか？", failed: "削除できませんでした。もう一度お試しください。", detail: "明細を表示", previous: "前へ", next: "次へ" };

  function remove(row: OrderFormRow) {
    if (pending || !window.confirm(`${row.subject ?? ""}\n${text.confirm}`)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteOrderFormDraft(row.id);
        if (result.ok) router.refresh();
        else setError(result.error);
      } catch { setError(text.failed); }
    });
  }

  return <SalesFlowShell activeItem="orders">
    <OrderSubNav active="form" />
    <OrderMainInner>
      <div className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-slate-900">{text.title}</h1>
          <Link href={`/${lang}/orders/form/new`} className="rounded bg-[#0A4D34] px-5 py-3 font-semibold text-white">{ui.form.new.title}</Link>
        </div>
        <p className="mt-4 text-sm text-slate-600">{text.note}</p>
        {error ? <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p> : null}
        {!rows.length ? <p className="py-20 text-center text-slate-500">{text.empty}</p> : <div className="mt-6 space-y-4">
          {rows.map((row) => <article key={row.id} className="rounded border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <h2 className="text-lg font-semibold">{row.subject || "—"}</h2>
                <p className="mt-1 text-sm text-slate-600">{ui.form.new.client}: {row.name || "—"}</p>
                <p className="mt-1 text-sm text-slate-600">{ui.form.new.expiration}: {row.expiration_date || ui.form.new.noExpiration}</p>
              </div>
              <span className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-600">{row.is_published ? text.published : text.draft}</span>
            </div>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-[#0A4D34]">{text.detail} ({row.order_form_line_items.length})</summary>
              <ul className="mt-3 divide-y divide-slate-100">
                {[...row.order_form_line_items].sort((a, b) => a.line_no - b.line_no).map((line) => <li key={line.line_no} className="flex flex-wrap justify-between gap-2 py-2"><span className="min-w-0 max-w-full [overflow-wrap:anywhere]">{line.name_snapshot}</span><span className="min-w-0 max-w-full [overflow-wrap:anywhere]">¥{line.unit_price_snapshot.toLocaleString("ja-JP")}{line.unit_snapshot ? ` / ${line.unit_snapshot}` : ""}</span></li>)}
              </ul>
            </details>
            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <Link href={`/${lang}/orders/form/new?copyFrom=${row.id}`} className="font-medium text-[#0A4D34] hover:underline">{text.copy}</Link>
              {!row.is_published ? <button type="button" onClick={() => remove(row)} disabled={pending} className="text-red-600 hover:underline disabled:opacity-50">{text.delete}</button> : null}
            </div>
          </article>)}
        </div>}
        {totalPages > 1 ? <nav className="mt-6 flex flex-wrap justify-center gap-4 text-sm" aria-label={text.title}>
          {page > 1 ? <Link href={`/${lang}/orders/form?page=${page - 1}`}>{text.previous}</Link> : null}
          <span>{page} / {totalPages}</span>
          {page < totalPages ? <Link href={`/${lang}/orders/form?page=${page + 1}`}>{text.next}</Link> : null}
        </nav> : null}
      </div>
    </OrderMainInner>
  </SalesFlowShell>;
}
