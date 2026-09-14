import { buildNewInvoiceInitial } from "../invoice-form-data";
import { InvoiceFormClient } from "../invoice-form-client";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ copyFrom?: string; fromEstimate?: string }>;
}) {
  const { lang } = await params;
  const { copyFrom, fromEstimate } = await searchParams;
  const { initial, clients, bankAccounts, sealUrl } = await buildNewInvoiceInitial(lang, copyFrom, fromEstimate);
  return (
    <InvoiceFormClient
      initial={initial}
      clients={clients}
      bankAccounts={bankAccounts}
      sealUrl={sealUrl}
    />
  );
}
