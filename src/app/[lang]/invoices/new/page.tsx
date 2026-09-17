import { buildNewInvoiceInitial } from "../invoice-form-data";
import { InvoiceFormClient } from "../invoice-form-client";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ copyFrom?: string; fromEstimate?: string; clientId?: string }>;
}) {
  const { lang } = await params;
  const { copyFrom, fromEstimate, clientId } = await searchParams;
  const { initial, clients, bankAccounts, sealUrl, items } = await buildNewInvoiceInitial(
    lang,
    copyFrom,
    fromEstimate,
    clientId,
  );
  return (
    <InvoiceFormClient
      initial={initial}
      clients={clients}
      bankAccounts={bankAccounts}
      sealUrl={sealUrl}
      items={items}
    />
  );
}
