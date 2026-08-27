import type { SalesDocumentDetail, SalesDocumentDetailUi } from "@/lib/documents/detail-types";
import {
  clientHonorificSuffix,
  formatClientNameWithHonorific,
} from "@/lib/documents/client-honorific";
import { isBlankDocumentLine } from "@/lib/documents/export-spreadsheet";

const yen = (value: number) => `¥ ${value.toLocaleString("ja-JP")}`;

export function SalesDocumentPreview({
  detail,
  ui,
  variant = "page",
}: {
  detail: SalesDocumentDetail;
  ui: SalesDocumentDetailUi;
  /** panel: 작성 화면의 좁은 프리뷰 열용. 여백을 줄여 문서를 최대한 크게 보여준다. */
  variant?: "page" | "panel";
}) {
  const panel = variant === "panel";
  return (
    <div
      className={
        panel
          ? "sales-document-print bg-[#dfe7f2] p-3"
          : "sales-document-print rounded bg-[#dfe7f2] p-4 sm:p-10"
      }
    >
      <div
        className={[
          "mx-auto w-full max-w-[980px] bg-white shadow-sm",
          panel ? "px-10 py-12" : "px-6 py-10 sm:px-14 sm:py-16",
        ].join(" ")}
      >
        <div className="flex justify-end">
          <div className="space-y-2 text-right text-[16px] font-semibold text-slate-900">
            <p>{detail.issueDate}</p>
            <p>
              {ui.documentNumberLabel}: {detail.documentNumber}
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-[40px] font-bold tracking-[0.08em] text-slate-900 sm:text-[54px]">
            {ui.listTitle}
          </h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-[18px] font-semibold underline underline-offset-4">
              {formatClientNameWithHonorific(
                detail.clientName,
                clientHonorificSuffix(detail.clientHonorific, detail.outputLocale),
                detail.clientHonorific !== "none",
              )}
            </p>
            <p className="mt-5 text-[16px] text-slate-800">
              {detail.templateMessage || ui.previewLead}
            </p>

            <div className="mt-10 max-w-[320px] border-b border-slate-800 pb-2">
              <div className="flex items-end justify-between">
                <span className="text-[18px] font-semibold">{ui.documentAmountLabel}</span>
                <span className="text-[28px] font-semibold tabular-nums sm:text-[34px]">
                  {yen(detail.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="self-start text-[16px] leading-8 text-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[20px] font-semibold">{detail.sender.companyName}</p>
                {detail.sender.tel ? <p className="mt-6">TEL: {detail.sender.tel}</p> : null}
                {detail.sender.email ? <p>{detail.sender.email}</p> : null}
              </div>
              {detail.showSeal && detail.sender.sealUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.sender.sealUrl}
                  alt=""
                  className="mt-1 h-[84px] w-[84px] shrink-0 object-contain"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-10 overflow-x-auto border border-slate-800">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="bg-[#ededed]">
                {[ui.itemHeaders[0], ui.itemHeaders[1], ui.itemHeaders[3], ui.itemHeaders[5]].map(
                  (header) => (
                    <th
                      key={header}
                      className="border-r border-slate-800 px-4 py-3 text-center font-semibold last:border-r-0"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {detail.lines.length === 0 ? (
                <tr className="h-[52px]">
                  <td colSpan={4} className="border-t border-slate-800 px-4 text-center text-slate-400">
                    {ui.noLineItems}
                  </td>
                </tr>
              ) : (
                detail.lines.map((line, index) => {
                  const blank = isBlankDocumentLine(line);
                  return (
                    <tr key={`${line.name}-${index}`} className="h-[52px]">
                      <td className="border-t border-r border-slate-800 px-4">{line.name}</td>
                      <td className="border-t border-r border-slate-800 px-4 text-right tabular-nums">
                        {blank ? "" : `${line.qty.toLocaleString("ja-JP")} ${line.unit}`.trim()}
                      </td>
                      <td className="border-t border-r border-slate-800 px-4 text-right tabular-nums">
                        {blank ? "" : line.unitPrice.toLocaleString("ja-JP")}
                      </td>
                      <td className="border-t border-slate-800 px-4 text-right tabular-nums">
                        {blank ? "" : Math.floor(line.qty * line.unitPrice).toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  );
                })
              )}
              <SummaryRow label={ui.subtotal} value={detail.subtotal} />
              <SummaryRow label={ui.tax} value={detail.tax} />
              <SummaryRow label={ui.total} value={detail.total} strong />
            </tbody>
          </table>
        </div>

        {detail.remarks ? (
          <div className="mt-8 whitespace-pre-wrap text-[15px] text-slate-700">{detail.remarks}</div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <tr className="h-[52px]">
      <td className="border-t border-r border-slate-800" colSpan={2} />
      <td className="border-t border-r border-slate-800 px-4 text-right font-semibold">{label}</td>
      <td
        className={[
          "border-t border-slate-800 px-4 text-right tabular-nums",
          strong ? "text-[18px] font-bold" : "font-semibold",
        ].join(" ")}
      >
        {value.toLocaleString("ja-JP")}
      </td>
    </tr>
  );
}
