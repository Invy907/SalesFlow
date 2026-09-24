import { z } from "zod";

const inputNumber = z.union([z.number(), z.string().trim().regex(/^-?\d+(?:\.\d+)?$/)]).transform(Number).pipe(z.number().finite());

export const aiEstimateDocumentKindSchema = z.enum(["estimate", "price_list", "design", "work_scope"]);
export type AiEstimateDocumentKind = z.infer<typeof aiEstimateDocumentKindSchema>;
export const isContextDocument = (kind: string | undefined) => kind === "design" || kind === "work_scope";
export const aiEstimateSourceMetadataSchema = z.object({
  documentKind: aiEstimateDocumentKindSchema.default("estimate"),
  projectName: z.string().trim().max(120).default(""),
  revision: z.string().trim().max(50).default(""),
  validFrom: z.string().date().nullable().default(null),
  validUntil: z.string().date().nullable().default(null),
}).refine((value) => !value.validFrom || !value.validUntil || value.validFrom <= value.validUntil, {
  path: ["validUntil"], message: "유효 종료일은 시작일 이후여야 합니다.",
});

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
  qty: inputNumber.pipe(z.number().nonnegative().max(999999).refine((value) => Math.abs(value * 10000 - Math.round(value * 10000)) < 0.00001, "수량은 소수점 4자리까지 입력할 수 있습니다.")),
  unit: z.string().trim().max(50),
  unitPrice: inputNumber.pipe(z.number().int().min(-999999999999).max(999999999999)),
  taxCategory: aiEstimateTaxCategorySchema,
  confidence: inputNumber.pipe(z.number().min(0).max(1)),
  reason: z.string().trim().max(500),
});

export const aiEstimateExtractionSchema = z.object({
  documentKind: aiEstimateDocumentKindSchema.default("estimate"),
  workDetails: z.string().trim().max(16000).default(""),
  assumptions: z.string().trim().max(4000).default(""),
  exclusions: z.string().trim().max(4000).default(""),
  currency: z.literal("JPY").default("JPY"),
  taxMode: z.enum(["excluded", "included", "unknown"]).default("unknown"),
  clientName: z.string().trim().max(255),
  clientId: z.string().uuid().nullable().optional(),
  subject: z.string().trim().max(70),
  issueDate: z.string().date().nullable(),
  templateMessage: z.string().trim().max(2000),
  remarks: z.string().trim().max(5000),
  rawText: z.string().max(100000),
  confidence: inputNumber.pipe(z.number().min(0).max(1)),
  lines: z.array(aiEstimateLineSchema).max(80),
  warnings: z.array(z.string().max(500)).max(20),
}).superRefine((value, context) => {
  if (isContextDocument(value.documentKind) ? value.lines.length !== 0 : value.lines.length === 0) {
    context.addIssue({ code: "custom", path: ["lines"], message: isContextDocument(value.documentKind)
      ? "설계·작업 자료의 가격은 단가표에 별도로 등록해 주세요." : "가격 자료에는 1개 이상의 명세가 필요합니다." });
  }
});

export const aiEstimateEvidenceSchema = z.object({
  exampleId: z.string().uuid(),
  sourceId: z.string().uuid().optional(),
  label: z.string().max(255),
  similarity: z.number().finite().min(0).max(1),
  documentKind: aiEstimateDocumentKindSchema.optional(),
});

export const aiEstimateDraftLineSchema = aiEstimateLineSchema.extend({
  priceEvidence: z.enum(["price_list", "historical", "statistical", "insufficient"]).default("insufficient"),
  quantityReason: z.string().trim().max(500).optional(),
  evidenceExampleIds: z.array(z.string().uuid()).max(50).default([]),
  evidenceLineIds: z.array(z.string().uuid()).max(100).default([]),
  priceRange: z.object({ low: z.number().finite(), high: z.number().finite(), sampleCount: z.number().int().nonnegative(), unit: z.string() }).optional(),
});

export const aiEstimateDraftSchema = z.object({
  subject: z.string().trim().max(70),
  lines: z.array(aiEstimateDraftLineSchema).min(1).max(80),
  templateMessage: z.string().trim().max(2000),
  remarks: z.string().trim().max(5000),
  evidence: z.array(aiEstimateEvidenceSchema).max(10),
  contextEvidence: z.array(aiEstimateEvidenceSchema).max(10).optional(),
  warnings: z.array(z.string().max(500)).max(20),
  retrieval: z.object({
    mode: z.enum(["local", "hybrid"]),
    matchedExamples: z.number().int().nonnegative(),
    pricedLines: z.number().int().nonnegative(),
    insufficientLines: z.number().int().nonnegative(),
  }).optional(),
});

export const aiMarketResearchItemSchema = z.object({
  name: z.string().trim().min(1).max(255),
  unit: z.string().trim().max(50),
  lowPrice: inputNumber.pipe(z.number().int().nonnegative().max(999999999999)),
  medianPrice: inputNumber.pipe(z.number().int().nonnegative().max(999999999999)),
  highPrice: inputNumber.pipe(z.number().int().nonnegative().max(999999999999)),
  basis: z.string().trim().max(500),
}).refine((item) => item.lowPrice <= item.medianPrice && item.medianPrice <= item.highPrice, "가격 범위가 올바르지 않습니다.");

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
  requestId: z.string().uuid().optional(),
  locale: z.enum(["ja", "ko", "en"]).default("ja"),
  taxMode: z.enum(["included", "excluded"]).default("excluded"),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().trim().max(255),
  subject: z.string().trim().max(70),
  workDescription: z.string().trim().max(2000),
  requirements: z.string().trim().max(8000).default(""),
  assumptions: z.string().trim().max(4000).default(""),
  exclusions: z.string().trim().max(4000).default(""),
  sourceIds: z.array(z.string().uuid()).max(10).default([]).refine((ids) => new Set(ids).size === ids.length, "같은 자료를 중복 선택할 수 없습니다."),
  provider: z.enum(["auto", "gemini", "anthropic"]).default("auto"),
  useWebMarketResearch: z.boolean().default(false),
  publicSearchQuery: z.string().trim().max(300).default(""),
  marketCountryCode: z.enum(["JP", "KR", "US", "GLOBAL"]).default("JP"),
  marketCurrency: z.enum(["JPY", "KRW", "USD"]).default("JPY"),
}).superRefine((value, context) => {
  if (!value.sourceIds.length && [value.subject, value.workDescription, value.requirements].join(" ").trim().length < 3) {
    context.addIssue({ code: "custom", path: ["workDescription"], message: "작업 내용을 3자 이상 입력해 주세요." });
  }
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
