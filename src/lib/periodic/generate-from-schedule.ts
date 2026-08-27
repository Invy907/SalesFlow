import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeDocumentTotals } from "@/lib/tax";
import { applyTemplateVars, documentTemplateVars } from "./template-vars";
import { computePaymentDue } from "./payment-due";
import type { PeriodicScheduleLineRow, PeriodicScheduleRow } from "./types";

/**
 * One schedule -> one invoice.
 *
 * createInvoice() is a server action that needs a signed-in user, so the cron
 * cannot call it. Validation-free fields are copied straight from the schedule
 * and the totals go through the same computeDocumentTotals() the form uses.
 */

export type GeneratedInvoice = {
  invoiceId: string;
  documentNumber: string;
  issueDate: string;
  paymentDue: string | null;
  clientId: string | null;
  clientName: string;
  outputLocale: string;
};

/** Auto-created invoices are issued right away; the automatic email assumes it. */
const GENERATED_STATUS = "issued";

async function fetchClient(admin: SupabaseClient, clientId: string | null) {
  if (!clientId) return null;
  const { data } = await admin
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .maybeSingle();
  return (data as { id: string; name: string } | null) ?? null;
}

export async function generateInvoiceFromSchedule(
  admin: SupabaseClient,
  schedule: PeriodicScheduleRow,
  lines: PeriodicScheduleLineRow[],
  issueDate: string,
): Promise<GeneratedInvoice> {
  if (lines.length === 0) throw new Error("PERIODIC_NO_LINE_ITEMS");

  const vars = documentTemplateVars(issueDate);
  const ordered = lines.slice().sort((a, b) => a.line_no - b.line_no);

  const [client, { data: profile }] = await Promise.all([
    fetchClient(admin, schedule.client_id),
    admin
      .from("company_profiles")
      .select("company_name_line1")
      .eq("organization_id", schedule.organization_id)
      .maybeSingle(),
  ]);

  const clientName = client?.name ?? "";

  const totals = computeDocumentTotals(
    ordered.map((l) => ({
      qty: Number(l.qty),
      unitPrice: Number(l.unit_price_snapshot),
      taxCategory: l.tax_category,
    })),
    schedule.tax_rounding,
  );

  const paymentDue = computePaymentDue(issueDate, {
    paymentMode: schedule.payment_mode,
    paymentMonth: schedule.payment_month,
    paymentDayMode: schedule.payment_day_mode,
    paymentDay: schedule.payment_day,
  });

  const { data: docNum, error: seqErr } = await admin.rpc("next_document_number", {
    _org: schedule.organization_id,
    _doc_type: "invoice",
    _issue_date: issueDate,
  });
  if (seqErr) throw new Error(seqErr.message);
  if (typeof docNum !== "string" || !docNum) throw new Error("PERIODIC_NUMBERING_FAILED");

  const { data: invoice, error } = await admin
    .from("invoices")
    .insert({
      organization_id: schedule.organization_id,
      client_id: schedule.client_id,
      document_number: docNum,
      subject: applyTemplateVars(schedule.subject, vars) || null,
      issue_date: issueDate,
      payment_due: paymentDue,
      status: GENERATED_STATUS,
      tax_display: schedule.tax_display,
      tax_rounding: schedule.tax_rounding,
      withholding_type: schedule.withholding_type,
      template_key: schedule.template_key,
      output_locale: schedule.output_locale,
      show_client_honorific: schedule.show_client_honorific,
      remarks: applyTemplateVars(schedule.remarks, vars) || null,
      internal_memo: schedule.internal_memo,
      recipient_snapshot: { clientName, companyName: clientName },
      sender_snapshot: { companyName: (profile?.company_name_line1 as string | undefined) ?? "" },
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      periodic_schedule_id: schedule.id,
      created_by: schedule.created_by,
    })
    .select("id")
    .single();

  if (error || !invoice) throw new Error(error?.message ?? "PERIODIC_INVOICE_INSERT_FAILED");

  const invoiceId = invoice.id as string;

  const { error: lineErr } = await admin.from("invoice_line_items").insert(
    ordered.map((l, index) => ({
      document_id: invoiceId,
      line_no: index + 1,
      item_id: l.item_id,
      // The schedule keeps the {month}/{year} template; the invoice keeps the resolved text.
      name_snapshot: applyTemplateVars(l.name_template, vars),
      qty: l.qty,
      unit_snapshot: l.unit_snapshot,
      unit_price_snapshot: l.unit_price_snapshot,
      tax_category: l.tax_category,
      tax_rate_snapshot: l.tax_rate_snapshot,
      withholding_exempt_snapshot: l.withholding_exempt_snapshot,
    })),
  );

  if (lineErr) {
    // Never leave an invoice with totals but no line items.
    await admin.from("invoices").delete().eq("id", invoiceId);
    throw new Error(lineErr.message);
  }

  return {
    invoiceId,
    documentNumber: docNum,
    issueDate,
    paymentDue,
    clientId: schedule.client_id,
    clientName,
    outputLocale: schedule.output_locale,
  };
}
