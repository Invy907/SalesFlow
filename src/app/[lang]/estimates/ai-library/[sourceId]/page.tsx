import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getAiEstimateSource } from "@/lib/db/ai-estimates";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { aiEstimateExtractionSchema } from "@/lib/ai/estimates/schemas";
import { AiEstimateReviewClient } from "./ai-estimate-review-client";

export const dynamic = "force-dynamic";

export default async function AiEstimateReviewPage({ params }: { params: Promise<{ lang: string; sourceId: string }> }) {
  const { lang, sourceId } = await params;
  const scope = await requireActiveOrg(lang);
  let source;
  try {
    source = await getAiEstimateSource(scope.orgId, sourceId);
  } catch {
    notFound();
  }

  const parsed = aiEstimateExtractionSchema.safeParse(source.ai_estimate_extractions[0]?.extracted_data);
  let originalUrl: string | null = null;
  if (source.storage_path) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.storage.from("ai-estimate-sources").createSignedUrl(source.storage_path, 600);
    originalUrl = data?.signedUrl ?? null;
  }

  return (
    <AiEstimateReviewClient
      source={source}
      initialExtraction={parsed.success ? parsed.data : null}
      originalUrl={originalUrl}
      canEdit={source.uploaded_by === scope.userId || scope.role === "owner" || scope.role === "admin"}
      canApprove={scope.role === "owner" || scope.role === "admin"}
    />
  );
}
