import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SharedEstimatePage({
  params,
}: {
  params: Promise<{ lang: string; token: string }>;
}) {
  const { token } = await params;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_shared_document", { _token: token });

  if (error || !data) notFound();

  const doc = data as {
    document?: Record<string, unknown>;
    lines?: Array<Record<string, unknown>>;
  };
  const estimate = doc.document ?? {};
  const lines = doc.lines ?? [];

  const documentNumber = String(estimate.document_number ?? "");
  const subject = String(estimate.subject ?? "");
  const issueDate = String(estimate.issue_date ?? "");
  const subtotal = Number(estimate.subtotal ?? 0);
  const tax = Number(estimate.tax_amount ?? 0);
  const total = Number(estimate.total ?? 0);

  return (
    <div className="mx-auto max-w-[800px] px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">見積書（共有）</h1>
      <p className="mt-2 text-slate-600">No. {documentNumber}</p>
      {subject ? <p className="mt-1 text-slate-700">{subject}</p> : null}
      <p className="mt-1 text-sm text-slate-500">発行日: {issueDate}</p>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-3 py-2">品名</th>
            <th className="px-3 py-2">数量</th>
            <th className="px-3 py-2">単価</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-3 py-2">{String(line.name_snapshot ?? "")}</td>
              <td className="px-3 py-2">{String(line.qty ?? "")}</td>
              <td className="px-3 py-2 tabular-nums">
                {Number(line.unit_price_snapshot ?? 0).toLocaleString("ja-JP")} 円
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end gap-6 text-sm">
        <span>小計: {subtotal.toLocaleString("ja-JP")} 円</span>
        <span>消費税: {tax.toLocaleString("ja-JP")} 円</span>
        <span className="font-semibold">合計: {total.toLocaleString("ja-JP")} 円</span>
      </div>
    </div>
  );
}
