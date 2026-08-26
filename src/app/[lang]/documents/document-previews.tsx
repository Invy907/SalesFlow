import type { ReactNode } from "react";
import {
  normalizeDocumentOutputLocale,
  type DocumentOutputLocale,
} from "@/lib/documents/output-locale";
import {
  formatPreviewFooter,
  getDocumentPreviewCopy,
  type DocumentPreviewCopy,
} from "@/lib/documents/preview-copy";
import { getDeliveryNoteContent } from "../delivery-notes/content";
import { getEstimateContent } from "../estimates/content";
import { getInvoiceContent } from "../invoices/content";
import { getReceiptContent } from "../receipts/content";

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
  secondaryDateLine,
  outputLocale,
}: {
  title: string;
  ui: StandardSampleUi;
  secondaryDateLine?: string;
  outputLocale: DocumentOutputLocale;
}) {
  const copy = getDocumentPreviewCopy(outputLocale);

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
            {copy.seal}
          </div>
        </div>
      </div>

      <DocumentItemsTable ui={ui} copy={copy} />
      <p className="text-[12px] text-slate-600">{ui.sampleThanks}</p>
      <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
        {formatPreviewFooter(copy, title)}
      </div>
    </div>
  );
}

function DocumentItemsTable({ ui, copy }: { ui: StandardSampleUi; copy: DocumentPreviewCopy }) {
  return (
    <table className="mb-4 w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 px-3 py-2 text-left font-semibold">{copy.itemName}</th>
          <th className="w-16 border border-slate-300 px-3 py-2 text-center font-semibold">{copy.quantity}</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">{copy.unitPrice}</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">{copy.amount}</th>
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
            {copy.subtotal}
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleSubtotal}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            {copy.tax}
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleTax}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            {copy.total}
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right font-bold">{ui.sampleTotal}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export function EstimatePreview({
  ui,
  outputLocale,
}: {
  ui: EstimateUi;
  outputLocale?: DocumentOutputLocale;
}) {
  const locale = normalizeDocumentOutputLocale(outputLocale);
  const localizedUi = outputLocale ? getEstimateContent(locale) : ui;
  return (
    <StandardDocumentPreview
      title={localizedUi.listTitle}
      ui={localizedUi}
      secondaryDateLine={localizedUi.sampleExpiryDate}
      outputLocale={locale}
    />
  );
}

export function EstimateThumbnail({
  ui,
  outputLocale,
}: {
  ui: EstimateUi;
  outputLocale?: DocumentOutputLocale;
}) {
  return (
    <DocumentPreviewThumbnail>
      <EstimatePreview ui={ui} outputLocale={outputLocale} />
    </DocumentPreviewThumbnail>
  );
}

export function DeliveryNotePreview({
  ui,
  outputLocale,
}: {
  ui: DeliveryNoteUi;
  outputLocale?: DocumentOutputLocale;
}) {
  const locale = normalizeDocumentOutputLocale(outputLocale);
  const localizedUi = outputLocale ? getDeliveryNoteContent(locale) : ui;
  return (
    <StandardDocumentPreview
      title={localizedUi.listTitle}
      ui={localizedUi}
      secondaryDateLine={localizedUi.sampleDeliveryDate}
      outputLocale={locale}
    />
  );
}

export function DeliveryNoteThumbnail({
  ui,
  outputLocale,
}: {
  ui: DeliveryNoteUi;
  outputLocale?: DocumentOutputLocale;
}) {
  return (
    <DocumentPreviewThumbnail>
      <DeliveryNotePreview ui={ui} outputLocale={outputLocale} />
    </DocumentPreviewThumbnail>
  );
}

export function InvoicePreview({
  ui,
  outputLocale,
}: {
  ui: InvoiceUi;
  outputLocale?: DocumentOutputLocale;
}) {
  const locale = normalizeDocumentOutputLocale(outputLocale);
  const localizedUi = outputLocale ? getInvoiceContent(locale) : ui;
  return (
    <StandardDocumentPreview
      title={localizedUi.listTitle}
      ui={localizedUi}
      secondaryDateLine={localizedUi.samplePaymentDue}
      outputLocale={locale}
    />
  );
}

export function InvoiceThumbnail({
  ui,
  outputLocale,
}: {
  ui: InvoiceUi;
  outputLocale?: DocumentOutputLocale;
}) {
  return (
    <DocumentPreviewThumbnail scaleClass="scale-[0.45]" widthClass="w-[222%]">
      <InvoicePreview ui={ui} outputLocale={outputLocale} />
    </DocumentPreviewThumbnail>
  );
}

export function InvoiceTemplateMiniPreview({
  ui,
  outputLocale,
}: {
  ui: InvoiceUi;
  outputLocale?: DocumentOutputLocale;
}) {
  return (
    <DocumentPreviewThumbnail scaleClass="scale-[0.28]" widthClass="w-[357%]">
      <InvoicePreview ui={ui} outputLocale={outputLocale} />
    </DocumentPreviewThumbnail>
  );
}

function ReceiptItemsTable({ ui, copy }: { ui: ReceiptUi; copy: DocumentPreviewCopy }) {
  return (
    <table className="mb-4 w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 px-3 py-2 text-left font-semibold">{copy.itemName}</th>
          <th className="w-16 border border-slate-300 px-3 py-2 text-center font-semibold">{copy.quantity}</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">{copy.unitPrice}</th>
          <th className="w-20 border border-slate-300 px-3 py-2 text-right font-semibold">{copy.amount}</th>
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
            {copy.subtotal}
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleSubtotal}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            {copy.tax}
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right">{ui.sampleTax}</td>
        </tr>
        <tr>
          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
            {copy.total}
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
  outputLocale,
}: {
  ui: ReceiptUi;
  type?: "standard" | "envelope";
  outputLocale?: DocumentOutputLocale;
}) {
  const locale = normalizeDocumentOutputLocale(outputLocale);
  const localizedUi = outputLocale ? getReceiptContent(locale) : ui;
  const copy = getDocumentPreviewCopy(locale);

  return (
    <div className="min-h-[600px] border border-slate-200 bg-white p-8 font-sans text-[13px] text-slate-800">
      {type === "envelope" ? (
        <div className="mb-6 border border-slate-300 p-4 text-[12px] text-slate-600">
          <p>{copy.envelopePostalCode}</p>
          <p>{copy.envelopeAddress}</p>
          <p className="mt-2 text-[14px] font-semibold">{copy.envelopeRecipient}</p>
        </div>
      ) : null}

      <div className="mb-6 flex items-start justify-between">
        <div className="ml-auto text-right text-[12px] text-slate-500">
          <p>{localizedUi.sampleDate}</p>
          <p>{localizedUi.sampleReceiptNo}</p>
        </div>
      </div>

      <h1 className="mb-6 text-center text-[28px] font-bold tracking-widest text-slate-900">
        {copy.receiptTitle}
      </h1>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[15px] font-semibold">{localizedUi.sampleClient}</p>
          <p className="mt-2 text-[12px] text-slate-600">{localizedUi.sampleSubject}</p>
          <p className="text-[12px] text-slate-600">{localizedUi.sampleTransDate}</p>
          <p className="mt-3 text-[12px] text-slate-700">{localizedUi.sampleMessage}</p>
          <div className="mt-3 inline-block border border-slate-800 px-4 py-2">
            <p className="text-[13px] font-bold">{copy.receiptAmountLabel}</p>
            <p className="text-[20px] font-bold">{localizedUi.sampleAmount}</p>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-700">
          <div className="flex items-start justify-end gap-3">
            <div>
              <p className="text-[13px] font-bold">{localizedUi.sampleCompany}</p>
              <p className="mt-1 whitespace-pre-line text-slate-500">{localizedUi.sampleAddress}</p>
              <p className="mt-1 whitespace-pre-line text-slate-500">{localizedUi.samplePhone}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-red-500 text-center text-[9px] font-bold leading-tight text-red-500">
              {copy.seal}
            </div>
          </div>
        </div>
      </div>

      <ReceiptItemsTable ui={localizedUi} copy={copy} />
      <p className="text-[12px] text-slate-600">{localizedUi.sampleThanks}</p>
      <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
        {formatPreviewFooter(copy, copy.receiptTitle)}
      </div>
    </div>
  );
}

export function ReceiptThumbnail({
  ui,
  type = "standard",
  outputLocale,
}: {
  ui: ReceiptUi;
  type?: "standard" | "envelope";
  outputLocale?: DocumentOutputLocale;
}) {
  return (
    <DocumentPreviewThumbnail scaleClass="scale-[0.45]" widthClass="w-[220%]">
      <ReceiptPreview ui={ui} type={type} outputLocale={outputLocale} />
    </DocumentPreviewThumbnail>
  );
}
