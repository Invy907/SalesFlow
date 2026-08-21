import { z } from "zod";

export const aiEstimateTaxCategorySchema = z.enum([
  "follow_company",
  "standard_10",
  "reduced_8",
  "standard_8",
  "exempt",
  "standard_5",
]);

export const aiEstimateLineSchema = z.object({
  name: z.string().trim().min(1).max(255),
  qty: z.coerce.number().nonnegative().max(999999),
  unit: z.string().trim().max(50),
  unitPrice: z.coerce.number().int().nonnegative().max(999999999999),
  taxCategory: aiEstimateTaxCategorySchema,
  confidence: z.coerce.number().min(0).max(1),
  reason: z.string().trim().max(500),
});

export const aiEstimateExtractionSchema = z.object({
  clientName: z.string().trim().max(255),
  clientId: z.string().uuid().nullable().optional(),
  subject: z.string().trim().max(70),
  issueDate: z.string().date().nullable(),
  templateMessage: z.string().trim().max(2000),
  remarks: z.string().trim().max(5000),
  rawText: z.string().max(100000),
  confidence: z.coerce.number().min(0).max(1),
  lines: z.array(aiEstimateLineSchema).min(1).max(80),
  warnings: z.array(z.string().max(500)).max(20),
});

export const aiEstimateEvidenceSchema = z.object({
  exampleId: z.string().uuid(),
  label: z.string().max(255),
  similarity: z.coerce.number().min(0).max(1),
});

export const aiEstimateDraftSchema = z.object({
  subject: z.string().trim().max(70),
  lines: z.array(aiEstimateLineSchema).min(1).max(80),
  templateMessage: z.string().trim().max(2000),
  remarks: z.string().trim().max(5000),
  evidence: z.array(aiEstimateEvidenceSchema).max(10),
  warnings: z.array(z.string().max(500)).max(20),
});

export const aiMarketResearchItemSchema = z.object({
  name: z.string().trim().min(1).max(255),
  unit: z.string().trim().max(50),
  lowPrice: z.coerce.number().int().nonnegative(),
  medianPrice: z.coerce.number().int().nonnegative(),
  highPrice: z.coerce.number().int().nonnegative(),
  basis: z.string().trim().max(500),
});

export const aiMarketResearchSourceSchema = z.object({
  title: z.string().trim().min(1).max(300),
  url: z.string().url().refine((value) => value.startsWith("https://") || value.startsWith("http://")),
});

export const aiMarketResearchResultSchema = z.object({
  query: z.string().trim().min(1).max(300),
  countryCode: z.enum(["JP", "KR", "US", "GLOBAL"]),
  currency: z.enum(["JPY", "KRW", "USD"]),
  summary: z.string().trim().max(1500),
  items: z.array(aiMarketResearchItemSchema).min(1).max(10),
  sources: z.array(aiMarketResearchSourceSchema).min(1).max(12),
  caveats: z.array(z.string().trim().max(500)).max(12),
  searchedAt: z.string().datetime(),
});

export const aiDraftRequestSchema = z.object({
  clientId: z.string().uuid().nullable(),
  clientName: z.string().trim().max(255),
  subject: z.string().trim().max(70),
  workDescription: z.string().trim().max(2000),
  useWebMarketResearch: z.boolean().default(false),
  publicSearchQuery: z.string().trim().max(300).default(""),
  marketCountryCode: z.enum(["JP", "KR", "US", "GLOBAL"]).default("JP"),
  marketCurrency: z.enum(["JPY", "KRW", "USD"]).default("JPY"),
}).superRefine((value, context) => {
  if (value.useWebMarketResearch && value.publicSearchQuery.length < 3) {
    context.addIssue({
      code: "custom",
      path: ["publicSearchQuery"],
      message: "웹 조사용 공개 검색어를 3자 이상 입력해 주세요.",
    });
  }
});

export type AiEstimateExtraction = z.infer<typeof aiEstimateExtractionSchema>;
export type AiEstimateDraft = z.infer<typeof aiEstimateDraftSchema>;
export type AiMarketResearchResult = z.infer<typeof aiMarketResearchResultSchema>;
