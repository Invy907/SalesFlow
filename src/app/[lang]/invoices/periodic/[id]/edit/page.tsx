import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getClients } from "@/lib/db/clients";
import { getDocumentDefaults } from "@/lib/db/company";
import { getPeriodicScheduleById } from "@/lib/db/periodic-invoices";
import { TAX_CATEGORY_TO_LABEL } from "@/lib/tax";
import {
  NewPeriodicInvoiceClient,
  type PeriodicScheduleFormValue,
} from "../../new/new-periodic-invoice-client";

export const dynamic = "force-dynamic";

export default async function EditPeriodicInvoicePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);
  const [defaults, clientList, schedule] = await Promise.all([
    getDocumentDefaults(scope.orgId),
    getClients(scope.orgId, { pageSize: 500 }),
    getPeriodicScheduleById(id),
  ]);

  if (!schedule) notFound();

  const value: PeriodicScheduleFormValue = {
    id: schedule.id,
    clientId: schedule.client_id,
    clientName: schedule.clients?.name ?? "",
    subject: schedule.subject ?? "",
    startDate: schedule.start_date,
    cycle: schedule.cycle,
    dayMode: schedule.day_mode,
    dayValue: schedule.day_value ? String(schedule.day_value) : "1",
    endMode: schedule.end_mode,
    endDate: schedule.end_date ?? "",
    paymentMode: schedule.payment_mode,
    paymentMonth: schedule.payment_month ?? "current",
    paymentDayMode: schedule.payment_day_mode,
    paymentDay: schedule.payment_day ? String(schedule.payment_day) : "1",
    emailEnabled: schedule.email_enabled,
    emailSubject: schedule.email_subject ?? "",
    emailBody: schedule.email_body ?? "",
    taxDisplay: schedule.tax_display,
    taxRounding: schedule.tax_rounding,
    withholdingType: schedule.withholding_type,
    templateKey: schedule.template_key ?? "standard",
    outputLocale: schedule.output_locale,
    showClientHonorific: schedule.show_client_honorific,
    remarks: schedule.remarks ?? "",
    lineItems: (schedule.periodic_invoice_schedule_line_items ?? []).map((line) => ({
      name: line.name_template,
      qty: String(line.qty ?? 1),
      unit: line.unit_snapshot ?? "",
      price: String(line.unit_price_snapshot ?? 0),
      tax: TAX_CATEGORY_TO_LABEL[line.tax_category] ?? "10%",
    })),
  };

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
      schedule={value}
    />
  );
}
