import { notFound } from "next/navigation";
import { buildEditInvoiceInitial } from "../../invoice-form-data";
import { InvoiceFormClient } from "../../invoice-form-client";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  try {
    const { initial, clients, bankAccounts, sealUrl, items } = await buildEditInvoiceInitial(lang, id);
    return (
      <InvoiceFormClient
        initial={initial}
        clients={clients}
        bankAccounts={bankAccounts}
        sealUrl={sealUrl}
        items={items}
      />
    );
  } catch {
    notFound();
  }
}
