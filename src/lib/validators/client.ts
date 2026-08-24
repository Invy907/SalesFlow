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

/**
 * CSV 일괄 등록·업데이트의 한 행.
 * 빈 셀은 "기존 값 유지" 로 다루므로 길이 제한만 검사하고, 값의 유무는 액션에서 본다.
 */
export const bulkClientRowSchema = z.object({
  row: z.number().int().positive(),
  name: z.string().min(1).max(40),
  furigana: z.string().max(100).optional(),
  managementCode: z.string().max(40).optional(),
  corpNumber: z.string().max(13).optional(),
  department: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  emailCc: z.string().optional(),
  phone: z.string().max(30).optional(),
  fax: z.string().max(30).optional(),
  honorific: z.string().max(10).optional(),
  memo: z.string().max(2000).optional(),
  destination: clientDestinationSchema.optional(),
});

export type BulkClientRow = z.infer<typeof bulkClientRowSchema>;
