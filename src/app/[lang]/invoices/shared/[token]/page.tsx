import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SalesDocumentPreview } from "@/components/sales-document-preview";
import { buildInvoiceDetailUi } from "@/lib/documents/build-detail-ui";
import type { SalesDocumentDetail } from "@/lib/documents/detail-types";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";
import {
  normalizeClientHonorific,
  normalizeShowClientHonorific,
} from "@/lib/documents/client-honorific";
import { getInvoiceContent } from "../../content";

/** Public invoice view. Destination of the periodic-invoice automatic email. */
export const dynamic = "force-dynamic";

export default async function SharedInvoicePage({
  params,
}: {
  params: Promise<{ lang: string; token: string }>;
}) {
  const { token } = await params;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_shared_document", { _token: token });

  if (error || !data) notFound();

  const doc = data as {
    type?: string;
    document?: Record<string, unknown>;
    lines?: Array<Record<string, unknown>>;
  };

  if (doc.type !== "invoices") notFound();

  const invoice = doc.document ?? {};
  const lines = doc.lines ?? [];
  const recipient = (invoice.recipient_snapshot ?? {}) as Record<string, string>;
  const sender = (invoice.sender_snapshot ?? {}) as Record<string, string>;
  const outputLocale = normalizeDocumentOutputLocale(invoice.output_locale);
  const ui = buildInvoiceDetailUi(outputLocale, getInvoiceContent(outputLocale));

  const preview: SalesDocumentDetail = {
    id: String(invoice.id ?? ""),
    documentNumber: String(invoice.document_number ?? ""),
    clientName: recipient.clientName ?? String(recipient.companyName ?? ""),
    subject: String(invoice.subject ?? ""),
    issueDate: String(invoice.issue_date ?? ""),
    secondaryDate: invoice.payment_due ? String(invoice.payment_due) : undefined,
    status: String(invoice.status ?? "issued"),
    outputLocale,
    showClientHonorific: normalizeShowClientHonorific(invoice.show_client_honorific),
    clientHonorific: normalizeClientHonorific(invoice.client_honorific),
    templateMessage: String(invoice.template_message ?? ""),
    remarks: String(invoice.remarks ?? ""),
    subtotal: Number(invoice.subtotal ?? 0),
    tax: Number(invoice.tax_amount ?? 0),
    total: Number(invoice.total ?? 0),
    lines: lines.map((line, index) => ({
      lineNo: Number(line.line_no ?? index + 1),
      name: String(line.name_snapshot ?? ""),
      qty: Number(line.qty ?? 0),
      unit: String(line.unit_snapshot ?? ""),
      unitPrice: Number(line.unit_price_snapshot ?? 0),
    })),
    sender: {
      companyName: sender.companyName ?? "",
      tel: sender.tel ?? "",
      email: sender.email ?? "",
    },
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <SalesDocumentPreview detail={preview} ui={ui} />
      </div>
    </div>
  );
}
