import { z } from "zod";
import { taxCategorySchema } from "./document";

export const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  unit: z.string().max(255).optional(),
  unitPrice: z.coerce.number().int().nonnegative(),
  taxCategory: taxCategorySchema,
  withholdingExempt: z.boolean().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
