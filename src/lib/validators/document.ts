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

export const lineItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  qty: z.coerce.number().nonnegative(),
  unit: z.string().max(255).optional(),
  unitPrice: z.coerce.number().int().nonnegative(),
  taxCategory: taxCategorySchema,
  taxRateSnapshot: z.coerce.number().nonnegative(),
  withholdingExempt: z.boolean().optional(),
});

export const createEstimateSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  clientDestinationId: z.string().uuid().nullable().optional(),
  subject: z.string().max(70).optional(),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date().nullable().optional(),
  taxDisplay: taxDisplaySchema,
  taxRounding: taxRoundingSchema,
  withholdingType: withholdingTypeSchema,
  templateKey: z.string().default("standard"),
  templateMessage: z.string().optional(),
  remarks: z.string().optional(),
  internalMemo: z.string().optional(),
  recipientSnapshot: z.record(z.string(), z.unknown()).optional(),
  senderSnapshot: z.record(z.string(), z.unknown()).optional(),
  lineItems: z.array(lineItemSchema).min(1).max(80),
});

export const createInvoiceSchema = createEstimateSchema.extend({
  paymentDue: z.coerce.date().nullish(),
  deliveryDate: z.coerce.date().nullish(),
  billingMonth: z.string().optional(),
  bankAccountIds: z.array(z.string().uuid()).max(3).optional(),
});

export const createDeliveryNoteSchema = createEstimateSchema.extend({
  deliveryDate: z.coerce.date().nullable().optional(),
  linkedInvoiceId: z.string().uuid().nullable().optional(),
});

export const createReceiptSchema = createEstimateSchema.extend({
  transactionDate: z.coerce.date().nullable().optional(),
  linkedInvoiceId: z.string().uuid().nullable().optional(),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
