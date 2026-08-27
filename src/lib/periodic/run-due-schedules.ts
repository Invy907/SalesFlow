import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  computeNextRunDate,
  dateFromRunAt,
  runAtFromDate,
  type ScheduleTiming,
} from "./schedule-math";
import { generateInvoiceFromSchedule } from "./generate-from-schedule";
import { sendPeriodicInvoiceEmail, type PeriodicEmailSkipReason } from "./send-periodic-email";
import type { PeriodicScheduleLineRow, PeriodicScheduleRow } from "./types";

/**
 * Run every schedule whose next_run_at has arrived.
 *
 * One failing schedule must not stop the others: the reason is stored in
 * periodic_invoice_schedules.last_error and next_run_at is left untouched so
 * the next cron pass retries it.
 */

export type PeriodicRunResult = {
  scheduleId: string;
  ok: boolean;
  invoiceId?: string;
  documentNumber?: string;
  issueDate?: string;
  nextRunAt?: string | null;
  emailSent?: boolean;
  emailSkipped?: PeriodicEmailSkipReason;
  error?: string;
};

export function timingOf(schedule: PeriodicScheduleRow): ScheduleTiming {
  return {
    startDate: schedule.start_date,
    cycle: schedule.cycle,
    dayMode: schedule.day_mode,
    dayValue: schedule.day_value,
    endMode: schedule.end_mode,
    endDate: schedule.end_date,
  };
}

const DEFAULT_LIMIT = 200;

export async function runDuePeriodicSchedules(
  origin: string,
  options: { now?: Date; limit?: number } = {},
): Promise<PeriodicRunResult[]> {
  const admin = createSupabaseAdminClient();
  const now = options.now ?? new Date();

  const { data, error } = await admin
    .from("periodic_invoice_schedules")
    .select("*")
    .is("deleted_at", null)
    .eq("is_paused", false)
    .not("next_run_at", "is", null)
    .lte("next_run_at", now.toISOString())
    .order("next_run_at", { ascending: true })
    .limit(options.limit ?? DEFAULT_LIMIT);

  if (error) throw new Error(error.message);

  const results: PeriodicRunResult[] = [];
  for (const row of (data ?? []) as PeriodicScheduleRow[]) {
    results.push(await runOneSchedule(admin, row, origin));
  }
  return results;
}

async function runOneSchedule(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  schedule: PeriodicScheduleRow,
  origin: string,
): Promise<PeriodicRunResult> {
  const issueDate = dateFromRunAt(schedule.next_run_at ?? "");

  try {
    if (!issueDate) throw new Error("PERIODIC_INVALID_NEXT_RUN_AT");

    const { data: lineRows, error: lineErr } = await admin
      .from("periodic_invoice_schedule_line_items")
      .select("*")
      .eq("schedule_id", schedule.id)
      .order("line_no", { ascending: true });

    if (lineErr) throw new Error(lineErr.message);

    const invoice = await generateInvoiceFromSchedule(
      admin,
      schedule,
      (lineRows ?? []) as PeriodicScheduleLineRow[],
      issueDate,
    );

    // Email is a best-effort extra step; the run still counts as successful.
    const email = await sendPeriodicInvoiceEmail(admin, { schedule, invoice, origin });

    const nextDate = computeNextRunDate(timingOf(schedule), issueDate);
    const nextRunAt = nextDate ? runAtFromDate(nextDate) : null;

    const { error: updateErr } = await admin
      .from("periodic_invoice_schedules")
      .update({
        last_generated_at: new Date().toISOString(),
        next_run_at: nextRunAt,
        last_error: null,
        last_error_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", schedule.id);

    if (updateErr) throw new Error(updateErr.message);

    return {
      scheduleId: schedule.id,
      ok: true,
      invoiceId: invoice.invoiceId,
      documentNumber: invoice.documentNumber,
      issueDate,
      nextRunAt,
      emailSent: email.sent,
      emailSkipped: email.sent ? undefined : email.skipped,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Periodic run failed";
    await admin
      .from("periodic_invoice_schedules")
      .update({
        last_error: message,
        last_error_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", schedule.id);

    return { scheduleId: schedule.id, ok: false, issueDate: issueDate || undefined, error: message };
  }
}
