import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getClientById } from "@/lib/db/clients";
import { getEstimates } from "@/lib/db/estimates";
import { getInvoices } from "@/lib/db/invoices";
import { getDeliveryNotes } from "@/lib/db/delivery-notes";
import { ClientDetailClient, type EstimateDocRow, type DeliveryNoteDocRow, type InvoiceDocRow } from "./client-detail-client";

export const dynamic = "force-dynamic";

/** 依頼2: 処理済み(confirmed)는 거래처 상세의 문서목록에서 기본적으로 숨긴다. 이번 개편에서는 아예 숨기고, 처리済み/ごみ箱는 각 문서 종류의 통상 一覧에서만 확인한다. */
const UNPROCESSED_STATUSES = ["draft", "issued", "sent", "overdue"] as const;

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);

  const client = await getClientById(id).catch(() => null);
  if (!client || client.organization_id !== scope.orgId) notFound();

  const filter = { clientId: id, pageSize: 100, statusIn: [...UNPROCESSED_STATUSES] };

  const [{ estimates }, { invoices }, { deliveryNotes }] = await Promise.all([
    getEstimates(scope.orgId, filter),
    getInvoices(scope.orgId, filter),
    getDeliveryNotes(scope.orgId, filter),
  ]);

  const estimateRows: EstimateDocRow[] = estimates.map((d) => ({
    id: d.id as string,
    href: `/${lang}/estimates/${d.id}`,
    documentNumber: d.document_number as string,
    subject: (d.subject as string | null) ?? "",
    issueDate: d.issue_date as string,
    total: Number(d.total ?? 0),
    issued: Boolean(d.issue_marked_at),
    ordered: Boolean(d.ordered_at),
  }));

  const deliveryNoteRows: DeliveryNoteDocRow[] = deliveryNotes.map((d) => ({
    id: d.id as string,
    href: `/${lang}/delivery-notes/${d.id}`,
    documentNumber: d.document_number as string,
    subject: (d.subject as string | null) ?? "",
    issueDate: d.issue_date as string,
    total: Number(d.total ?? 0),
    issued: Boolean(d.issued_marked_at),
    billed: Boolean(d.billed_marked_at),
  }));

  const invoiceRows: InvoiceDocRow[] = invoices.map((d) => ({
    id: d.id as string,
    href: `/${lang}/invoices/${d.id}`,
    documentNumber: d.document_number as string,
    subject: (d.subject as string | null) ?? "",
    issueDate: d.issue_date as string,
    total: Number(d.total ?? 0),
    issued: Boolean(d.issued_marked_at),
    paid: Boolean(d.payment_marked_at),
  }));

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
      estimates={estimateRows}
      deliveryNotes={deliveryNoteRows}
      invoices={invoiceRows}
    />
  );
}
