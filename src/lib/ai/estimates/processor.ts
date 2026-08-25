import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Safe default processor. It never sends a customer's document outside SalesFlow.
 * A separately approved provider adapter can replace this boundary later.
 */
export async function prepareUploadedEstimateForReview(sourceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: source, error } = await supabase
    .from("ai_estimate_sources")
    .select("id, organization_id, title")
    .eq("id", sourceId)
    .single();

  if (error || !source) throw new Error(error?.message ?? "AI source not found");

  const placeholder = {
    clientName: "",
    clientId: null,
    subject: source.title,
    issueDate: null,
    templateMessage: "",
    remarks: "",
    rawText: "",
    confidence: 0,
    lines: [
      {
        name: "확인 필요",
        qty: 1,
        unit: "",
        unitPrice: 0,
        taxCategory: "standard_10",
        confidence: 0,
        reason: "원본 견적을 확인해 주세요.",
      },
    ],
    warnings: ["외부 AI 전송이 비활성화되어 있습니다. 원본을 보며 추출 내용을 검수해 주세요."],
  };

  const { error: extractionError } = await supabase.from("ai_estimate_extractions").upsert(
    {
      organization_id: source.organization_id,
      source_id: source.id,
      extracted_data: placeholder,
      confidence: 0,
      provider: "manual-review",
      model: null,
      source_of_truth: "legacy",
    },
    { onConflict: "source_id" },
  );
  if (extractionError) throw new Error(extractionError.message);

  const { error: statusError } = await supabase
    .from("ai_estimate_sources")
    .update({ status: "review_required", error_message: null })
    .eq("id", sourceId);
  if (statusError) throw new Error(statusError.message);
}
