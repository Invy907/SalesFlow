import { getSimpleDocumentDefaults } from "../../documents/form-defaults";
import { requireActiveOrg } from "@/lib/guards";
import { getClientById, getClientOptions, type ClientOptionRow } from "@/lib/db/clients";
import { getItems } from "@/lib/db/items";
import type { ItemOption } from "../../documents/new-document-shared";
import { NewReceiptClient } from "./new-receipt-client";

export const dynamic = "force-dynamic";

function toItemOptions(items: Array<Record<string, unknown>>): ItemOption[] {
  return items.map((it) => ({
    id: it.id as string,
    name: (it.name as string) ?? "",
    unit: (it.unit as string | null) ?? null,
    unitPrice: Number(it.unit_price ?? 0),
    taxCategory: (it.tax_category as string) ?? "follow_company",
    withholdingExempt: Boolean(it.withholding_exempt),
  }));
}

export default async function NewReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const { clientId } = await searchParams;
  const [clients, itemList, defaults, selectedClient] = await Promise.all([
    getClientOptions(scope.orgId),
    getItems(scope.orgId, { pageSize: 500 }),
    getSimpleDocumentDefaults(scope.orgId, "receipt"),
    clientId ? getClientById(clientId).catch(() => null) : Promise.resolve(null),
  ]);
  let prefilledClient: ClientOptionRow | undefined;
  if (selectedClient?.organization_id === scope.orgId) {
    const destination = selectedClient.client_destinations.find((row) => row.is_default)
      ?? selectedClient.client_destinations[0];
    prefilledClient = {
      id: selectedClient.id, name: selectedClient.name, honorific: selectedClient.honorific,
      department: selectedClient.department, phone: selectedClient.phone,
      postalCode: destination?.postal_code ?? null,
      addressLine1: destination?.address_line1 ?? null,
      addressLine2: destination?.address_line2 ?? null,
    };
  }
  const availableClients = prefilledClient && !clients.some((client) => client.id === prefilledClient.id)
    ? [...clients, prefilledClient] : clients;
  const initial = prefilledClient ? {
    clientId: prefilledClient.id,
    clientName: prefilledClient.name,
    recipient: {
      companyName: prefilledClient.name, postalCode: prefilledClient.postalCode ?? "",
      addressLine1: prefilledClient.addressLine1 ?? "", addressLine2: prefilledClient.addressLine2 ?? "",
      department: prefilledClient.department ?? "", phone: prefilledClient.phone ?? "",
    },
  } : undefined;
  return <NewReceiptClient key={clientId ?? "new"} initial={initial} defaults={defaults} clients={availableClients} items={toItemOptions(itemList.items)} />;
}
