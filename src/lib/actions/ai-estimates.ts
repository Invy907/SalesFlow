"use server";

import { randomUUID } from "crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/db/organizations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prepareUploadedEstimateForReview } from "@/lib/ai/estimates/processor";
import {
  aiDraftRequestSchema,
  aiEstimateDraftSchema,
  aiEstimateExtractionSchema,
  type AiEstimateDraft,
  type AiEstimateExtraction,
  type AiMarketResearchResult,
} from "@/lib/ai/estimates/schemas";
import { extractionSearchText, normalizeItemName } from "@/lib/ai/estimates/normalize";
import {
  searchApprovedExamples,
  type ApprovedExampleSearch,
} from "@/lib/ai/estimates/hybrid-search";
import { tokenScore } from "@/lib/ai/estimates/retrieval";
import {
  isMarketResearchConfigured,
  MARKET_RESEARCH_MODEL,
  researchPublicMarketPrice,
} from "@/lib/ai/estimates/market-research";
import {
  AI_ESTIMATE_GENERATION_MODEL,
  generateAiEstimateWithOpenAI,
  isAiEstimateGenerationConfigured,
} from "@/lib/ai/estimates/generate";
import {
  groundAiGeneratedEstimate,
  type AiEstimateGenerationEvidence,
  type AiEstimatePriceAnchor,
} from "@/lib/ai/estimates/generation-core";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type AiDb = SupabaseClient;

function asUntyped(client: Awaited<ReturnType<typeof getSupabaseServerClient>>): AiDb {
  return client as unknown as AiDb;
}

async function getScope() {
  const typed = await getSupabaseServerClient();
  const {
    data: { user },
  } = await typed.auth.getUser();
  if (!user) return null;
  const organization = await getActiveOrganization();
  if (!organization) return null;
  return {
    supabase: asUntyped(typed),
    userId: user.id,
    orgId: organization.organization_id,
    role: organization.role,
  };
}

const uploadTicketSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  fileSize: z.number().int().positive().max(20 * 1024 * 1024),
  fileHash: z.string().trim().max(128).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  visibility: z.enum(["private", "organization"]),
});

export async function createAiEstimateUploadTicket(
  input: z.input<typeof uploadTicketSchema>,
): Promise<ActionResult<{ sourceId: string; path: string; token: string }>> {
  const parsed = uploadTicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file" };

  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };

  if (parsed.data.fileHash) {
    const { data: duplicate } = await scope.supabase
      .from("ai_estimate_sources")
      .select("id")
      .eq("organization_id", scope.orgId)
      .eq("file_hash", parsed.data.fileHash)
      .neq("status", "excluded")
      .maybeSingle();
    if (duplicate) return { ok: false, error: "같은 파일이 이미 AI 자료함에 있습니다." };
  }

  const sourceId = randomUUID();
  const extension = parsed.data.mimeType === "application/pdf" ? "pdf" : parsed.data.mimeType === "image/png" ? "png" : "jpg";
  const path = `${scope.orgId}/${sourceId}/original.${extension}`;

  const { error: insertError } = await scope.supabase.from("ai_estimate_sources").insert({
    id: sourceId,
    organization_id: scope.orgId,
    source_type: "upload",
    title: parsed.data.title,
    original_file_name: parsed.data.fileName,
    storage_path: path,
    mime_type: parsed.data.mimeType,
    file_size: parsed.data.fileSize,
    file_hash: parsed.data.fileHash ?? null,
    visibility: parsed.data.visibility,
    status: "uploaded",
    uploaded_by: scope.userId,
  });
  if (insertError) return { ok: false, error: insertError.message };

  const { data: signed, error: signedError } = await scope.supabase.storage
    .from("ai-estimate-sources")
    .createSignedUploadUrl(path);
  if (signedError || !signed) {
    await scope.supabase.from("ai_estimate_sources").delete().eq("id", sourceId);
    return { ok: false, error: signedError?.message ?? "업로드 URL을 만들 수 없습니다." };
  }

  return { ok: true, data: { sourceId, path, token: signed.token } };
}

export async function completeAiEstimateUpload(sourceId: string): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(sourceId);
  if (!id.success) return { ok: false, error: "Invalid source" };
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };

  const { data: source } = await scope.supabase
    .from("ai_estimate_sources")
    .select("id, uploaded_by, storage_path")
    .eq("id", sourceId)
    .eq("organization_id", scope.orgId)
    .single();
  if (!source || source.uploaded_by !== scope.userId) return { ok: false, error: "자료를 찾을 수 없습니다." };

  const { data: objects, error: listError } = await scope.supabase.storage
    .from("ai-estimate-sources")
    .list(`${scope.orgId}/${sourceId}`, { limit: 2 });
  if (listError || !objects?.length) return { ok: false, error: "업로드된 파일을 확인할 수 없습니다." };

  await scope.supabase.from("ai_estimate_sources").update({ status: "processing" }).eq("id", sourceId);
  after(async () => {
    try {
      await prepareUploadedEstimateForReview(sourceId);
    } catch (error) {
      const admin = createSupabaseAdminClient();
      await admin
        .from("ai_estimate_sources")
        .update({ status: "failed", error_message: error instanceof Error ? error.message : "처리 실패" })
        .eq("id", sourceId);
    }
  });

  revalidatePath("/[lang]/estimates/ai-library", "page");
  return { ok: true, data: undefined };
}

export async function saveAiEstimateExtraction(
  sourceId: string,
  input: unknown,
): Promise<ActionResult<AiEstimateExtraction>> {
  const id = z.string().uuid().safeParse(sourceId);
  const parsed = aiEstimateExtractionSchema.safeParse(input);
  if (!id.success || !parsed.success) {
    return { ok: false, error: parsed.success ? "Invalid source" : parsed.error.issues[0]?.message ?? "Invalid extraction" };
  }
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };

  const { data: source } = await scope.supabase
    .from("ai_estimate_sources")
    .select("uploaded_by")
    .eq("id", sourceId)
    .eq("organization_id", scope.orgId)
    .single();
  const canEdit = source && (source.uploaded_by === scope.userId || scope.role === "owner" || scope.role === "admin");
  if (!canEdit) return { ok: false, error: "수정 권한이 없습니다." };

  const { data: before } = await scope.supabase
    .from("ai_estimate_extractions")
    .select("extracted_data")
    .eq("source_id", sourceId)
    .maybeSingle();
  const { error } = await scope.supabase.from("ai_estimate_extractions").upsert(
    {
      organization_id: scope.orgId,
      source_id: sourceId,
      extracted_data: parsed.data,
      raw_text: parsed.data.rawText,
      confidence: parsed.data.confidence,
      source_of_truth: "human",
    },
    { onConflict: "source_id" },
  );
  if (error) return { ok: false, error: error.message };
  if (before && JSON.stringify(before.extracted_data) !== JSON.stringify(parsed.data)) {
    await scope.supabase.from("ai_estimate_review_edits").insert({
      organization_id: scope.orgId,
      source_id: sourceId,
      edited_by: scope.userId,
      field_path: "$",
      before_value: before.extracted_data,
      after_value: parsed.data,
      reason: "manual-review-save",
    });
  }
  await scope.supabase
    .from("ai_estimate_jobs")
    .update({ status: "needs_review", finished_at: new Date().toISOString() })
    .eq("source_id", sourceId)
    .eq("organization_id", scope.orgId);
  revalidatePath(`/[lang]/estimates/ai-library/${sourceId}`, "page");
  return { ok: true, data: parsed.data };
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

async function rebuildPriceStats(orgId: string) {
  const supabase = createSupabaseAdminClient() as AiDb;
  const { data: lines, error } = await supabase
    .from("ai_estimate_example_lines")
    .select("name, normalized_name, unit_price, ai_estimate_examples!inner(client_id, issue_date, visibility)")
    .eq("organization_id", orgId)
    .eq("ai_estimate_examples.visibility", "organization");
  if (error) throw new Error(error.message);

  const groups = new Map<string, { clientId: string | null; name: string; normalized: string; prices: number[]; last: string | null }>();
  for (const row of lines ?? []) {
    const exampleValue = row.ai_estimate_examples as { client_id: string | null; issue_date: string | null } | Array<{ client_id: string | null; issue_date: string | null }>;
    const example = Array.isArray(exampleValue) ? exampleValue[0] : exampleValue;
    const scopes: Array<string | null> = example?.client_id ? [example.client_id, null] : [null];
    for (const clientId of scopes) {
      const key = `${clientId ?? "all"}:${row.normalized_name}`;
      const group = groups.get(key) ?? {
        clientId,
        name: row.name as string,
        normalized: row.normalized_name as string,
        prices: [],
        last: null,
      };
      group.prices.push(Number(row.unit_price));
      if (example?.issue_date && (!group.last || example.issue_date > group.last)) group.last = example.issue_date;
      groups.set(key, group);
    }
  }

  await supabase.from("ai_estimate_price_stats").delete().eq("organization_id", orgId);
  const rows = [...groups.values()].map((group) => ({
    organization_id: orgId,
    client_id: group.clientId,
    normalized_name: group.normalized,
    display_name: group.name,
    sample_count: group.prices.length,
    median_price: Math.round(percentile(group.prices, 0.5)),
    p25_price: Math.round(percentile(group.prices, 0.25)),
    p75_price: Math.round(percentile(group.prices, 0.75)),
    last_used_at: group.last,
  }));
  if (rows.length) {
    const { error: insertError } = await supabase.from("ai_estimate_price_stats").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }
}

export async function approveAiEstimateSource(sourceId: string, input: unknown): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(sourceId);
  const parsed = aiEstimateExtractionSchema.safeParse(input);
  if (!id.success || !parsed.success) return { ok: false, error: parsed.success ? "Invalid source" : parsed.error.issues[0]?.message ?? "Invalid extraction" };
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };
  if (scope.role !== "owner" && scope.role !== "admin") return { ok: false, error: "조직 관리자만 승인할 수 있습니다." };
  if (parsed.data.lines.some((line) => !line.name.trim() || line.unitPrice <= 0)) {
    return { ok: false, error: "품목명과 0보다 큰 단가를 모두 확인해 주세요." };
  }

  const { data: source } = await scope.supabase
    .from("ai_estimate_sources")
    .select("id, visibility, uploaded_by")
    .eq("id", sourceId)
    .eq("organization_id", scope.orgId)
    .single();
  if (!source) return { ok: false, error: "자료를 찾을 수 없습니다." };

  await scope.supabase.from("ai_estimate_extractions").upsert(
    {
      organization_id: scope.orgId,
      source_id: sourceId,
      extracted_data: parsed.data,
      raw_text: parsed.data.rawText,
      confidence: parsed.data.confidence,
      source_of_truth: "human",
    },
    { onConflict: "source_id" },
  );
  await scope.supabase.from("ai_estimate_examples").delete().eq("source_id", sourceId);

  const searchText = extractionSearchText(parsed.data);
  const { data: example, error: exampleError } = await scope.supabase
    .from("ai_estimate_examples")
    .insert({
      organization_id: scope.orgId,
      source_id: sourceId,
      client_id: parsed.data.clientId ?? null,
      client_name: parsed.data.clientName || null,
      visibility: source.visibility,
      owner_user_id: source.uploaded_by,
      subject: parsed.data.subject || null,
      issue_date: parsed.data.issueDate,
      template_message: parsed.data.templateMessage || null,
      remarks: parsed.data.remarks || null,
      search_text: searchText,
      approved_by: scope.userId,
    })
    .select("id")
    .single();
  if (exampleError || !example) return { ok: false, error: exampleError?.message ?? "승인 자료 생성 실패" };

  const { error: linesError } = await scope.supabase.from("ai_estimate_example_lines").insert(
    parsed.data.lines.map((line, index) => ({
      organization_id: scope.orgId,
      example_id: example.id,
      line_no: index + 1,
      name: line.name,
      normalized_name: normalizeItemName(line.name),
      qty: line.qty,
      unit: line.unit || null,
      unit_price: line.unitPrice,
      tax_category: line.taxCategory,
      confidence: line.confidence,
    })),
  );
  if (linesError) return { ok: false, error: linesError.message };

  await scope.supabase.from("ai_estimate_chunks").insert({
    organization_id: scope.orgId,
    example_id: example.id,
    chunk_index: 0,
    content: searchText,
  });
  await scope.supabase
    .from("ai_estimate_sources")
    .update({ status: "approved", approved_by: scope.userId, approved_at: new Date().toISOString(), error_message: null })
    .eq("id", sourceId);
  await scope.supabase
    .from("ai_estimate_jobs")
    .update({ status: "approved", review_reasons: [], finished_at: new Date().toISOString() })
    .eq("source_id", sourceId)
    .eq("organization_id", scope.orgId);
  await rebuildPriceStats(scope.orgId);

  revalidatePath("/[lang]/estimates/ai-library", "page");
  revalidatePath(`/[lang]/estimates/ai-library/${sourceId}`, "page");
  return { ok: true, data: undefined };
}

export async function importEstimateAsAiSource(estimateId: string): Promise<ActionResult<string>> {
  const id = z.string().uuid().safeParse(estimateId);
  if (!id.success) return { ok: false, error: "Invalid estimate" };
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };

  const { data: estimate, error } = await scope.supabase
    .from("estimates")
    .select("id, client_id, document_number, subject, issue_date, template_message, remarks, clients(name), estimate_line_items(name_snapshot, qty, unit_snapshot, unit_price_snapshot, tax_category)")
    .eq("id", estimateId)
    .eq("organization_id", scope.orgId)
    .single();
  if (error || !estimate) return { ok: false, error: error?.message ?? "견적을 찾을 수 없습니다." };

  const sourceId = randomUUID();
  const { error: sourceError } = await scope.supabase.from("ai_estimate_sources").insert({
    id: sourceId,
    organization_id: scope.orgId,
    source_type: "estimate",
    title: estimate.subject || estimate.document_number,
    imported_estimate_id: estimate.id,
    visibility: "organization",
    status: "review_required",
    uploaded_by: scope.userId,
  });
  if (sourceError) {
    if (sourceError.code === "23505") return { ok: false, error: "이미 AI 자료로 등록된 견적입니다." };
    return { ok: false, error: sourceError.message };
  }

  const clientsValue = estimate.clients as { name: string } | Array<{ name: string }> | null;
  const clientName = Array.isArray(clientsValue) ? clientsValue[0]?.name ?? "" : clientsValue?.name ?? "";
  const lineValues = estimate.estimate_line_items as Array<{
    name_snapshot: string;
    qty: number;
    unit_snapshot: string | null;
    unit_price_snapshot: number;
    tax_category: AiEstimateExtraction["lines"][number]["taxCategory"];
  }>;
  const extraction: AiEstimateExtraction = {
    clientId: estimate.client_id,
    clientName,
    subject: estimate.subject ?? "",
    issueDate: estimate.issue_date,
    templateMessage: estimate.template_message ?? "",
    remarks: estimate.remarks ?? "",
    rawText: "",
    confidence: 1,
    lines: lineValues.map((line) => ({
      name: line.name_snapshot,
      qty: Number(line.qty),
      unit: line.unit_snapshot ?? "",
      unitPrice: Number(line.unit_price_snapshot),
      taxCategory: line.tax_category,
      confidence: 1,
      reason: "SalesFlow 기존 견적에서 가져옴",
    })),
    warnings: [],
  };
  await scope.supabase.from("ai_estimate_extractions").insert({
    organization_id: scope.orgId,
    source_id: sourceId,
    extracted_data: extraction,
    confidence: 1,
    provider: "salesflow",
    model: "existing-estimate",
  });

  revalidatePath("/[lang]/estimates/ai-library", "page");
  return { ok: true, data: sourceId };
}

export async function maybeImportIssuedEstimateAsAiSource(estimateId: string): Promise<void> {
  const scope = await getScope();
  if (!scope) return;
  const { data: settings } = await scope.supabase
    .from("ai_estimate_settings")
    .select("auto_import_issued_estimates")
    .eq("organization_id", scope.orgId)
    .maybeSingle();
  if (!settings?.auto_import_issued_estimates) return;
  await importEstimateAsAiSource(estimateId);
}

export async function generateAiEstimateDraft(input: unknown): Promise<ActionResult<{ suggestionId: string; draft: AiEstimateDraft; marketResearch: AiMarketResearchResult | null }>> {
  const parsed = aiDraftRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };

  const { data: settings } = await scope.supabase
    .from("ai_estimate_settings")
    .select("enabled, minimum_price_samples, allow_private_sources, allow_web_market_research")
    .eq("organization_id", scope.orgId)
    .maybeSingle();
  if (settings && !settings.enabled) return { ok: false, error: "조직 설정에서 AI 견적 기능이 꺼져 있습니다." };

  if (parsed.data.useWebMarketResearch && !settings?.allow_web_market_research) {
    return { ok: false, error: "조직 설정에서 웹 시중가 조사가 허용되지 않았습니다." };
  }
  if (parsed.data.useWebMarketResearch && !isMarketResearchConfigured()) {
    return { ok: false, error: "웹 조사 API가 설정되지 않았습니다. GEMINI_API_KEY를 확인해 주세요." };
  }

  let marketResearch: AiMarketResearchResult | null = null;
  let marketResearchError: string | null = null;
  if (parsed.data.useWebMarketResearch) {
    try {
      marketResearch = await researchPublicMarketPrice({
        publicQuery: parsed.data.publicSearchQuery,
        countryCode: parsed.data.marketCountryCode,
        currency: parsed.data.marketCurrency,
      });
    } catch (researchError) {
      marketResearchError = researchError instanceof Error ? researchError.message : "웹 조사에 실패했습니다.";
      await scope.supabase.from("ai_estimate_market_research_runs").insert({
        organization_id: scope.orgId,
        requested_by: scope.userId,
        public_query: parsed.data.publicSearchQuery,
        country_code: parsed.data.marketCountryCode,
        currency: parsed.data.marketCurrency,
        provider: "gemini-google-search",
        model: MARKET_RESEARCH_MODEL,
        status: "failed",
        error_message: marketResearchError,
      });
    }
  }

  const queryText = [parsed.data.clientName, parsed.data.subject, parsed.data.workDescription].filter(Boolean).join(" ");
  let search: ApprovedExampleSearch;
  try {
    search = await searchApprovedExamples({
      supabase: scope.supabase,
      orgId: scope.orgId,
      queryText,
      clientId: parsed.data.clientId,
      allowPrivateSources: Boolean(settings?.allow_private_sources),
    });
  } catch (searchError) {
    return {
      ok: false,
      error: searchError instanceof Error ? searchError.message : "과거 견적 검색에 실패했습니다.",
    };
  }

  const ranked = search.matches;
  const best = ranked[0];
  let draft: AiEstimateDraft;
  const retrievalLabel = search.vectorUsed ? "salesflow-hybrid-retrieval" : "salesflow-retrieval";
  let provider = marketResearch ? `${retrievalLabel}+gemini-google-search` : retrievalLabel;
  let model = marketResearch ? MARKET_RESEARCH_MODEL : "approved-example-v1";
  let generationEvidence: AiEstimateGenerationEvidence[] = [];
  let priceAnchors: AiEstimatePriceAnchor[] = [];
  const minimumSamples = Number(settings?.minimum_price_samples ?? 3);

  if (best) {
    type PriceStatRow = {
      normalized_name: string;
      display_name: string;
      sample_count: number;
      median_price: number;
      p25_price: number;
      p75_price: number;
    };
    type ExampleLine = {
      name: string;
      qty: number;
      unit: string | null;
      unit_price: number;
      tax_category: AiEstimateDraft["lines"][number]["taxCategory"];
    };

    const statsColumns = "normalized_name, display_name, sample_count, median_price, p25_price, p75_price";
    const companyStatsPromise = scope.supabase
      .from("ai_estimate_price_stats")
      .select(statsColumns)
      .eq("organization_id", scope.orgId)
      .is("client_id", null);
    const clientStatsPromise = parsed.data.clientId
      ? scope.supabase
        .from("ai_estimate_price_stats")
        .select(statsColumns)
        .eq("organization_id", scope.orgId)
        .eq("client_id", parsed.data.clientId)
      : Promise.resolve({ data: [] as PriceStatRow[], error: null });
    const [companyStatsResult, clientStatsResult] = await Promise.all([companyStatsPromise, clientStatsPromise]);
    if (companyStatsResult.error) return { ok: false, error: companyStatsResult.error.message };
    if (clientStatsResult.error) return { ok: false, error: clientStatsResult.error.message };

    const anchorMap = new Map<string, AiEstimatePriceAnchor>();
    for (const [rows, anchorScope] of [
      [companyStatsResult.data ?? [], "company"],
      [clientStatsResult.data ?? [], "client"],
    ] as const) {
      for (const raw of rows) {
        const stat = raw as PriceStatRow;
        anchorMap.set(stat.normalized_name, {
          name: stat.display_name,
          normalizedName: stat.normalized_name,
          sampleCount: Number(stat.sample_count),
          medianPrice: Number(stat.median_price),
          p25Price: Number(stat.p25_price),
          p75Price: Number(stat.p75_price),
          scope: anchorScope,
        });
      }
    }
    priceAnchors = [...anchorMap.values()];

    generationEvidence = ranked.map(({ example, score }) => {
      const evidenceLines = example.ai_estimate_example_lines as ExampleLine[];
      return {
        exampleId: example.id as string,
        label: [example.issue_date, example.client_name, example.subject].filter(Boolean).join(" · ").slice(0, 255),
        similarity: score,
        clientName: example.client_name as string | null,
        subject: example.subject as string | null,
        issueDate: example.issue_date as string | null,
        templateMessage: example.template_message as string | null,
        remarks: example.remarks as string | null,
        lines: evidenceLines.map((line) => ({
          name: line.name,
          qty: Number(line.qty),
          unit: line.unit,
          unitPrice: Number(line.unit_price),
          taxCategory: line.tax_category,
        })),
      };
    });

    const lineValues = best.example.ai_estimate_example_lines as ExampleLine[];
    const warnings: string[] = ["승인된 과거 견적을 조합한 초안입니다. 저장 전 수량과 단가를 확인해 주세요."];
    const lines = lineValues.map((line) => {
      const stat = anchorMap.get(normalizeItemName(line.name));
      const canUseMedian = stat && stat.sampleCount >= minimumSamples;
      if (!canUseMedian) warnings.push(`${line.name}: 가격 표본이 ${minimumSamples}건 미만이라 최근 근거 가격을 사용했습니다.`);
      return {
        name: line.name,
        qty: Number(line.qty),
        unit: line.unit ?? "",
        unitPrice: canUseMedian ? stat.medianPrice : Number(line.unit_price),
        taxCategory: line.tax_category,
        confidence: Math.max(0.4, best.score),
        reason: canUseMedian ? `${stat.scope === "client" ? "동일 거래처" : "조직"} ${stat.sampleCount}건의 중앙값` : "가장 유사한 승인 견적의 단가",
      };
    });
    if (marketResearch) {
      for (const line of lines) {
        const marketItem = marketResearch.items
          .map((item) => ({ item, score: tokenScore(line.name, item.name) }))
          .sort((a, b) => b.score - a.score)[0];
        if (marketItem?.score && (line.unitPrice < marketItem.item.lowPrice || line.unitPrice > marketItem.item.highPrice)) {
          warnings.push(`${line.name}: 내부 추천가가 웹 시중가 범위(${marketItem.item.lowPrice.toLocaleString()}~${marketItem.item.highPrice.toLocaleString()} ${marketResearch.currency}) 밖입니다.`);
        }
      }
    }
    if (marketResearchError) warnings.push(`웹 조사는 실패했지만 내부 자료 초안은 생성했습니다: ${marketResearchError}`);
    draft = {
      subject: parsed.data.subject || (best.example.subject as string | null) || parsed.data.workDescription.slice(0, 70),
      lines,
      templateMessage: (best.example.template_message as string | null) ?? "",
      remarks: (best.example.remarks as string | null) ?? "",
      evidence: ranked.map(({ example, score }) => ({
        exampleId: example.id as string,
        label: [example.issue_date, example.client_name, example.subject].filter(Boolean).join(" · ").slice(0, 255),
        similarity: score,
      })),
      warnings: [...new Set(warnings)],
    };

    if (isAiEstimateGenerationConfigured()) {
      try {
        const generated = await generateAiEstimateWithOpenAI({
          clientName: parsed.data.clientName,
          subject: parsed.data.subject,
          workDescription: parsed.data.workDescription,
          evidence: generationEvidence,
          priceAnchors,
          marketResearch,
        });
        draft = groundAiGeneratedEstimate({
          generated: generated.generated,
          evidence: generationEvidence,
          priceAnchors,
          minimumSamples,
          fallbackWarnings: marketResearchError
            ? [`웹 조사는 실패했지만 내부 자료 초안은 생성했습니다: ${marketResearchError}`]
            : ["AI가 승인된 과거 견적을 조합한 초안입니다. 저장 전 수량과 단가를 확인해 주세요."],
        });
        provider = marketResearch ? "openai-responses+gemini-google-search" : "openai-responses";
        model = generated.model;
      } catch {
        draft.warnings = [...new Set([
          ...draft.warnings,
          "AI 모델 호출에 실패해 승인된 과거 견적 기반 초안으로 대체했습니다.",
        ])];
      }
    } else {
      draft.warnings = [...new Set([
        ...draft.warnings,
        "AI 모델이 연결되지 않아 승인된 과거 견적 기반 초안을 사용했습니다.",
      ])];
    }
  } else if (marketResearch) {
    draft = {
      subject: parsed.data.subject || parsed.data.workDescription.slice(0, 70) || parsed.data.publicSearchQuery.slice(0, 70),
      lines: marketResearch.items.map((item) => ({
        name: item.name,
        qty: 1,
        unit: item.unit,
        unitPrice: item.medianPrice,
        taxCategory: "standard_10",
        confidence: 0.45,
        reason: `웹 시중가 중앙값 참고: ${item.basis}`,
      })),
      templateMessage: "",
      remarks: "",
      evidence: [],
      warnings: ["내부 승인 자료가 없어 웹 시중가 중앙값으로 임시 초안을 만들었습니다. 출처와 작업 범위를 확인해 주세요."],
    };
  } else {
    return { ok: false, error: marketResearchError ?? "승인된 AI 견적 자료가 없습니다. 자료를 승인하거나 웹 조사를 선택해 주세요." };
  }

  const validatedDraft = aiEstimateDraftSchema.safeParse(draft);
  if (!validatedDraft.success) return { ok: false, error: "AI 견적 초안이 최종 서버 검증을 통과하지 못했습니다." };
  draft = validatedDraft.data;

  const { data: suggestion, error: suggestionError } = await scope.supabase
    .from("ai_estimate_suggestions")
    .insert({
      organization_id: scope.orgId,
      requested_by: scope.userId,
      prompt_text: parsed.data.workDescription,
      request_context: parsed.data,
      suggestion_data: {
        draft,
        marketResearch,
        retrieval: { mode: search.vectorUsed ? "hybrid" : "keyword", vectorUsed: search.vectorUsed },
      },
      evidence_example_ids: draft.evidence.map((item) => item.exampleId),
      provider,
      model,
    })
    .select("id")
    .single();
  if (suggestionError || !suggestion) return { ok: false, error: suggestionError?.message ?? "제안 저장 실패" };
  if (marketResearch) {
    await scope.supabase.from("ai_estimate_market_research_runs").insert({
      organization_id: scope.orgId,
      requested_by: scope.userId,
      suggestion_id: suggestion.id,
      public_query: parsed.data.publicSearchQuery,
      country_code: parsed.data.marketCountryCode,
      currency: parsed.data.marketCurrency,
      result_data: marketResearch,
      provider: "gemini-google-search",
      model: MARKET_RESEARCH_MODEL,
      status: "completed",
    });
  }
  return { ok: true, data: { suggestionId: suggestion.id as string, draft, marketResearch } };
}

export async function getAiEstimateCapabilities(): Promise<ActionResult<{
  modelGenerationConfigured: boolean;
  modelGenerationModel: string | null;
  webMarketResearchAllowed: boolean;
  webMarketResearchConfigured: boolean;
}>> {
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };
  const { data: settings } = await scope.supabase
    .from("ai_estimate_settings")
    .select("allow_web_market_research")
    .eq("organization_id", scope.orgId)
    .maybeSingle();
  return {
    ok: true,
    data: {
      modelGenerationConfigured: isAiEstimateGenerationConfigured(),
      modelGenerationModel: isAiEstimateGenerationConfigured() ? AI_ESTIMATE_GENERATION_MODEL : null,
      webMarketResearchAllowed: Boolean(settings?.allow_web_market_research),
      webMarketResearchConfigured: isMarketResearchConfigured(),
    },
  };
}

export async function getAiEstimateRecommendations(
  clientId: string | null,
): Promise<ActionResult<Array<{ name: string; sampleCount: number; medianPrice: number; p25Price: number; p75Price: number }>>> {
  const parsedClient = z.string().uuid().nullable().safeParse(clientId);
  if (!parsedClient.success) return { ok: false, error: "Invalid client" };
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };
  let query = scope.supabase
    .from("ai_estimate_price_stats")
    .select("display_name, sample_count, median_price, p25_price, p75_price")
    .eq("organization_id", scope.orgId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(8);
  query = parsedClient.data ? query.eq("client_id", parsedClient.data) : query.is("client_id", null);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      name: row.display_name as string,
      sampleCount: Number(row.sample_count),
      medianPrice: Number(row.median_price),
      p25Price: Number(row.p25_price),
      p75Price: Number(row.p75_price),
    })),
  };
}

export async function markAiEstimateSuggestionApplied(suggestionId: string): Promise<void> {
  const id = z.string().uuid().safeParse(suggestionId);
  if (!id.success) return;
  const scope = await getScope();
  if (!scope) return;
  await scope.supabase
    .from("ai_estimate_suggestions")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("organization_id", scope.orgId)
    .eq("requested_by", scope.userId);
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  allowPrivateSources: z.boolean(),
  minimumPriceSamples: z.number().int().min(1).max(20),
  autoImportIssuedEstimates: z.boolean(),
  sourceRetentionDays: z.number().int().min(30).nullable(),
  allowWebMarketResearch: z.boolean(),
});

export async function saveAiEstimateSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };
  if (scope.role !== "owner" && scope.role !== "admin") return { ok: false, error: "조직 관리자만 설정할 수 있습니다." };
  const { error } = await scope.supabase.from("ai_estimate_settings").upsert({
    organization_id: scope.orgId,
    enabled: parsed.data.enabled,
    allow_private_sources: parsed.data.allowPrivateSources,
    minimum_price_samples: parsed.data.minimumPriceSamples,
    auto_import_issued_estimates: parsed.data.autoImportIssuedEstimates,
    source_retention_days: parsed.data.sourceRetentionDays,
    allow_web_market_research: parsed.data.allowWebMarketResearch,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/settings/ai-estimates", "page");
  return { ok: true, data: undefined };
}

export async function deleteAiEstimateSource(sourceId: string): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(sourceId);
  if (!id.success) return { ok: false, error: "Invalid source" };
  const scope = await getScope();
  if (!scope) return { ok: false, error: "Unauthorized" };
  const { data: source } = await scope.supabase
    .from("ai_estimate_sources")
    .select("storage_path, uploaded_by")
    .eq("id", sourceId)
    .eq("organization_id", scope.orgId)
    .single();
  if (!source || (source.uploaded_by !== scope.userId && scope.role !== "owner" && scope.role !== "admin")) {
    return { ok: false, error: "삭제 권한이 없습니다." };
  }
  if (source.storage_path) await scope.supabase.storage.from("ai-estimate-sources").remove([source.storage_path]);
  const { error } = await scope.supabase.from("ai_estimate_sources").delete().eq("id", sourceId);
  if (error) return { ok: false, error: error.message };
  await rebuildPriceStats(scope.orgId);
  revalidatePath("/[lang]/estimates/ai-library", "page");
  return { ok: true, data: undefined };
}
