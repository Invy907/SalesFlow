export function invoiceOutstandingTotals(
  invoices: ReadonlyArray<{ total: number | null; paid_amount: number; payment_due: string | null }>,
  today: string,
) {
  let unpaidTotal = 0;
  let overdueTotal = 0;
  for (const invoice of invoices) {
    const remaining = Math.max(0, Number(invoice.total) - Number(invoice.paid_amount));
    unpaidTotal += remaining;
    if (invoice.payment_due && invoice.payment_due < today) overdueTotal += remaining;
  }
  return { unpaidTotal, overdueTotal };
}
