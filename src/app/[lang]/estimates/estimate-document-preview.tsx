import { SalesDocumentPreview } from "@/components/sales-document-preview";
import { buildEstimateDetailUi } from "@/lib/documents/build-detail-ui";
import type { SalesDocumentDetail } from "@/lib/documents/detail-types";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";
import type { TaxDisplay, TaxCategory, DocumentTotals } from "@/lib/tax";
import type { ClientHonorific } from "@/lib/documents/client-honorific";
import type { getEstimateContent } from "./content";

export type EstimatePreviewData = {
  documentNumber: string;
  clientName: string;
  clientHonorific: ClientHonorific;
  outputLocale: string;
  subject: string;
  issueDate: string;
  expiryDate: string;
  templateMessage: string;
  remarks: string;
  subtotal: number;
  tax: number;
  taxDisplay?: TaxDisplay;
  withholding?: number;
  taxBreakdown?: DocumentTotals["breakdown"];
  total: number;
  lines: Array<{ lineNo: number; name: string; qty: number; unit: string; unitPrice: number; taxCategory?: TaxCategory }>;
  recipient?: SalesDocumentDetail["recipient"];
  showSeal?: boolean;
  sender: SalesDocumentDetail["sender"];
};

/** Saved, shared, and composing estimates use the same printable layout. */
export function EstimateDocumentPreview({
  detail,
  ui,
}: {
  detail: EstimatePreviewData;
  ui: ReturnType<typeof getEstimateContent>;
}) {
  return <SalesDocumentPreview
    detail={{
      ...detail,
      id: detail.documentNumber,
      status: "issued",
      secondaryDate: detail.expiryDate,
      outputLocale: normalizeDocumentOutputLocale(detail.outputLocale),
      showClientHonorific: detail.clientHonorific !== "none",
      showSeal: detail.showSeal !== false,
    }}
    ui={buildEstimateDetailUi(detail.outputLocale, ui)}
  />;
}
