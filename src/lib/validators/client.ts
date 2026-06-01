import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1).max(40),
  furigana: z.string().optional(),
  corpNumber: z.string().optional(),
  managementCode: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emailCc: z.array(z.string().email()).optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  honorific: z.string().optional(),
  memo: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
