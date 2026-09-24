import { z } from "zod";
import { taxCategorySchema } from "./document";

export const orderFormDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(70),
  expirationMode: z.enum(["none", "date"]),
  expirationDate: z.string().optional(),
  lines: z.array(z.object({
    name: z.string().trim().min(1).max(500),
    unit: z.string().trim().max(30),
    unitPrice: z.number().int().min(0).max(999_999_999),
    taxCategory: taxCategorySchema,
  })).min(1).max(80),
}).refine((data) => {
  if (data.expirationMode === "none") return true;
  if (!data.expirationDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.expirationDate)) return false;
  const date = new Date(`${data.expirationDate}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === data.expirationDate;
}, { path: ["expirationDate"], message: "A valid expiration date is required." });

export type OrderFormDraftInput = z.infer<typeof orderFormDraftSchema>;
