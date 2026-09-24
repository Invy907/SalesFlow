"use server";

import { createHash, randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { canWriteOrganizationBusinessData } from "@/lib/organization-permissions";
import { getActiveOrganization } from "@/lib/db/organizations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prepareUploadedEstimateForReview } from "@/lib/ai/estimates/processor";
import { indexApprovedEstimateSource } from "@/lib/ai/estimates/indexing";
import { aiDraftRequestSchema, aiEstimateDraftSchema, aiEstimateExtractionSchema, aiMarketResearchResultSchema, aiEstimateSourceMetadataSchema, isContextDocument,
  type AiEstimateDraft, type AiEstimateExtraction, type AiMarketResearchResult } from "@/lib/ai/estimates/schemas";
import { getApprovedPriceAnchors, searchApprovedExamples } from "@/lib/ai/estimates/hybrid-search";
import { isMarketResearchConfigured, MARKET_RESEARCH_MODEL, researchPublicMarketPrice } from "@/lib/ai/estimates/market-research";
import { generateAiEstimateWithProvider, getAiEstimateGenerationConfig } from "@/lib/ai/estimates/generate";
import { isExtractionConfigured } from "@/lib/ai/estimates/extraction-provider";
import { isQueryEmbeddingConfigured } from "@/lib/ai/estimates/query-embed";
import { businessDateKey } from "@/lib/business-date";
import { collectAllRows } from "@/lib/db/paginate";
import { AiDraftWorkflowError, composeGroundedDraft } from "@/lib/ai/estimates/draft-workflow";
import type { AiEstimateGenerationEvidence } from "@/lib/ai/estimates/generation-core";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
type DraftResult = { suggestionId: string; draft: AiEstimateDraft; marketResearch: AiMarketResearchResult | null; generationMode: "model" | "local"; provider: string; model: string };
const uuid = z.string().uuid();
const isAdmin = (role: string) => role === "owner" || role === "admin";

async function getScope() {
  const typed = await getSupabaseServerClient();
  const { data: { user } } = await typed.auth.getUser();
  if (!user) return null;
  const organization = await getActiveOrganization();
  if (!organization) return null;
  return { supabase: typed as unknown as SupabaseClient, userId: user.id,
    orgId: organization.organization_id, role: organization.role };
}
type Scope = NonNullable<Awaited<ReturnType<typeof getScope>>>;
const writable = (scope: Scope | null): scope is Scope => Boolean(scope && canWriteOrganizationBusinessData(scope.role));
function refreshSource(sourceId?: string) {
  revalidatePath("/[lang]/estimates/ai-library", "page");
  if (sourceId) revalidatePath(`/[lang]/estimates/ai-library/${sourceId}`, "page");
}
async function loadSettings(scope: Scope) {
  const { data, error } = await scope.supabase.from("ai_estimate_settings").select("*")
    .eq("organization_id", scope.orgId).maybeSingle();
  if (error) throw new Error("AI_SETTINGS_UNAVAILABLE");
  return data;
}
async function editableSource(scope: Scope, sourceId: string) {
  const { data, error } = await scope.supabase.from("ai_estimate_sources")
    .select("id, uploaded_by, source_type, document_kind, status, storage_path, file_size, mime_type, updated_at")
    .eq("id", sourceId).eq("organization_id", scope.orgId).maybeSingle();
  if (error || !data || (data.uploaded_by !== scope.userId && !isAdmin(scope.role))) return null;
  return data;
}
function mutationError(error: { code?: string; message?: string }) {
  if (error.message?.includes("AI_REFERENCE_UNAVAILABLE")) return "선택한 자료가 승인 상태·유효기간·거래처 조건에 맞는지 확인해 주세요.";
  if (error.code === "40001") return "다른 작업으로 자료가 변경되었습니다. 새로고침 후 다시 시도해 주세요.";
  if (error.code === "42501") return "이 자료를 변경할 권한이 없습니다.";
  if (error.code === "22023") return error.message ?? "입력과 자료 상태를 확인해 주세요.";
  if (error.code === "23505") return "이미 등록된 자료입니다. 자료함에서 확인해 주세요.";
  return "처리를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function snapshotExampleIds(value: unknown): string[] {
  const parsed = z.array(z.object({ exampleId: uuid })).max(10).safeParse(value);
  return parsed.success ? parsed.data.map((item) => item.exampleId) : [];
}
async function suggestionEvidenceIsCurrent(scope: Scope, draft: AiEstimateDraft, clientId: string | null, referenceIds: string[] = []) {
  const ids = [...new Set([...draft.lines.flatMap((line) => line.evidenceExampleIds),
    ...draft.evidence.map((item) => item.exampleId), ...(draft.contextEvidence ?? []).map((item) => item.exampleId), ...referenceIds])];
  if (!ids.length) return false;
  const settings = await loadSettings(scope);
  if (settings?.enabled === false) return false;
  const today = businessDateKey();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const { data, error } = await scope.supabase.from("ai_estimate_examples")
      .select("id,document_kind,client_id,visibility,owner_user_id,ai_estimate_sources!inner(status,valid_from,valid_until)")
      .eq("organization_id", scope.orgId).in("id", batch);
    if (error || data?.length !== batch.length) return false;
    for (const row of data) {
      const source = Array.isArray(row.ai_estimate_sources) ? row.ai_estimate_sources[0] : row.ai_estimate_sources;
      if (!source || source.status !== "approved" || (source.valid_from && source.valid_from > today)
        || (source.valid_until && source.valid_until < today)
        || (row.visibility === "private" && (!settings?.allow_private_sources || row.owner_user_id !== scope.userId))
        || (row.document_kind === "price_list" && row.client_id && row.client_id !== clientId)) return false;
    }
  }
  return true;
}

const uploadTicketSchema = z.object({
  fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["application/pdf", "image/png", "image/jpeg", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/markdown"]),
  fileSize: z.number().int().positive().max(20 * 1024 * 1024), fileHash: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  title: z.string().trim().min(1).max(255), visibility: z.enum(["private", "organization"]),
}).and(aiEstimateSourceMetadataSchema);
export async function createAiEstimateUploadTicket(input: z.input<typeof uploadTicketSchema>): Promise<ActionResult<{ sourceId: string; path: string; token: string }>> {
  const parsed = uploadTicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "파일 형식, 크기와 제목을 확인해 주세요." };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "자료 등록 권한이 없습니다." };
  try {
    const settings = await loadSettings(scope);
    if (settings?.enabled === false) return { ok: false, error: "조직 설정에서 AI 견적 기능이 꺼져 있습니다." };
    if (parsed.data.visibility === "private" && !settings?.allow_private_sources) return { ok: false, error: "조직 설정에서 개인 자료가 허용되지 않았습니다." };
    if (parsed.data.fileHash) {
      let duplicateQuery = scope.supabase.from("ai_estimate_sources").select("id")
        .eq("organization_id", scope.orgId).eq("file_hash", parsed.data.fileHash).neq("status", "excluded")
        .eq("document_kind", parsed.data.documentKind).eq("project_name", parsed.data.projectName).eq("revision", parsed.data.revision);
      duplicateQuery = parsed.data.validFrom ? duplicateQuery.eq("valid_from", parsed.data.validFrom) : duplicateQuery.is("valid_from", null);
      duplicateQuery = parsed.data.validUntil ? duplicateQuery.eq("valid_until", parsed.data.validUntil) : duplicateQuery.is("valid_until", null);
      const { data: duplicate, error } = await duplicateQuery.limit(1);
      if (error) return { ok: false, error: "기존 자료를 확인하지 못했습니다." };
      if (duplicate?.length) return { ok: false, error: "같은 파일과 버전·유효기간의 자료가 이미 있습니다." };
    }
    const sourceId = randomUUID();
    const extension = ({ "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "text/csv": "csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", "text/plain": "txt", "text/markdown": "md" } as const)[parsed.data.mimeType];
    const path = `${scope.orgId}/${sourceId}/original.${extension}`;
    const { error } = await scope.supabase.from("ai_estimate_sources").insert({
      id: sourceId, organization_id: scope.orgId, source_type: "upload", title: parsed.data.title,
      document_kind: parsed.data.documentKind, project_name: parsed.data.projectName, revision: parsed.data.revision,
      valid_from: parsed.data.validFrom, valid_until: parsed.data.validUntil,
      original_file_name: parsed.data.fileName, storage_path: path, mime_type: parsed.data.mimeType,
      file_size: parsed.data.fileSize, file_hash: parsed.data.fileHash ?? null, visibility: parsed.data.visibility,
      status: "uploaded", uploaded_by: scope.userId,
    });
    if (error) return { ok: false, error: mutationError(error) };
    const { data: signed, error: signedError } = await scope.supabase.storage.from("ai-estimate-sources").createSignedUploadUrl(path);
    if (signedError || !signed) {
      await scope.supabase.from("ai_estimate_sources").delete().eq("id", sourceId).eq("uploaded_by", scope.userId);
      return { ok: false, error: "업로드 URL을 만들 수 없습니다. 다시 시도해 주세요." };
    }
    return { ok: true, data: { sourceId, path, token: signed.token } };
  } catch { return { ok: false, error: "자료 등록 설정을 확인하지 못했습니다." }; }
}

export async function completeAiEstimateUpload(sourceId: string): Promise<ActionResult> {
  if (!uuid.safeParse(sourceId).success) return { ok: false, error: "올바르지 않은 자료입니다." };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "자료 등록 권한이 없습니다." };
  const source = await editableSource(scope, sourceId);
  if (!source || source.source_type !== "upload" || !source.storage_path) return { ok: false, error: "원본 파일을 찾을 수 없습니다." };
  if (["processing", "review_required", "approved"].includes(source.status)) return { ok: true, data: undefined };
  if (source.status === "excluded") return { ok: false, error: "제외된 자료입니다. 자료함에서 복원해 주세요." };
  const { data: objects, error } = await scope.supabase.storage.from("ai-estimate-sources").list(`${scope.orgId}/${sourceId}`, { limit: 10 });
  const object = objects?.find((file) => file.name === String(source.storage_path).split("/").pop());
  if (error || !object || Number(object.metadata?.size) !== Number(source.file_size)
    || object.metadata?.mimetype !== source.mime_type) return { ok: false, error: "업로드된 원본의 형식과 크기를 확인할 수 없습니다. 파일을 다시 업로드해 주세요." };
  return queueSourceProcessing(scope, source);
}

const manualSourceSchema = z.object({
  title: z.string().trim().min(1).max(255), visibility: z.enum(["private", "organization"]),
  workDetails: z.string().trim().min(3).max(16000),
  assumptions: z.string().trim().max(4000).default(""), exclusions: z.string().trim().max(4000).default(""),
}).and(aiEstimateSourceMetadataSchema).refine((value) => isContextDocument(value.documentKind), "텍스트 자료는 설계 또는 작업 상세로 등록해 주세요.");

export async function createAiEstimateManualSource(input: unknown): Promise<ActionResult<string>> {
  const parsed = manualSourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "자료 내용을 확인해 주세요." };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "자료 등록 권한이 없습니다." };
  try {
    const settings = await loadSettings(scope);
    if (settings?.enabled === false || (parsed.data.visibility === "private" && !settings?.allow_private_sources)) {
      return { ok: false, error: "조직의 AI 자료 설정을 확인해 주세요." };
    }
    const value = parsed.data;
    const extraction = aiEstimateExtractionSchema.parse({ ...value,
      currency: "JPY", taxMode: "unknown", clientName: "", clientId: null, subject: value.title.slice(0, 70),
      issueDate: null, templateMessage: "", remarks: "", rawText: value.workDetails, confidence: 1, lines: [], warnings: [],
    });
    const { data, error } = await scope.supabase.rpc("ai_estimate_create_manual_source", {
      p_organization_id: scope.orgId, p_title: value.title, p_visibility: value.visibility,
      p_metadata: aiEstimateSourceMetadataSchema.parse(value), p_extraction: extraction,
    });
    if (error || !data) return { ok: false, error: error ? mutationError(error) : "자료를 저장하지 못했습니다." };
    refreshSource();
    return { ok: true, data: String(data) };
  } catch { return { ok: false, error: "자료를 저장하지 못했습니다. 다시 시도해 주세요." }; }
}

export async function getAiEstimateReferenceOptions(clientId: string | null = null) {
  if (!uuid.nullable().safeParse(clientId).success) return { ok: false as const, error: "Invalid client" };
  const scope = await getScope();
  if (!scope) return { ok: false as const, error: "Unauthorized" };
  try {
    const settings = await loadSettings(scope);
    if (settings?.enabled === false) return { ok: true as const, data: [] };
    const today = businessDateKey();
    const rows = await collectAllRows<{
      id: string; title: string; document_kind: "estimate" | "price_list" | "design" | "work_scope";
      project_name: string; revision: string; valid_from: string | null; valid_until: string | null; status: "approved";
      ai_estimate_examples: {client_id: string | null} | Array<{client_id: string | null}>;
    }>((from, to) => {
      let query = scope.supabase.from("ai_estimate_sources")
        .select("id,title,document_kind,project_name,revision,valid_from,valid_until,status,ai_estimate_examples!inner(client_id)")
        .eq("organization_id", scope.orgId).eq("status", "approved")
        .or(`valid_from.is.null,valid_from.lte.${today}`).or(`valid_until.is.null,valid_until.gte.${today}`);
      query = settings?.allow_private_sources
        ? query.or(`visibility.eq.organization,uploaded_by.eq.${scope.userId}`) : query.eq("visibility", "organization");
      return query.order("created_at", { ascending: false }).order("id").range(from, to);
    });
    return { ok: true as const, data: rows.filter((row) => {
      const example = Array.isArray(row.ai_estimate_examples) ? row.ai_estimate_examples[0] : row.ai_estimate_examples;
      return row.document_kind !== "price_list" || !example?.client_id || example.client_id === clientId;
    }).map((row) => ({ id: row.id, title: row.title, documentKind: row.document_kind,
      projectName: row.project_name, revision: row.revision, validFrom: row.valid_from, validUntil: row.valid_until, status: row.status })) };
  } catch { return { ok: false as const, error: "참고 자료를 불러오지 못했습니다. 다시 시도해 주세요." }; }
}
async function queueSourceProcessing(scope: Scope, source: NonNullable<Awaited<ReturnType<typeof editableSource>>>, retry = false): Promise<ActionResult> {
  const { data: extraction, error: extractionError } = await scope.supabase.from("ai_estimate_extractions").select("source_of_truth")
    .eq("source_id", source.id).maybeSingle();
  if (extractionError) return { ok: false, error: "저장된 검수 내용을 확인하지 못했습니다." };
  if (extraction?.source_of_truth === "human") return { ok: false, error: "수동 검수 내용이 저장되어 있습니다. 검수 화면에서 이어서 확인해 주세요." };
  const { data: updated, error } = await scope.supabase.from("ai_estimate_sources").update({ status: "processing", error_message: null })
    .eq("id", source.id).eq("organization_id", scope.orgId).eq("updated_at", source.updated_at)
    .in("status", ["uploaded", "failed", "review_required"]).select("id").maybeSingle();
  if (error || !updated) return { ok: false, error: "자료 상태가 변경되었습니다. 새로고침 후 확인해 주세요." };
  after(async () => {
    try { await prepareUploadedEstimateForReview(source.id, scope.userId, { retry }); }
    catch { /* The durable queue is recovered by the maintenance worker; do not overwrite human edits. */ }
  });
  refreshSource(source.id);
  return { ok: true, data: undefined };
}
export async function retryAiEstimateSource(sourceId: string): Promise<ActionResult> {
  if (!uuid.safeParse(sourceId).success) return { ok: false, error: "올바르지 않은 자료입니다." };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "자료 처리 권한이 없습니다." };
  const source = await editableSource(scope, sourceId);
  if (!source || source.source_type !== "upload" || !source.storage_path) return { ok: false, error: "재분석할 원본 파일이 없습니다." };
  if (["approved", "excluded", "processing"].includes(source.status)) return { ok: false, error: "현재 상태에서는 재분석할 수 없습니다." };
  return queueSourceProcessing(scope, source, true);
}

export async function saveAiEstimateExtraction(sourceId: string, input: unknown, expectedUpdatedAt?: string): Promise<ActionResult<AiEstimateExtraction & { updatedAt: string }>> {
  const parsed = aiEstimateExtractionSchema.safeParse(input);
  if (!uuid.safeParse(sourceId).success || !parsed.success) return { ok: false, error: parsed.success ? "올바르지 않은 자료입니다." : parsed.error.issues[0]?.message ?? "검수 내용을 확인해 주세요." };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "자료 수정 권한이 없습니다." };
  const source = await editableSource(scope, sourceId);
  if (!source) return { ok: false, error: "수정할 자료를 찾을 수 없습니다." };
  const { data: saved, error } = await scope.supabase.rpc("ai_estimate_save_review", { p_source_id: sourceId,
    p_extraction: parsed.data, p_expected_updated_at: expectedUpdatedAt ?? source.updated_at });
  if (error) return { ok: false, error: mutationError(error) };
  if (typeof saved?.updatedAt !== "string") return { ok: false, error: "저장 결과를 확인하지 못했습니다. 새로고침해 주세요." };
  refreshSource(sourceId);
  return { ok: true, data: { ...parsed.data, updatedAt: saved.updatedAt } };
}
export async function approveAiEstimateSource(sourceId: string, input: unknown, expectedUpdatedAt?: string): Promise<ActionResult> {
  const parsed = aiEstimateExtractionSchema.safeParse(input);
  if (!uuid.safeParse(sourceId).success || !parsed.success) return { ok: false, error: parsed.success ? "올바르지 않은 자료입니다." : parsed.error.issues[0]?.message ?? "검수 내용을 확인해 주세요." };
  const scope = await getScope();
  if (!scope || !isAdmin(scope.role)) return { ok: false, error: "조직 관리자만 승인할 수 있습니다." };
  if (!isContextDocument(parsed.data.documentKind) && (parsed.data.taxMode === "unknown" || parsed.data.lines.some((line) => line.unitPrice === 0 || line.qty <= 0 || line.taxCategory === "follow_company"))) return { ok: false, error: "세금 포함 여부와 모든 품목의 수량·단가를 확인해 주세요." };
  if (parsed.data.documentKind === "price_list" && parsed.data.lines.some((line) => line.unitPrice <= 0)) return { ok: false, error: "단가표에는 0보다 큰 단가를 입력해 주세요." };
  const source = await editableSource(scope, sourceId);
  if (!source) return { ok: false, error: "승인할 자료를 찾을 수 없습니다." };
  if (source.document_kind !== parsed.data.documentKind) return { ok: false, error: "등록한 자료 유형과 검수 유형이 다릅니다." };
  if (isContextDocument(parsed.data.documentKind) && parsed.data.workDetails.length < 3) return { ok: false, error: "검수한 설계·작업 내용을 입력해 주세요." };
  const { error } = await scope.supabase.rpc("ai_estimate_approve_source", { p_source_id: sourceId,
    p_extraction: parsed.data, p_expected_updated_at: expectedUpdatedAt ?? source.updated_at });
  if (error) return { ok: false, error: mutationError(error) };
  after(async () => { try { await indexApprovedEstimateSource(sourceId, scope.userId); } catch { /* Local retrieval is already committed. Reindex can retry embeddings. */ } });
  refreshSource(sourceId);
  return { ok: true, data: undefined };
}
export async function importEstimateAsAiSource(estimateId: string): Promise<ActionResult<string>> {
  if (!uuid.safeParse(estimateId).success) return { ok: false, error: "올바르지 않은 견적입니다." };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "자료 등록 권한이 없습니다." };
  const { data: estimate, error: estimateError } = await scope.supabase.from("estimates").select("id")
    .eq("id", estimateId).eq("organization_id", scope.orgId).is("deleted_at", null).maybeSingle();
  if (estimateError || !estimate) return { ok: false, error: "현재 조직의 견적을 찾을 수 없습니다." };
  const { data, error } = await scope.supabase.rpc("ai_estimate_import_document", { p_estimate_id: estimateId });
  if (error || !data) return { ok: false, error: error ? mutationError(error) : "발행한 견적을 가져오지 못했습니다." };
  refreshSource();
  return { ok: true, data: String(data) };
}
export async function maybeImportIssuedEstimateAsAiSource(estimateId: string): Promise<void> {
  const scope = await getScope();
  if (!writable(scope)) return;
  try {
    const settings = await loadSettings(scope);
    if (settings?.enabled !== false && settings?.auto_import_issued_estimates) await importEstimateAsAiSource(estimateId);
  } catch { /* Issuing remains successful if this optional library import is unavailable. */ }
}

const generationErrors = {
  ja: { no_evidence: "関連する承認済み資料がありません。作業内容を具体的にするか、AI資料庫に見積を登録して承認してください。", failed: "下書きを作成できませんでした。時間をおいて再試行してください。", disabled: "組織設定でAI見積が無効になっています。", running: "前のリクエストを処理中です。完了後に再試行してください。", limit: "本日の組織の作成上限に達しました。明日再試行するか管理者にご確認ください。", web: "公開価格調査を利用できません。組織設定と接続状態をご確認ください。", web_failed: "公開価格調査を取得できなかったため、内部資料のみで作成しました。" },
  ko: { no_evidence: "관련된 승인 자료가 없습니다. 작업 내용을 구체적으로 입력하거나 AI 자료함에 견적을 등록하고 승인해 주세요.", failed: "초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.", disabled: "조직 설정에서 AI 견적 기능이 꺼져 있습니다.", running: "이전 요청을 처리하고 있습니다. 완료 후 다시 시도해 주세요.", limit: "조직의 오늘 생성 한도에 도달했습니다. 내일 다시 시도하거나 관리자에게 확인해 주세요.", web: "웹 가격 조사를 사용할 수 없습니다. 조직 설정과 연결 상태를 확인해 주세요.", web_failed: "웹 가격 조사를 가져오지 못해 내부 자료만으로 작성했습니다." },
  en: { no_evidence: "No related approved documents were found. Describe the work more specifically or upload and approve an estimate in the AI library.", failed: "The draft could not be prepared. Please try again shortly.", disabled: "AI estimates are disabled in organization settings.", running: "Your previous request is still running. Please wait for it to finish.", limit: "The organization's daily generation limit has been reached. Try tomorrow or contact an administrator.", web: "Public price research is unavailable. Check organization settings and provider configuration.", web_failed: "Public price research was unavailable. Only internal evidence was used." },
};
export async function generateAiEstimateDraft(input: unknown): Promise<ActionResult<DraftResult>> {
  const parsed = aiDraftRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "Organization write permission required" };
  const request = parsed.data;
  const copy = generationErrors[request.locale];
  let requestId: string | null = null;
  let completed = false;
  try {
    const settings = await loadSettings(scope);
    if (settings?.enabled === false) return { ok: false, error: copy.disabled };
    if (request.clientId) {
      const { data: client, error } = await scope.supabase.from("clients").select("id")
        .eq("organization_id", scope.orgId).eq("id", request.clientId).is("deleted_at", null).maybeSingle();
      if (error || !client) return { ok: false, error: copy.failed };
    }
    if (request.useWebMarketResearch && (!settings?.allow_web_market_research || !isMarketResearchConfigured())) return { ok: false, error: copy.web };
    const canonical = { ...request, requestId: undefined };
    const fingerprint = createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
    const { data: reservation, error: reservationError } = await scope.supabase.rpc("ai_estimate_begin_generation", {
      p_organization_id: scope.orgId, p_request_key: request.requestId ?? randomUUID(), p_fingerprint: fingerprint,
    });
    if (reservationError) return { ok: false, error: reservationError.message.includes("AI_DAILY_LIMIT") ? copy.limit
      : reservationError.message.includes("AI_REQUEST_RUNNING") ? copy.running : copy.failed };
    if (reservation?.status === "succeeded" && reservation.suggestionId) {
      const { data } = await scope.supabase.from("ai_estimate_suggestions").select("suggestion_data")
        .eq("id", reservation.suggestionId).eq("organization_id", scope.orgId).eq("requested_by", scope.userId).maybeSingle();
      const stored = data?.suggestion_data;
      const draft = aiEstimateDraftSchema.safeParse(stored?.draft);
      const market = stored?.marketResearch ? aiMarketResearchResultSchema.safeParse(stored.marketResearch) : null;
      if (!draft.success || (market && !market.success)) return { ok: false, error: copy.failed };
      if (!await suggestionEvidenceIsCurrent(scope, draft.data, request.clientId, snapshotExampleIds(stored.referenceSnapshots))) throw new Error("AI_REFERENCE_UNAVAILABLE");
      return { ok: true, data: { suggestionId: reservation.suggestionId, draft: draft.data, marketResearch: market?.success ? market.data : null,
        generationMode: stored.generationMode === "model" ? "model" : "local", provider: stored.provider ?? "unknown", model: stored.model ?? "unknown" } };
    }
    if (reservation?.status !== "started") return { ok: false, error: reservation?.status === "running" ? copy.running : copy.failed };
    requestId = reservation.id;
    const search = await searchApprovedExamples({ supabase: scope.supabase, orgId: scope.orgId,
      queryText: [request.subject, request.workDescription, request.requirements].filter(Boolean).join(" "), clientId: request.clientId, sourceIds: request.sourceIds,
      allowPrivateSources: Boolean(settings?.allow_private_sources), allowExternalProcessing: Boolean(settings?.allow_external_processing),
      clientNames: [request.clientName], limit: 10 });
    if (!search.matches.length) return { ok: false, error: copy.no_evidence };
    const evidence: AiEstimateGenerationEvidence[] = search.matches.map(({ example, score }) => ({
      exampleId: example.id, sourceId: example.source_id, currency: example.currency, taxMode: example.tax_mode,
      documentKind: example.document_kind, projectName: example.project_name, revision: example.revision,
      validFrom: example.valid_from, validUntil: example.valid_until,
      workDetails: example.work_details, assumptions: example.assumptions, exclusions: example.exclusions,
      label: [example.source_title || example.subject, example.revision, example.issue_date].filter(Boolean).join(" · ").slice(0, 255), similarity: score,
      clientName: example.client_name, subject: example.subject, issueDate: example.issue_date,
      templateMessage: example.template_message, remarks: example.remarks,
      lines: example.ai_estimate_example_lines.map((line) => ({ id: line.id, name: line.name, qty: Number(line.qty),
        unit: line.unit, unitPrice: Number(line.unit_price), taxCategory: line.tax_category })),
    }));
    const priceAnchors = await getApprovedPriceAnchors({ supabase: scope.supabase, orgId: scope.orgId,
      exampleIds: evidence.map((item) => item.exampleId), clientId: request.clientId, sourceIds: request.sourceIds });
    const configuration = getAiEstimateGenerationConfig(request.provider);
    const composedPromise = composeGroundedDraft({ subject: request.subject, workDescription: request.workDescription, requirements: request.requirements,
      assumptions: request.assumptions, exclusions: request.exclusions,
      locale: request.locale, taxMode: request.taxMode, evidence, priceAnchors,
      minimumSamples: Number(settings?.minimum_price_samples ?? 3), retrievalMode: search.vectorUsed ? "hybrid" : "local",
      allowExternalProcessing: Boolean(settings?.allow_external_processing),
      generate: configuration ? () => generateAiEstimateWithProvider({ ...request, evidence, priceAnchors }) : undefined });
    // Public research receives only the separately entered public query, never internal examples.
    const marketPromise = request.useWebMarketResearch ? researchPublicMarketPrice({ publicQuery: request.publicSearchQuery,
      countryCode: request.marketCountryCode, currency: request.marketCurrency }).then((value) => ({ value, failed: false }))
      .catch(() => ({ value: null, failed: true })) : Promise.resolve({ value: null, failed: false });
    const [composed, market] = await Promise.all([composedPromise, marketPromise]);
    const draft = composed.draft;
    if (!await suggestionEvidenceIsCurrent(scope, draft, request.clientId, evidence.map((item) => item.exampleId))) throw new Error("AI_REFERENCE_UNAVAILABLE");
    if (market.failed) draft.warnings = [...draft.warnings.slice(0, 19), copy.web_failed];
    const { data: suggestion, error } = await scope.supabase.from("ai_estimate_suggestions").insert({
      organization_id: scope.orgId, requested_by: scope.userId, prompt_text: request.workDescription, request_context: request,
      suggestion_data: { draft, marketResearch: market.value, generationMode: composed.generationMode, provider: composed.provider, model: composed.model, retrieval: draft.retrieval,
        referenceSnapshots: evidence, priceAnchorSnapshot: priceAnchors, groundingPolicy: { version: 3, minimumSamples: Number(settings?.minimum_price_samples ?? 3) } },
      evidence_example_ids: [...new Set([...draft.lines.flatMap((line) => line.evidenceExampleIds), ...(draft.contextEvidence ?? []).map((item) => item.exampleId)])], provider: composed.provider, model: composed.model,
    }).select("id").single();
    if (error || !suggestion) return { ok: false, error: copy.failed };
    const { error: finishError } = await scope.supabase.rpc("ai_estimate_finish_generation", { p_request_id: requestId, p_suggestion_id: suggestion.id });
    if (finishError) return { ok: false, error: copy.failed };
    completed = true;
    if (request.useWebMarketResearch) await scope.supabase.from("ai_estimate_market_research_runs").insert({
      organization_id: scope.orgId, requested_by: scope.userId, suggestion_id: suggestion.id, public_query: request.publicSearchQuery,
      country_code: request.marketCountryCode, currency: request.marketCurrency, result_data: market.value,
      provider: "gemini-google-search", model: MARKET_RESEARCH_MODEL, status: market.failed ? "failed" : "completed",
      error_message: market.failed ? "PUBLIC_RESEARCH_UNAVAILABLE" : null,
    });
    return { ok: true, data: { suggestionId: suggestion.id, draft, marketResearch: market.value, generationMode: composed.generationMode, provider: composed.provider, model: composed.model } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("AI_REFERENCE_UNAVAILABLE")) return { ok: false, error: {
      ja: "選択資料の承認状態・有効期間・取引先の適用条件を確認してください。",
      ko: "선택한 자료의 승인 상태·유효기간·거래처 적용 조건을 확인해 주세요.",
      en: "Check the selected references' approval, validity dates and client applicability.",
    }[request.locale] };
    if (error instanceof AiDraftWorkflowError && error.code === "no_price_evidence") return { ok: false, error: {
      ja: "作業資料はありますが、単価候補がありません。承認済み単価表を追加するか、外部AI接続を確認してください。",
      ko: "작업 자료는 있지만 단가 후보가 없습니다. 승인된 단가표를 추가하거나 외부 AI 연결을 확인해 주세요.",
      en: "Work references are available, but no price candidates could be prepared. Add an approved rate card or check the AI connection.",
    }[request.locale] };
    return { ok: false, error: error instanceof AiDraftWorkflowError && error.code === "no_evidence" ? copy.no_evidence : copy.failed };
  } finally {
    if (requestId && !completed) {
      try { await scope.supabase.rpc("ai_estimate_finish_generation", { p_request_id: requestId, p_suggestion_id: null }); } catch { /* Expired reservations are recovered in the database. */ }
    }
  }
}

export async function getAiEstimateCapabilities() {
  const scope = await getScope();
  if (!scope) return { ok: false as const, error: "Unauthorized" };
  try {
    const settings = await loadSettings(scope);
    let countQuery = scope.supabase.from("ai_estimate_sources").select("id", { count: "exact", head: true })
      .eq("organization_id", scope.orgId).eq("status", "approved");
    countQuery = settings?.allow_private_sources ? countQuery.or(`visibility.eq.organization,uploaded_by.eq.${scope.userId}`) : countQuery.eq("visibility", "organization");
    const { count, error } = await countQuery;
    if (error) return { ok: false as const, error: "AI 자료를 확인하지 못했습니다." };
    const config = getAiEstimateGenerationConfig();
    return { ok: true as const, data: { enabled: settings?.enabled !== false, canWrite: canWriteOrganizationBusinessData(scope.role),
      approvedSourceCount: count ?? 0, modelGenerationProvider: config?.provider ?? null, modelGenerationConfigured: Boolean(config),
      modelGenerationModel: config?.model ?? null, externalProcessingAllowed: Boolean(settings?.allow_external_processing),
      extractionConfigured: isExtractionConfigured(),
      providerOptions: (["gemini", "anthropic"] as const).flatMap((provider) => { const option = getAiEstimateGenerationConfig(provider); return option ? [{ provider, model: option.model }] : []; }), vectorSearchConfigured: isQueryEmbeddingConfigured(),
      webMarketResearchAllowed: Boolean(settings?.allow_web_market_research), webMarketResearchConfigured: isMarketResearchConfigured(),
      allowPrivateSources: Boolean(settings?.allow_private_sources), minimumPriceSamples: Number(settings?.minimum_price_samples ?? 3) } };
  } catch { return { ok: false as const, error: "AI 설정을 확인하지 못했습니다." }; }
}
export async function getAiEstimateRecommendations(clientId: string | null, taxMode: "included" | "excluded" = "excluded") {
  if (!uuid.nullable().safeParse(clientId).success || !["included", "excluded"].includes(taxMode)) return { ok: false as const, error: "Invalid request" };
  const scope = await getScope();
  if (!scope) return { ok: false as const, error: "Unauthorized" };
  try {
    const settings = await loadSettings(scope);
    if (settings?.enabled === false) return { ok: true as const, data: [] };
    const anchors = await getApprovedPriceAnchors({ supabase: scope.supabase, orgId: scope.orgId, clientId, exampleIds: [], allApproved: true });
    const seen = new Set<string>();
    const data = anchors.filter((anchor) => {
      if (anchor.taxMode !== taxMode || anchor.currency !== "JPY" || anchor.sampleCount < Number(settings?.minimum_price_samples ?? 3)) return false;
      const key = [anchor.normalizedName, anchor.unit, anchor.taxCategory].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8).map(({ name, unit, taxCategory, taxMode, currency, scope, sampleCount, medianPrice, p25Price, p75Price }) =>
      ({ name, unit, taxCategory, taxMode, currency, scope, sampleCount, medianPrice, p25Price, p75Price }));
    return { ok: true as const, data };
  } catch { return { ok: false as const, error: "가격 통계를 확인하지 못했습니다." }; }
}
export async function validateAiEstimateSuggestion(suggestionId: string): Promise<ActionResult> {
  if (!uuid.safeParse(suggestionId).success) return { ok: false, error: "Invalid suggestion" };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "Organization write permission required" };
  const { data: suggestion, error: readError } = await scope.supabase.from("ai_estimate_suggestions")
    .select("suggestion_data,request_context").eq("id", suggestionId).eq("organization_id", scope.orgId).eq("requested_by", scope.userId).maybeSingle();
  const draft = aiEstimateDraftSchema.safeParse(suggestion?.suggestion_data?.draft);
  if (readError || !draft.success || !await suggestionEvidenceIsCurrent(scope, draft.data, suggestion?.request_context?.clientId ?? null,
    snapshotExampleIds(suggestion?.suggestion_data?.referenceSnapshots))) {
    return { ok: false, error: "참고 자료가 변경되었거나 유효하지 않습니다. 새 초안을 만들어 주세요." };
  }
  return { ok: true, data: undefined };
}
export async function markAiEstimateSuggestionApplied(suggestionId: string): Promise<ActionResult> {
  if (!uuid.safeParse(suggestionId).success) return { ok: false, error: "Invalid suggestion" };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "Organization write permission required" };
  const { data, error } = await scope.supabase.from("ai_estimate_suggestions").update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", suggestionId).eq("organization_id", scope.orgId).eq("requested_by", scope.userId).in("status", ["generated", "applied"])
    .select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "적용 기록을 저장하지 못했습니다." };
  return { ok: true, data: undefined };
}
const settingsSchema = z.object({ enabled: z.boolean(), allowPrivateSources: z.boolean(), minimumPriceSamples: z.number().int().min(1).max(20),
  autoImportIssuedEstimates: z.boolean(), sourceRetentionDays: z.number().int().min(30).max(36500).nullable(), allowWebMarketResearch: z.boolean(),
  allowExternalProcessing: z.boolean().default(false), dailyGenerationLimit: z.number().int().min(1).max(1000).default(100) });
export async function saveAiEstimateSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const scope = await getScope();
  if (!scope || !isAdmin(scope.role)) return { ok: false, error: "조직 관리자만 설정할 수 있습니다." };
  const { error } = await scope.supabase.from("ai_estimate_settings").upsert({ organization_id: scope.orgId,
    enabled: parsed.data.enabled, allow_private_sources: parsed.data.allowPrivateSources, minimum_price_samples: parsed.data.minimumPriceSamples,
    auto_import_issued_estimates: parsed.data.autoImportIssuedEstimates, source_retention_days: parsed.data.sourceRetentionDays,
    allow_web_market_research: parsed.data.allowWebMarketResearch, allow_external_processing: parsed.data.allowExternalProcessing,
    daily_generation_limit: parsed.data.dailyGenerationLimit });
  if (error) return { ok: false, error: "AI 설정을 저장하지 못했습니다." };
  revalidatePath("/[lang]/settings/ai-estimates", "page");
  refreshSource();
  return { ok: true, data: undefined };
}
export async function deleteAiEstimateSource(sourceId: string): Promise<ActionResult> {
  return changeSourceVisibility(sourceId, "excluded");
}
export async function restoreAiEstimateSource(sourceId: string): Promise<ActionResult> {
  return changeSourceVisibility(sourceId, "review_required");
}
async function changeSourceVisibility(sourceId: string, status: "excluded" | "review_required"): Promise<ActionResult> {
  if (!uuid.safeParse(sourceId).success) return { ok: false, error: "Invalid source" };
  const scope = await getScope();
  if (!writable(scope)) return { ok: false, error: "자료 변경 권한이 없습니다." };
  const source = await editableSource(scope, sourceId);
  if (!source) return { ok: false, error: "변경할 자료를 찾을 수 없습니다." };
  if (status === "review_required" && source.status !== "excluded") return { ok: false, error: "제외된 자료만 복원할 수 있습니다." };
  const { data, error } = await scope.supabase.from("ai_estimate_sources").update({ status, error_message: null })
    .eq("id", sourceId).eq("organization_id", scope.orgId).eq("updated_at", source.updated_at).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "자료 상태가 변경되었습니다. 새로고침 후 다시 시도해 주세요." };
  refreshSource(sourceId);
  return { ok: true, data: undefined };
}
