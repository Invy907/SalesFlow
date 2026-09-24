import { z } from "zod";

export const taxCategorySchema = z.enum([
  "follow_company",
  "standard_10",
  "reduced_8",
  "standard_8",
  "exempt",
  "standard_5",
]);

export const taxDisplaySchema = z.enum([
  "separate",
  "separate_on_invoice",
  "included",
  "exempt",
]);

export const taxRoundingSchema = z.enum(["round_down", "round_up", "round_half"]);

export const withholdingTypeSchema = z.enum([
  "none",
  "with_recovery",
  "without_recovery",
]);

export const documentOutputLocaleSchema = z.enum(["ko", "ja", "en"]);

/** 御中 / 様 / no honorific. See lib/documents/client-honorific.ts */
export const clientHonorificSchema = z.enum(["onchu", "sama", "none"]);

/**
 * A line the user added but has not filled in yet stays in the document as a blank row,
 * so `name` may be empty. At least one line must have content (checked below).
 */
export const lineItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  name: z.string().max(255),
  qty: z.coerce.number().nonnegative().max(999_999_999).multipleOf(0.0001),
  unit: z.string().max(255).optional(),
  unitPrice: z.coerce.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  taxCategory: taxCategorySchema,
  taxRateSnapshot: z.coerce.number().min(0).max(1),
  withholdingExempt: z.boolean().optional(),
});

export type ParsedLineItem = z.infer<typeof lineItemSchema>;

export function isBlankLineItem(line: ParsedLineItem) {
  return line.name.trim() === "" && line.qty === 0 && line.unitPrice === 0;
}

/** Every added row may be blank, but the document needs at least one real line. */
export function hasContentLineItem(lines: ParsedLineItem[]) {
  return lines.some((line) => !isBlankLineItem(line));
}

export const documentLineItemsSchema = z.array(lineItemSchema).min(1).max(80)
  .refine(hasContentLineItem, "明細を1行以上入力してください")
  .refine((lines) => lines.reduce((sum, line) => sum + Math.abs(line.qty * line.unitPrice), 0) <= Number.MAX_SAFE_INTEGER / 2,
    "金額が大きすぎます")
  .refine((lines) => lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0) >= 0,
    "合計金額がマイナスになる明細は保存できません");

// z.coerce.date() treats null/false as 1970-01-01 and accepts non-calendar strings.
const documentDateSchema = z.union([z.date(), z.iso.date().transform((value) => new Date(value))]);

export const createEstimateSchema = z.object({
  aiSuggestionIds: z.array(z.string().uuid()).max(20).optional(),
  clientId: z.string().uuid().nullable().optional(),
  clientDestinationId: z.string().uuid().nullable().optional(),
  subject: z.string().max(70).optional(),
  issueDate: documentDateSchema,
  expiryDate: documentDateSchema.nullable().optional(),
  taxDisplay: taxDisplaySchema,
  taxRounding: taxRoundingSchema,
  withholdingType: withholdingTypeSchema,
  templateKey: z.string().default("standard"),
  outputLocale: documentOutputLocaleSchema.default("ja"),
  clientHonorific: clientHonorificSchema.default("onchu"),
  showSeal: z.boolean().default(true),
  templateMessage: z.string().optional(),
  remarks: z.string().optional(),
  internalMemo: z.string().optional(),
  // Persisted to jsonb columns, so the values must stay JSON-serialisable
  // rather than `unknown`.
  recipientSnapshot: z.record(z.string(), z.json()).optional(),
  senderSnapshot: z.record(z.string(), z.json()).optional(),
  lineItems: documentLineItemsSchema,
});

export const createInvoiceSchema = createEstimateSchema.extend({
  /**
   * Empty means the normal numbering rule is used. Braces are rejected so a
   * numbering-template string (e.g. "{連番:M,3}") can never be saved/shown
   * as-is on a manually entered invoice number (依頼1).
   */
  documentNumber: z
    .string()
    .trim()
    .max(64)
    .refine((value) => !/[{}]/.test(value), {
      message: "「{」「}」は使用できません",
    })
    .optional(),
  paymentDue: documentDateSchema.nullish(),
  deliveryDate: documentDateSchema.nullish(),
  billingMonth: z.string().optional(),
  bankAccountIds: z.array(z.string().uuid()).max(3).optional(),
});

export const createDeliveryNoteSchema = createEstimateSchema.extend({
  deliveryDate: documentDateSchema.nullable().optional(),
  linkedInvoiceId: z.string().uuid().nullable().optional(),
});

export const createReceiptSchema = createEstimateSchema.extend({
  transactionDate: documentDateSchema.nullable().optional(),
  linkedInvoiceId: z.string().uuid().nullable().optional(),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateDeliveryNoteInput = z.infer<typeof createDeliveryNoteSchema>;
export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
