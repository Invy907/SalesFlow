import { canWriteOrganizationBusinessData } from "@/lib/organization-permissions";
import { getClientOptions } from "@/lib/db/clients";
import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getAiEstimateSource } from "@/lib/db/ai-estimates";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { aiEstimateExtractionSchema } from "@/lib/ai/estimates/schemas";
import { AiEstimateReviewClient } from "./ai-estimate-review-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function AiEstimateReviewPage({ params }: { params: Promise<{ lang: string; sourceId: string }> }) {
  const { lang, sourceId } = await params;
  const scope = await requireActiveOrg(lang);
  let source;
  try {
    source = await getAiEstimateSource(scope.orgId, sourceId);
  } catch {
    notFound();
  }

  const clients = await getClientOptions(scope.orgId);
  const parsed = aiEstimateExtractionSchema.safeParse(source.ai_estimate_extractions[0]?.extracted_data);
  const extractionMeta = source.ai_estimate_extractions[0];
  const batchReviewReasons = source.ai_estimate_jobs[0]?.review_reasons ?? [];
  let originalUrl: string | null = null;
  if (source.storage_path) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.storage.from("ai-estimate-sources").createSignedUrl(source.storage_path, 600);
    originalUrl = data?.signedUrl ?? null;
  }

  return (
    <AiEstimateReviewClient
      key={`${source.id}:${extractionMeta?.id ?? "none"}:${source.status}`}
      source={source}
      clients={clients.map(({ id, name }) => ({ id, name }))}
      initialExtraction={parsed.success ? parsed.data : null}
      originalUrl={originalUrl}
      canEdit={canWriteOrganizationBusinessData(scope.role) && (source.uploaded_by === scope.userId || scope.role === "owner" || scope.role === "admin")}
      canApprove={scope.role === "owner" || scope.role === "admin"}
      batchReviewReasons={batchReviewReasons}
      extractionProvider={extractionMeta?.provider ?? null}
      extractionConfidence={extractionMeta?.provider === "human" ? null : extractionMeta?.confidence ?? null}
    />
  );
}
