import { requireActiveOrg } from "@/lib/guards";
import {
  getOrderById,
  getOrderCounts,
  getOrderStatuses,
  getOrders,
} from "@/lib/db/orders";
import { OrdersClient, type OrderDetail, type OrderRow, type OrderStatusOption } from "./orders-client";

export const dynamic = "force-dynamic";

const TRASH = "trash";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string; q?: string; orderId?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const query = sp.q?.trim() || undefined;

  const [statuses, counts] = await Promise.all([
    getOrderStatuses(scope.orgId),
    getOrderCounts(scope.orgId),
  ]);

  const options: OrderStatusOption[] = statuses.map((s) => ({
    id: s.id as string,
    name: (s.name as string) ?? "",
    systemKey: (s.system_key as string | null) ?? null,
    count: counts.byStatus[s.id as string] ?? 0,
  }));

  const fallback =
    options.find((s) => s.systemKey === "unprocessed") ?? options.find((s) => s.systemKey !== TRASH);
  const requested = sp.status;
  const isTrash = requested === TRASH;
  const activeStatusId = isTrash ? null : (requested ?? fallback?.id ?? null);

  const { orders } = await getOrders(scope.orgId, {
    statusId: activeStatusId ?? undefined,
    trashed: isTrash,
    query,
    pageSize: 100,
  });

  const rows: OrderRow[] = orders.map((o) => {
    const client = o.clients as { name?: string } | null;
    const status = o.order_statuses as { name?: string } | null;
    return {
      id: o.id as string,
      orderNumber: (o.order_number as string) ?? "",
      clientName: client?.name ?? "",
      subject: (o.subject as string) ?? "",
      orderDate: (o.order_date as string) ?? "",
      deliveryDate: (o.delivery_date as string) ?? "",
      statusName: status?.name ?? "",
      total: Number(o.total ?? 0),
    };
  });

  const selectedId =
    sp.orderId && rows.some((r) => r.id === sp.orderId) ? sp.orderId : null;
  const selectedRaw = selectedId ? await getOrderById(selectedId) : null;

  const detail: OrderDetail | null = selectedRaw
    ? {
        id: selectedRaw.id as string,
        orderNumber: (selectedRaw.order_number as string) ?? "",
        clientName: ((selectedRaw.clients as { name?: string } | null)?.name as string) ?? "",
        subject: (selectedRaw.subject as string) ?? "",
        orderDate: (selectedRaw.order_date as string) ?? "",
        deliveryDate: (selectedRaw.delivery_date as string) ?? "",
        statusName:
          ((selectedRaw.order_statuses as { name?: string } | null)?.name as string) ?? "",
        comment: (selectedRaw.comment as string) ?? "",
        total: Number(selectedRaw.total ?? 0),
        lineItems: ((selectedRaw.order_line_items as Record<string, unknown>[]) ?? []).map(
          (li) => ({
            id: li.id as string,
            name: (li.name_snapshot as string) ?? "",
            qty: Number(li.qty ?? 0),
            unitPrice: Number(li.unit_price_snapshot ?? 0),
            amount: Number(li.line_subtotal ?? 0),
          }),
        ),
      }
    : null;

  return (
    <OrdersClient
      statuses={options}
      trashCount={counts.trashed}
      activeStatusId={activeStatusId}
      isTrash={isTrash}
      rows={rows}
      detail={detail}
      query={query ?? ""}
    />
  );
}
