import { buildNewInvoiceInitial } from "../invoice-form-data";
import { InvoiceCsvUploadClient } from "./invoice-csv-upload-client";

export const dynamic = "force-dynamic";

export default async function InvoicesCsvUploadPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { initial, clients, bankAccounts } = await buildNewInvoiceInitial(lang);
  return <InvoiceCsvUploadClient initial={initial} clients={clients} bankAccounts={bankAccounts} />;
}
