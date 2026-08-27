import { buildNewInvoiceInitial } from "../invoice-form-data";
import { InvoiceFormClient } from "../invoice-form-client";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const { lang } = await params;
  const { copyFrom } = await searchParams;
  const { initial, clients, bankAccounts, sealUrl } = await buildNewInvoiceInitial(lang, copyFrom);
  return (
    <InvoiceFormClient
      initial={initial}
      clients={clients}
      bankAccounts={bankAccounts}
      sealUrl={sealUrl}
    />
  );
}
