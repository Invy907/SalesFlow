import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getEstimateById } from "@/lib/db/estimates";
import { getCompanyProfile } from "@/lib/db/company";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EstimateDetailClient, type EstimateDetail } from "./estimate-detail-client";
import { normalizeDocumentOutputLocale } from "@/lib/documents/output-locale";

export const dynamic = "force-dynamic";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);

  const [estimate, profile] = await Promise.all([
    getEstimateById(id),
    getCompanyProfile(scope.orgId),
  ]);
  if (!estimate) notFound();

  let shareExpiresAt: string | null = null;
  if (estimate.share_token) {
    const supabase = await getSupabaseServerClient();
    const { data: shareRow } = await supabase
      .from("share_tokens")
      .select("expires_at")
      .eq("token", estimate.share_token as string)
      .maybeSingle();
    shareExpiresAt = (shareRow?.expires_at as string | null) ?? null;
  }

  const recipient = (estimate.recipient_snapshot ?? {}) as Record<string, string>;
  const lines = (estimate.estimate_line_items ?? []) as Array<{
    line_no: number;
    name_snapshot: string;
    qty: number | string;
    unit_snapshot: string | null;
    unit_price_snapshot: number | string;
  }>;

  const detail: EstimateDetail = {
    id: estimate.id as string,
    documentNumber: (estimate.document_number as string) ?? "",
    clientId: (estimate.client_id as string | null) ?? null,
    clientName:
      ((estimate.clients as { name?: string } | null)?.name as string) ?? recipient.clientName ?? "",
    subject: (estimate.subject as string) ?? "",
    issueDate: (estimate.issue_date as string) ?? "",
    expiryDate: (estimate.expiry_date as string) ?? "",
    status: (estimate.status as string) ?? "draft",
    outputLocale: normalizeDocumentOutputLocale(estimate.output_locale),
    internalMemo: (estimate.internal_memo as string) ?? "",
    templateMessage: (estimate.template_message as string) ?? "",
    remarks: (estimate.remarks as string) ?? "",
    subtotal: Number(estimate.subtotal ?? 0),
    tax: Number(estimate.tax_amount ?? 0),
    total: Number(estimate.total ?? 0),
    shareToken: (estimate.share_token as string | null) ?? null,
    shareExpiresAt,
    lines: lines.map((l, index) => ({
      lineNo: Number(l.line_no ?? index + 1),
      name: l.name_snapshot ?? "",
      qty: Number(l.qty ?? 0),
      unit: l.unit_snapshot ?? "",
      unitPrice: Number(l.unit_price_snapshot) || 0,
    })),
    sender: {
      companyName: profile?.company_name_line1 ?? "",
      tel: profile?.tel ?? "",
      email: profile?.email ?? "",
    },
  };

  return (
    <EstimateDetailClient detail={detail} />
  );
}
