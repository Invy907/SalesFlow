import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getEstimateContent } from "../../content";
import { EstimateDocumentPreview } from "../../estimate-document-preview";
import type { EstimatePreviewData } from "../../estimate-document-preview";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";
import { normalizeClientHonorific } from "@/lib/documents/client-honorific";

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
  const recipient = (estimate.recipient_snapshot ?? {}) as Record<string, string>;
  const sender = (estimate.sender_snapshot ?? {}) as Record<string, string>;
  const outputLocale = normalizeDocumentOutputLocale(estimate.output_locale);
  const ui = getEstimateContent(outputLocale);

  const preview: EstimatePreviewData = {
    documentNumber: String(estimate.document_number ?? ""),
    clientName: recipient.clientName ?? String(recipient.companyName ?? ""),
    clientHonorific: normalizeClientHonorific(estimate.client_honorific),
    outputLocale,
    subject: String(estimate.subject ?? ""),
    issueDate: String(estimate.issue_date ?? ""),
    expiryDate: String(estimate.expiry_date ?? ""),
    templateMessage: String(estimate.template_message ?? ""),
    remarks: String(estimate.remarks ?? ""),
    subtotal: Number(estimate.subtotal ?? 0),
    tax: Number(estimate.tax_amount ?? 0),
    total: Number(estimate.total ?? 0),
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
        <EstimateDocumentPreview detail={preview} ui={ui} />
      </div>
    </div>
  );
}
