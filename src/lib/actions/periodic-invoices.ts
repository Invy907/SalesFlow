"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import {
  createPeriodicScheduleSchema,
  type CreatePeriodicScheduleInput,
  type ParsedPeriodicSchedule,
} from "@/lib/validators/periodic";
import { computeUpcomingRunAt, type ScheduleTiming } from "@/lib/periodic/schedule-math";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const LIST_PATH = "/[lang]/invoices/periodic";

function flattenIssues(error: import("zod").ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function timingOf(data: ParsedPeriodicSchedule): ScheduleTiming {
  return {
    startDate: data.startDate,
    cycle: data.cycle,
    dayMode: data.dayMode,
    dayValue: data.dayMode === "last" ? null : (data.dayValue ?? null),
    endMode: data.endMode,
    endDate: data.endMode === "date" ? (data.endDate ?? null) : null,
  };
}

function scheduleColumns(data: ParsedPeriodicSchedule) {
  return {
    client_id: data.clientId ?? null,
    subject: data.subject ?? null,
    start_date: data.startDate,
    cycle: data.cycle,
    day_mode: data.dayMode,
    day_value: data.dayMode === "last" ? null : (data.dayValue ?? null),
    end_mode: data.endMode,
    end_date: data.endMode === "date" ? (data.endDate ?? null) : null,
    payment_mode: data.paymentMode,
    payment_month: data.paymentMode === "due" ? (data.paymentMonth ?? "current") : null,
    payment_day_mode: data.paymentDayMode,
    payment_day:
      data.paymentMode === "due" && data.paymentDayMode === "day" ? (data.paymentDay ?? null) : null,
    email_enabled: data.emailEnabled,
    email_subject: data.emailSubject ?? null,
    email_body: data.emailBody ?? null,
    tax_display: data.taxDisplay,
    tax_rounding: data.taxRounding,
    withholding_type: data.withholdingType,
    template_key: data.templateKey,
    output_locale: data.outputLocale,
    show_client_honorific: data.showClientHonorific,
    remarks: data.remarks ?? null,
    internal_memo: data.internalMemo ?? null,
  };
}

function lineColumns(data: ParsedPeriodicSchedule, scheduleId: string) {
  return data.lineItems.map((li, index) => ({
    schedule_id: scheduleId,
    line_no: index + 1,
    item_id: li.itemId ?? null,
    // Kept un-substituted; generation resolves {month}/{year} into name_snapshot.
    name_template: li.name,
    qty: li.qty,
    unit_snapshot: li.unit ?? null,
    unit_price_snapshot: li.unitPrice,
    tax_category: li.taxCategory,
    tax_rate_snapshot: li.taxRateSnapshot,
    withholding_exempt_snapshot: li.withholdingExempt ?? null,
  }));
}

export async function createPeriodicSchedule(
  formData: CreatePeriodicScheduleInput,
): Promise<ActionResult<string>> {
  const parsed = createPeriodicScheduleSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: flattenIssues(parsed.error) };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: schedule, error } = await supabase
    .from("periodic_invoice_schedules")
    .insert({
      ...scheduleColumns(parsed.data),
      organization_id: org.organization_id,
      created_by: user.id,
      next_run_at: computeUpcomingRunAt(timingOf(parsed.data)),
    })
    .select("id")
    .single();

  if (error || !schedule) return { ok: false, error: error?.message ?? "Insert failed" };

  const scheduleId = schedule.id as string;
  const { error: lineErr } = await supabase
    .from("periodic_invoice_schedule_line_items")
    .insert(lineColumns(parsed.data, scheduleId));

  if (lineErr) {
    await supabase.from("periodic_invoice_schedules").delete().eq("id", scheduleId);
    return { ok: false, error: lineErr.message };
  }

  revalidatePath(LIST_PATH, "page");
  return { ok: true, data: scheduleId };
}

export async function updatePeriodicSchedule(
  scheduleId: string,
  formData: CreatePeriodicScheduleInput,
): Promise<ActionResult> {
  const parsed = createPeriodicScheduleSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: flattenIssues(parsed.error) };
  }

  const supabase = await getSupabaseServerClient();

  // The cycle may have changed, so the next run is recalculated from today.
  const { data, error } = await supabase
    .from("periodic_invoice_schedules")
    .update({
      ...scheduleColumns(parsed.data),
      next_run_at: computeUpcomingRunAt(timingOf(parsed.data)),
      last_error: null,
      last_error_at: null,
    })
    .eq("id", scheduleId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Schedule not found" };

  await supabase
    .from("periodic_invoice_schedule_line_items")
    .delete()
    .eq("schedule_id", scheduleId);

  const { error: lineErr } = await supabase
    .from("periodic_invoice_schedule_line_items")
    .insert(lineColumns(parsed.data, scheduleId));

  if (lineErr) return { ok: false, error: lineErr.message };

  revalidatePath(LIST_PATH, "page");
  revalidatePath(`${LIST_PATH}/${scheduleId}/edit`, "page");
  return { ok: true, data: undefined };
}

export async function pausePeriodicSchedule(
  scheduleId: string,
  paused: boolean,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("periodic_invoice_schedules")
    .update({ is_paused: paused })
    .eq("id", scheduleId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Schedule not found" };

  revalidatePath(LIST_PATH, "page");
  return { ok: true, data: undefined };
}

export async function deletePeriodicSchedule(scheduleId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("periodic_invoice_schedules")
    .update({ deleted_at: new Date().toISOString(), next_run_at: null })
    .eq("id", scheduleId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Schedule not found" };

  revalidatePath(LIST_PATH, "page");
  return { ok: true, data: undefined };
}

export async function restorePeriodicSchedule(scheduleId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: current } = await supabase
    .from("periodic_invoice_schedules")
    .select("start_date, cycle, day_mode, day_value, end_mode, end_date")
    .eq("id", scheduleId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Schedule not found" };

  const nextRunAt = computeUpcomingRunAt({
    startDate: current.start_date as string,
    cycle: current.cycle as ScheduleTiming["cycle"],
    dayMode: current.day_mode as ScheduleTiming["dayMode"],
    dayValue: (current.day_value as number | null) ?? null,
    endMode: current.end_mode as ScheduleTiming["endMode"],
    endDate: (current.end_date as string | null) ?? null,
  });

  const { error } = await supabase
    .from("periodic_invoice_schedules")
    .update({ deleted_at: null, next_run_at: nextRunAt })
    .eq("id", scheduleId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(LIST_PATH, "page");
  return { ok: true, data: undefined };
}
