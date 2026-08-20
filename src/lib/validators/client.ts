import { z } from "zod";

export const clientDestinationSchema = z.object({
  postalCode: z.string().max(8).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  mailingLine1: z.string().max(100).optional(),
  mailingLine2: z.string().max(100).optional(),
  mailingLine3: z.string().max(100).optional(),
  mailingLine4: z.string().max(100).optional(),
  honorific: z.string().max(10).optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(40),
  furigana: z.string().optional(),
  corpNumber: z.string().optional(),
  managementCode: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emailCc: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  honorific: z.string().optional(),
  memo: z.string().optional(),
  destination: clientDestinationSchema.optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type ClientDestinationInput = z.infer<typeof clientDestinationSchema>;
