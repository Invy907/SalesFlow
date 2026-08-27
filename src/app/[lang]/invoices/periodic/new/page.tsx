import { requireActiveOrg } from "@/lib/guards";
import { getClients } from "@/lib/db/clients";
import { getDocumentDefaults } from "@/lib/db/company";
import { NewPeriodicInvoiceClient } from "./new-periodic-invoice-client";

export const dynamic = "force-dynamic";

export default async function NewPeriodicInvoicePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const [defaults, clientList] = await Promise.all([
    getDocumentDefaults(scope.orgId),
    getClients(scope.orgId, { pageSize: 500 }),
  ]);

  return (
    <NewPeriodicInvoiceClient
      clients={clientList.clients.map((c) => ({
        id: c.id as string,
        name: (c.name as string) ?? "",
      }))}
      defaults={{
        taxDisplay: defaults?.tax_display_default ?? "separate",
        taxRounding: defaults?.tax_rounding_default ?? "round_down",
        withholdingType: defaults?.withholding_default ?? "none",
        templateKey: defaults?.invoice_template_key ?? "standard",
        remarks: defaults?.invoice_remarks ?? "",
      }}
    />
  );
}
