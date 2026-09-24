import type { BatchEnv } from "./batch/env";
import type { SourceDocumentKind } from "./batch/extraction-schema";

/** Build background scope explicitly; never inherit another organization's CLI defaults. */
export function sourceProcessingEnv(organizationId: string, actorUserId: string): BatchEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error("Supabase background processing is not configured.");
  return {
    supabaseUrl, supabaseServiceRoleKey, organizationId, actorUserId,
    sourceDir: null, storageBucket: "ai-estimate-sources", concurrency: 1, maxRetry: 3,
    confidenceThreshold: 0.8, totalToleranceMinorUnits: 1,
    inputUsdPerMillionTokens: 0.3, outputUsdPerMillionTokens: 2.5,
  };
}

export function manualReviewScaffold(title: string, documentKind: SourceDocumentKind = "estimate", warning?: string) {
  return {
    documentKind, workDetails: "", assumptions: "", exclusions: "",
    clientName: "", clientId: null, subject: title.slice(0, 70), issueDate: null,
    currency: "JPY", taxMode: "unknown", templateMessage: "", remarks: "", rawText: "", confidence: 0,
    lines: documentKind === "design" || documentKind === "work_scope" ? [] : [{ name: "확인 필요", qty: 1, unit: "", unitPrice: 0, taxCategory: "follow_company", confidence: 0, reason: "원본 자료의 품목명, 수량, 단가와 세금 구분을 입력해 주세요." }],
    warnings: [warning ?? "외부 AI 추출이 비활성화되어 있습니다. 자동 추출된 내용이 아니므로 원본을 보며 입력하고 검수해 주세요."],
  };
}
