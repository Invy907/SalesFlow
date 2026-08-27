import { z } from "zod";
import {
  documentOutputLocaleSchema,
  lineItemSchema,
  taxDisplaySchema,
  taxRoundingSchema,
  withholdingTypeSchema,
} from "./document";

/**
 * Periodic invoice schedules.
 * The document half mirrors createInvoiceSchema; only the recurrence,
 * payment-due and automatic-email fields are new. Line item `name` holds the
 * pre-substitution template ({month}/{year}), not the final invoice text.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Invalid date");

export const periodicCycleSchema = z.enum(["monthly", "yearly", "weekly"]);
export const periodicDayModeSchema = z.enum(["day", "last"]);
export const periodicEndModeSchema = z.enum(["none", "date"]);
export const periodicPaymentModeSchema = z.enum(["none", "due"]);
export const periodicPaymentMonthSchema = z.enum(["current", "next"]);

const dayOfMonth = z.coerce.number().int().min(1).max(28);

export const createPeriodicScheduleSchema = z
  .object({
    clientId: z.string().uuid().nullable().optional(),
    subject: z.string().max(70).optional(),

    startDate: isoDate,
    cycle: periodicCycleSchema.default("monthly"),
    dayMode: periodicDayModeSchema.default("day"),
    dayValue: dayOfMonth.nullable().optional(),
    endMode: periodicEndModeSchema.default("none"),
    endDate: isoDate.nullable().optional(),

    paymentMode: periodicPaymentModeSchema.default("none"),
    paymentMonth: periodicPaymentMonthSchema.nullable().optional(),
    paymentDayMode: periodicDayModeSchema.default("day"),
    paymentDay: dayOfMonth.nullable().optional(),

    emailEnabled: z.boolean().default(false),
    emailSubject: z.string().max(200).optional(),
    emailBody: z.string().max(4000).optional(),

    taxDisplay: taxDisplaySchema,
    taxRounding: taxRoundingSchema,
    withholdingType: withholdingTypeSchema,
    templateKey: z.string().default("standard"),
    outputLocale: documentOutputLocaleSchema.default("ja"),
    showClientHonorific: z.boolean().default(true),
    remarks: z.string().max(2000).optional(),
    internalMemo: z.string().max(2000).optional(),

    lineItems: z.array(lineItemSchema).min(1).max(80),
  })
  .superRefine((value, ctx) => {
    if (value.cycle === "monthly" && value.dayMode === "day" && value.dayValue == null) {
      ctx.addIssue({ code: "custom", path: ["dayValue"], message: "Required" });
    }
    if (value.endMode === "date") {
      if (!value.endDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "Required" });
      } else if (value.endDate < value.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "Must be after the start date" });
      }
    }
    if (value.paymentMode === "due") {
      if (!value.paymentMonth) {
        ctx.addIssue({ code: "custom", path: ["paymentMonth"], message: "Required" });
      }
      if (value.paymentDayMode === "day" && value.paymentDay == null) {
        ctx.addIssue({ code: "custom", path: ["paymentDay"], message: "Required" });
      }
    }
  });

export type CreatePeriodicScheduleInput = z.input<typeof createPeriodicScheduleSchema>;
export type ParsedPeriodicSchedule = z.output<typeof createPeriodicScheduleSchema>;
