import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getClientById } from "@/lib/db/clients";
import { getEstimates } from "@/lib/db/estimates";
import { getInvoices } from "@/lib/db/invoices";
import { getDeliveryNotes } from "@/lib/db/delivery-notes";
import { getReceipts } from "@/lib/db/receipts";
import { ClientDetailClient, type ClientDocumentRow } from "./client-detail-client";

export const dynamic = "force-dynamic";

/** 依頼2: 処理済み(confirmed)는 거래처 상세의 문서목록에서 기본적으로 숨긴다. */
const UNPROCESSED_STATUSES = ["draft", "issued", "sent", "overdue"] as const;

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ showProcessed?: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);
  const { showProcessed } = await searchParams;
  const includeProcessed = showProcessed === "1";

  const client = await getClientById(id).catch(() => null);
  if (!client || client.organization_id !== scope.orgId) notFound();

  const filter = includeProcessed
    ? { clientId: id, pageSize: 100 }
    : { clientId: id, pageSize: 100, statusIn: [...UNPROCESSED_STATUSES] };

  const [{ estimates }, { invoices }, { deliveryNotes }, { receipts }] = await Promise.all([
    getEstimates(scope.orgId, filter),
    getInvoices(scope.orgId, filter),
    getDeliveryNotes(scope.orgId, filter),
    getReceipts(scope.orgId, filter),
  ]);

  const documents: ClientDocumentRow[] = [
    ...estimates.map((d) => ({
      type: "estimate" as const,
      id: d.id as string,
      href: `/${lang}/estimates/${d.id}`,
      documentNumber: d.document_number as string,
      subject: (d.subject as string | null) ?? "",
      issueDate: d.issue_date as string,
      status: d.status as string,
    })),
    ...invoices.map((d) => ({
      type: "invoice" as const,
      id: d.id as string,
      href: `/${lang}/invoices/${d.id}`,
      documentNumber: d.document_number as string,
      subject: (d.subject as string | null) ?? "",
      issueDate: d.issue_date as string,
      status: d.status as string,
    })),
    ...deliveryNotes.map((d) => ({
      type: "delivery_note" as const,
      id: d.id as string,
      href: `/${lang}/delivery-notes/${d.id}`,
      documentNumber: d.document_number as string,
      subject: (d.subject as string | null) ?? "",
      issueDate: d.issue_date as string,
      status: d.status as string,
    })),
    ...receipts.map((d) => ({
      type: "receipt" as const,
      id: d.id as string,
      href: `/${lang}/receipts/${d.id}`,
      documentNumber: d.document_number as string,
      subject: (d.subject as string | null) ?? "",
      issueDate: d.issue_date as string,
      status: d.status as string,
    })),
  ].sort((a, b) => (b.issueDate ?? "").localeCompare(a.issueDate ?? ""));

  return (
    <ClientDetailClient
      client={{
        id: client.id as string,
        name: client.name as string,
        furigana: (client.furigana as string | null) ?? null,
        managementCode: (client.management_code as string | null) ?? null,
        department: (client.department as string | null) ?? null,
        email: (client.email as string | null) ?? null,
        phone: (client.phone as string | null) ?? null,
        fax: (client.fax as string | null) ?? null,
        memo: (client.memo as string | null) ?? null,
      }}
      documents={documents}
      includeProcessed={includeProcessed}
    />
  );
}
