import { computeLineAmount } from "@/lib/tax";
import { documentSummaryRows, documentTaxCategoryLabel } from "@/lib/documents/summary-rows";
import type { SalesDocumentDetail, SalesDocumentDetailUi } from "@/lib/documents/detail-types";
import {
  clientHonorificSuffix,
  formatClientNameWithHonorific,
} from "@/lib/documents/client-honorific";
import { isBlankDocumentLine } from "@/lib/documents/export-spreadsheet";
import { formatDisplayDate } from "@/app/[lang]/estimates/date-field-utils";

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
  const recipient = detail.recipient ?? {
    postalCode: "", addressLine1: "", addressLine2: "", department: "", section: "", contact: "", phone: "",
  };
  const issueDateLabel = formatDisplayDate(detail.issueDate, detail.outputLocale);
  const secondaryDateLabel = detail.secondaryDate
    ? formatDisplayDate(detail.secondaryDate, detail.outputLocale)
    : "";

  return (
    <div
      className={
        panel
          ? "sales-document-print @container min-w-0 bg-[#dfe7f2] p-3"
          : "sales-document-print @container min-w-0 rounded bg-[#dfe7f2] p-2 sm:p-10"
      }
    >
      <div
        className={[
          "mx-auto w-full min-w-0 max-w-[980px] bg-white shadow-sm [overflow-wrap:anywhere]",
          panel ? "px-10 py-12" : "px-4 py-8 sm:px-14 sm:py-16",
        ].join(" ")}
      >
        <div className="flex justify-end">
          <div className="min-w-0 max-w-full space-y-1 text-right text-[14px] font-semibold text-slate-900 sm:text-[16px]">
            <p className="tabular-nums whitespace-nowrap">{issueDateLabel}</p>
            <p className="break-words leading-snug">
              {ui.documentNumberLabel}: {detail.documentNumber}
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-[28px] font-bold tracking-[0.04em] text-slate-900 @lg:text-[54px] @lg:tracking-[0.08em]">
            {ui.listTitle}
          </h2>
        </div>

        <div className="mt-8 grid min-w-0 gap-8 @[36rem]:mt-12 @[36rem]:grid-cols-2">
          <div>
            <p className="text-[18px] font-semibold underline underline-offset-4">
              {formatClientNameWithHonorific(
                detail.clientName,
                clientHonorificSuffix(detail.clientHonorific, detail.outputLocale),
                detail.clientHonorific !== "none",
              )}
            </p>
            {[recipient.department, recipient.section, recipient.contact]
              .filter(Boolean)
              .map((line) => <p key={line} className="mt-1 text-[14px] text-slate-600">{line}</p>)}
            {recipient.postalCode ? (
              <p className="mt-3 text-[14px] text-slate-600">〒{recipient.postalCode}</p>
            ) : null}
            {[recipient.addressLine1, recipient.addressLine2]
              .filter(Boolean)
              .map((line) => <p key={line} className="text-[14px] text-slate-600">{line}</p>)}
            {recipient.phone ? (
              <p className="text-[14px] text-slate-600">TEL: {recipient.phone}</p>
            ) : null}
            {detail.subject ? (
              <p
                className={
                  ui.emphasizeSubject
                    ? "mt-2 text-[18px] font-medium text-slate-700"
                    : "mt-2 text-[14px] text-slate-600"
                }
              >
                {ui.emphasizeSubject ? `${ui.subject}：${detail.subject}` : detail.subject}
              </p>
            ) : null}
            {ui.secondaryDateLabel && secondaryDateLabel ? (
              <p className="mt-1 text-[14px] text-slate-600">
                {ui.secondaryDateLabel}: {secondaryDateLabel}
              </p>
            ) : null}
            <p className="mt-5 text-[16px] text-slate-800">
              {detail.templateMessage || ui.previewLead}
            </p>

            <div className="mt-10 max-w-[320px] border-b border-slate-800 pb-2">
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <span className="text-[18px] font-semibold">{ui.documentAmountLabel}</span>
                <span className="max-w-full text-[24px] font-semibold tabular-nums @lg:text-[34px]">
                  {yen(detail.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="self-start text-[16px] leading-8 text-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[20px] font-semibold">{detail.sender.companyName}</p>
                {detail.sender.postalCode ? <p className="mt-3">〒{detail.sender.postalCode}</p> : null}
                {[detail.sender.addressLine1, detail.sender.addressLine2, detail.sender.addressLine3]
                  .filter(Boolean)
                  .map((line) => <p key={line}>{line}</p>)}
                {detail.sender.tel ? <p className="mt-6">TEL: {detail.sender.tel}</p> : null}
                {detail.sender.fax ? <p>FAX: {detail.sender.fax}</p> : null}
                {detail.sender.email ? <p>{detail.sender.email}</p> : null}
                {detail.sender.registrationNumber ? (
                  <p>{ui.registrationNumberLabel ?? "Registration No."}: {detail.sender.registrationNumber}</p>
                ) : null}
              </div>
              {detail.showSeal && detail.sender.sealUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.sender.sealUrl}
                  alt=""
                  className="mt-1 h-16 w-16 shrink-0 object-contain @lg:h-[84px] @lg:w-[84px]"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-10 max-w-full overflow-x-auto border border-slate-800">
          <table className="w-full min-w-[560px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-[#ededed]">
                {[ui.itemHeaders[0], ui.itemHeaders[1], ui.itemHeaders[3], ui.itemHeaders[4], ui.itemHeaders[5]].map(
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
                  <td colSpan={5} className="border-t border-slate-800 px-4 text-center text-slate-400">
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
                      <td className="border-t border-r border-slate-800 px-4 text-center text-sm whitespace-nowrap">
                        {blank ? "" : documentTaxCategoryLabel(detail.taxDisplay === "exempt" ? "exempt" : line.taxCategory, detail.outputLocale)}
                      </td>
                      <td className="border-t border-slate-800 px-4 text-right tabular-nums">
                        {blank ? "" : computeLineAmount(line).toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  );
                })
              )}
              {documentSummaryRows(detail, ui).map(([label, value], index, rows) => (
                <SummaryRow key={label} label={label} value={value} strong={index === rows.length - 1} />
              ))}
            </tbody>
          </table>
        </div>

        {detail.lines.some((line) => line.taxCategory === "reduced_8") ? (
          <p className="mt-2 text-xs text-slate-600">{detail.outputLocale === "ko" ? "※ 경감세율 대상" : detail.outputLocale === "en" ? "※ Subject to the reduced tax rate" : "※ 軽減税率対象"}</p>
        ) : null}

        {(detail.bankAccounts?.length ?? 0) > 0 && ui.bankAccountLabel ? (
          <div className="mt-8 border-t border-slate-300 pt-5 text-[14px] text-slate-700">
            <p className="font-semibold text-slate-900">{ui.bankAccountLabel}</p>
            {detail.bankAccounts?.map((account) => (
              <p key={account} className="mt-1 whitespace-pre-wrap">{account}</p>
            ))}
          </div>
        ) : null}

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
      <td className="border-t border-r border-slate-800" colSpan={3} />
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
