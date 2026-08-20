import { buildNewInvoiceInitial } from "../invoice-form-data";
import { InvoiceFormClient } from "../invoice-form-client";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { initial, clients, bankAccounts } = await buildNewInvoiceInitial(lang);
  return (
    <InvoiceFormClient initial={initial} clients={clients} bankAccounts={bankAccounts} />
  );
}
