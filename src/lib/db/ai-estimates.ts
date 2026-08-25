import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function asUntyped(client: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  return client as unknown as SupabaseClient;
}

export type AiEstimateSourceListItem = {
  id: string;
  source_type: "upload" | "estimate";
  title: string;
  original_file_name: string | null;
  status: "uploaded" | "processing" | "review_required" | "approved" | "failed" | "excluded";
  visibility: "private" | "organization";
  error_message: string | null;
  created_at: string;
  approved_at: string | null;
};

export type AiEstimateSourceDetail = AiEstimateSourceListItem & {
  organization_id: string;
  storage_path: string | null;
  mime_type: string | null;
  uploaded_by: string;
  imported_estimate_id: string | null;
  ai_estimate_extractions: Array<{
    id: string;
    extracted_data: unknown;
    confidence: number | null;
    provider: string | null;
    model: string | null;
  }>;
  ai_estimate_jobs: Array<{
    status: string;
    review_reasons: string[] | null;
  }>;
};

export type AiPriceStat = {
  id: string;
  display_name: string;
  normalized_name: string;
  sample_count: number;
  median_price: number;
  p25_price: number;
  p75_price: number;
  last_used_at: string | null;
};

export async function getAiEstimateSources(orgId: string) {
  const supabase = asUntyped(await getSupabaseServerClient());
  const { data, error } = await supabase
    .from("ai_estimate_sources")
    .select("id, source_type, title, original_file_name, status, visibility, error_message, created_at, approved_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AiEstimateSourceListItem[];
}

export async function getAiEstimateSource(orgId: string, sourceId: string) {
  const supabase = asUntyped(await getSupabaseServerClient());
  const { data, error } = await supabase
    .from("ai_estimate_sources")
    .select("*, ai_estimate_extractions(id, extracted_data, confidence, provider, model), ai_estimate_jobs(status, review_reasons)")
    .eq("organization_id", orgId)
    .eq("id", sourceId)
    .single();

  if (error) throw new Error(error.message);
  const raw = data as Omit<AiEstimateSourceDetail, "ai_estimate_extractions" | "ai_estimate_jobs"> & {
    ai_estimate_extractions:
      | AiEstimateSourceDetail["ai_estimate_extractions"]
      | AiEstimateSourceDetail["ai_estimate_extractions"][number]
      | null;
    ai_estimate_jobs:
      | AiEstimateSourceDetail["ai_estimate_jobs"]
      | AiEstimateSourceDetail["ai_estimate_jobs"][number]
      | null;
  };
  const extraction = raw.ai_estimate_extractions;
  const jobs = raw.ai_estimate_jobs;
  return {
    ...raw,
    ai_estimate_extractions: Array.isArray(extraction) ? extraction : extraction ? [extraction] : [],
    ai_estimate_jobs: Array.isArray(jobs) ? jobs : jobs ? [jobs] : [],
  } as AiEstimateSourceDetail;
}

export async function getAiPriceStats(orgId: string, clientId?: string | null, limit = 12) {
  const supabase = asUntyped(await getSupabaseServerClient());
  let query = supabase
    .from("ai_estimate_price_stats")
    .select("id, display_name, normalized_name, sample_count, median_price, p25_price, p75_price, last_used_at")
    .eq("organization_id", orgId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AiPriceStat[];
}

export async function getAiEstimateSettings(orgId: string) {
  const supabase = asUntyped(await getSupabaseServerClient());
  const { data, error } = await supabase
    .from("ai_estimate_settings")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as
    | {
        enabled: boolean;
        allow_private_sources: boolean;
        minimum_price_samples: number;
        auto_import_issued_estimates: boolean;
        source_retention_days: number | null;
        allow_web_market_research: boolean;
      }
    | null;
}
