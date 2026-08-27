/** periodic_invoice_schedules / _line_items row types shared by the cron, actions and UI. */

import type { TaxCategory, TaxRounding } from "@/lib/tax";
import type { z } from "zod";
import type { taxDisplaySchema, withholdingTypeSchema } from "@/lib/validators/document";
import type { PeriodicCycle, PeriodicDayMode, PeriodicEndMode } from "./schedule-math";

export type PeriodicScheduleRow = {
  id: string;
  organization_id: string;
  client_id: string | null;
  subject: string | null;
  start_date: string;
  cycle: PeriodicCycle;
  day_mode: PeriodicDayMode;
  day_value: number | null;
  end_mode: PeriodicEndMode;
  end_date: string | null;
  payment_mode: "none" | "due";
  payment_month: "current" | "next" | null;
  payment_day_mode: "day" | "last";
  payment_day: number | null;
  email_enabled: boolean;
  email_subject: string | null;
  email_body: string | null;
  tax_display: z.infer<typeof taxDisplaySchema>;
  tax_rounding: TaxRounding;
  withholding_type: z.infer<typeof withholdingTypeSchema>;
  template_key: string | null;
  output_locale: string;
  show_client_honorific: boolean;
  remarks: string | null;
  internal_memo: string | null;
  last_generated_at: string | null;
  next_run_at: string | null;
  is_paused: boolean;
  last_error: string | null;
  last_error_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PeriodicScheduleLineRow = {
  id: string;
  schedule_id: string;
  line_no: number;
  item_id: string | null;
  name_template: string;
  qty: number;
  unit_snapshot: string | null;
  unit_price_snapshot: number;
  tax_category: TaxCategory;
  tax_rate_snapshot: number;
  withholding_exempt_snapshot: boolean | null;
};
