import type { ReactNode } from "react";
import type { getDeliveryNoteContent } from "../delivery-notes/content";
import type { getEstimateContent } from "../estimates/content";
import type { getInvoiceContent } from "../invoices/content";
import type { getReceiptContent } from "../receipts/content";

type EstimateUi = ReturnType<typeof getEstimateContent>;
type DeliveryNoteUi = ReturnType<typeof getDeliveryNoteContent>;
type InvoiceUi = ReturnType<typeof getInvoiceContent>;
type ReceiptUi = ReturnType<typeof getReceiptContent>;

type SampleItem = {
  name: string;
  qty: string;
  price: string;
  amount: string;
};

type StandardSampleUi = {
  sampleDate: string;
  sampleDocNo: string;
  sampleClient: string;
  sampleSubject: string;
  sampleMessage: string;
  sampleAmountLabel: string;
  sampleAmount: string;
  sampleCompany: string;
  sampleAddress: string;
  samplePhone: string;
  sampleItems: readonly SampleItem[];
  sampleSubtotal: string;
  sampleTax: string;
  sampleTotal: string;
  sampleThanks: string;
};

function DocumentPreviewThumbnail({
  children,
  scaleClass = "scale-[0.45]",
  widthClass = "w-[222%]",
}: {
  children: ReactNode;
  scaleClass?: string;
  widthClass?: string;
}) {
  return (
    <div className={`origin-top-left pointer-events-none ${scaleClass} ${widthClass}`}>{children}</div>
  );
}

function StandardDocumentPreview({
  title,
  ui,
  footerLabel,
  secondaryDateLine,
}: {
  title: string;
  ui: StandardSampleUi;
  footerLabel: string;
  secondaryDateLine?: string;
}) {
  return (
    <div className="min-h-[600px] border border-slate-200 bg-white p-8 font-sans text-[13px] text-slate-800">
      <div className="mb-4 text-right text-[12px] text-slate-500">
        <p>{ui.sampleDate}</p>
        <p>{ui.sampleDocNo}</p>
      </div>

      <h1 className="mb-6 text-center text-[28px] font-bold tracking-widest text-slate-900">{title}</h1>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[15px] font-semibold">{ui.sampleClient}</p>
          <p className="mt-1 text-[12px] text-slate-600">{ui.sampleSubject}</p>
          {secondaryDateLine ? <p className="text-[12px] text-slate-600">{secondaryDateLine}</p> : null}
          <p className="mt-3 text-[12px] text-slate-700">{ui.sampleMessage}</p>
          <div className="mt-3 inline-block border border-slate-800 px-4 py-2">
            <p className="text-[13px] font-bold">{ui.sampleAmountLabel}</p>
            <p className="text-[20px] font-bold">{ui.sampleAmount}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-right text-[11px] text-slate-700">
          <div>
            <p className="text-[13px] font-bold">{ui.sampleCompany}</p>
            <p className="mt-1 whitespace-pre-line text-slate-500">{ui.sampleAddress}</p>
            <p className="mt-1 whitespace-pre-line text-slate-500">{ui.samplePhone}</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-red-500 text-center text-[9px] font-bold leading-tight text-red-500">
            認印
          </div>
        </div>
      </div>

      <DocumentItemsTable ui={ui} />
      <p className="text-[12px] text-slate-600">{ui.sampleThanks}</p>
      <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
        {footerLabel}
      </div>
    </div>
  );
}

function DocumentItemsTable({ ui }: { ui: StandardSampleUi }) {
  return (
    <table className="mb-4 w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 px-3 py-2 text-left font-semibold">品番・品名</th>
          <th className="w-16 border border-slate-300 px-3 py-2 text-center font-semibold">数量</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">単価</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">金額</th>
        </tr>
      </thead>
      <tbody>
        {ui.sampleItems.map((item) => (
          <tr key={item.name}>
            <td className="border border-slate-200 px-3 py-2">{item.name}</td>
            <td className="border border-slate-200 px-3 py-2 text-center">{item.qty}</td>
            <td className="border border-slate-200 px-3 py-2 text-right">{item.price}</td>
            <td className="border border-slate-200 px-3 py-2 text-right">{item.amount}</td>
          </tr>
        ))}
        {Array.from({ length: 7 }).map((_, index) => (
          <tr key={`empty-${index}`}>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            小計
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleSubtotal}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            消費税（10%）
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleTax}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            合計
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right font-bold">{ui.sampleTotal}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export function EstimatePreview({ ui }: { ui: EstimateUi }) {
  return (
    <StandardDocumentPreview
      title="見積書"
      ui={ui}
      secondaryDateLine={ui.sampleExpiryDate}
      footerLabel="℗ SalesFlow · 見積書作成サービス"
    />
  );
}

export function EstimateThumbnail({ ui }: { ui: EstimateUi }) {
  return (
    <DocumentPreviewThumbnail>
      <EstimatePreview ui={ui} />
    </DocumentPreviewThumbnail>
  );
}

export function DeliveryNotePreview({ ui }: { ui: DeliveryNoteUi }) {
  return (
    <StandardDocumentPreview
      title="納品書"
      ui={ui}
      secondaryDateLine={ui.sampleDeliveryDate}
      footerLabel="℗ SalesFlow · 納品書作成サービス"
    />
  );
}

export function DeliveryNoteThumbnail({ ui }: { ui: DeliveryNoteUi }) {
  return (
    <DocumentPreviewThumbnail>
      <DeliveryNotePreview ui={ui} />
    </DocumentPreviewThumbnail>
  );
}

export function InvoicePreview({ ui }: { ui: InvoiceUi }) {
  return (
    <StandardDocumentPreview
      title="請求書"
      ui={ui}
      secondaryDateLine={ui.samplePaymentDue}
      footerLabel="℗ SalesFlow · 請求書作成サービス"
    />
  );
}

export function InvoiceThumbnail({ ui }: { ui: InvoiceUi }) {
  return (
    <DocumentPreviewThumbnail scaleClass="scale-[0.45]" widthClass="w-[222%]">
      <InvoicePreview ui={ui} />
    </DocumentPreviewThumbnail>
  );
}

export function InvoiceTemplateMiniPreview({ ui }: { ui: InvoiceUi }) {
  return (
    <DocumentPreviewThumbnail scaleClass="scale-[0.28]" widthClass="w-[357%]">
      <InvoicePreview ui={ui} />
    </DocumentPreviewThumbnail>
  );
}

function ReceiptItemsTable({ ui }: { ui: ReceiptUi }) {
  return (
    <table className="mb-4 w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 px-3 py-2 text-left font-semibold">品番・品名</th>
          <th className="w-16 border border-slate-300 px-3 py-2 text-center font-semibold">数量</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">単価</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">金額</th>
        </tr>
      </thead>
      <tbody>
        {ui.sampleItems.map((item) => (
          <tr key={item.name}>
            <td className="border border-slate-200 px-3 py-2">{item.name}</td>
            <td className="border border-slate-200 px-3 py-2 text-center">{item.qty}</td>
            <td className="border border-slate-200 px-3 py-2 text-right">{item.price}</td>
            <td className="border border-slate-200 px-3 py-2 text-right">{item.amount}</td>
          </tr>
        ))}
        {Array.from({ length: 7 }).map((_, index) => (
          <tr key={`receipt-empty-${index}`}>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
            <td className="border border-slate-200 px-3 py-2">&nbsp;</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            小計
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleSubtotal}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            消費税（10%）
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleTax}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            合計
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right font-bold">{ui.sampleTotal}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export function ReceiptPreview({
  ui,
  type = "standard",
}: {
  ui: ReceiptUi;
  type?: "standard" | "envelope";
}) {
  return (
    <div className="min-h-[600px] border border-slate-200 bg-white p-8 font-sans text-[13px] text-slate-800">
      {type === "envelope" ? (
        <div className="mb-6 border border-slate-300 p-4 text-[12px] text-slate-600">
          <p>〒462-0000</p>
          <p>愛知県名古屋市 4号</p>
          <p className="mt-2 text-[14px] font-semibold">サンプル株式会社 様</p>
        </div>
      ) : null}

      <div className="mb-6 flex items-start justify-between">
        <div className="ml-auto text-right text-[12px] text-slate-500">
          <p>{ui.sampleDate}</p>
          <p>{ui.sampleReceiptNo}</p>
        </div>
      </div>

      <h1 className="mb-6 text-center text-[28px] font-bold tracking-widest text-slate-900">領収書</h1>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[15px] font-semibold">{ui.sampleClient}</p>
          <p className="mt-2 text-[12px] text-slate-600">{ui.sampleSubject}</p>
          <p className="text-[12px] text-slate-600">{ui.sampleTransDate}</p>
          <p className="mt-3 text-[12px] text-slate-700">{ui.sampleMessage}</p>
          <div className="mt-3 inline-block border border-slate-800 px-4 py-2">
            <p className="text-[13px] font-bold">領収金額</p>
            <p className="text-[20px] font-bold">{ui.sampleAmount}</p>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-700">
          <div className="flex items-start justify-end gap-3">
            <div>
              <p className="text-[13px] font-bold">{ui.sampleCompany}</p>
              <p className="mt-1 whitespace-pre-line text-slate-500">{ui.sampleAddress}</p>
              <p className="mt-1 whitespace-pre-line text-slate-500">{ui.samplePhone}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-red-500 text-center text-[9px] font-bold leading-tight text-red-500">
              認印
            </div>
          </div>
        </div>
      </div>

      <ReceiptItemsTable ui={ui} />
      <p className="text-[12px] text-slate-600">{ui.sampleThanks}</p>
      <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
        ℗ SalesFlow · 領収書作成サービス
      </div>
    </div>
  );
}

export function ReceiptThumbnail({
  ui,
  type = "standard",
}: {
  ui: ReceiptUi;
  type?: "standard" | "envelope";
}) {
  return (
    <DocumentPreviewThumbnail scaleClass="scale-[0.45]" widthClass="w-[220%]">
      <ReceiptPreview ui={ui} type={type} />
    </DocumentPreviewThumbnail>
  );
}
