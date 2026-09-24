import { collectAllRows } from "./paginate";
import { getApprovedPriceAnchors } from "@/lib/ai/estimates/hybrid-search";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function asUntyped(client: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  return client as unknown as SupabaseClient;
}

export type AiEstimateSourceListItem = {
  id: string;
  source_type: "upload" | "estimate" | "manual";
  linked_client_id?: string | null;
  document_kind: "estimate" | "price_list" | "design" | "work_scope";
  project_name: string;
  revision: string;
  valid_from: string | null;
  valid_until: string | null;
  title: string;
  original_file_name: string | null;
  status: "uploaded" | "processing" | "review_required" | "approved" | "failed" | "excluded";
  visibility: "private" | "organization";
  error_message: string | null;
  created_at: string;
  updated_at: string;
  file_purged_at: string | null;
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
  unit: string | null;
  tax_category: string;
  tax_mode: "included" | "excluded" | "unknown";
  currency: string;
  sample_count: number;
  median_price: number;
  p25_price: number;
  p75_price: number;
  last_used_at: string | null;
};

export async function getAiEstimateSources(orgId: string) {
  const supabase = asUntyped(await getSupabaseServerClient());
  type SourceRow = AiEstimateSourceListItem & { ai_estimate_examples: { client_id: string | null } | Array<{ client_id: string | null }> | null };
  const rows = await collectAllRows<SourceRow>((from, to) => supabase
    .from("ai_estimate_sources")
    .select("id, source_type, document_kind, project_name, revision, valid_from, valid_until, title, original_file_name, status, visibility, error_message, created_at, updated_at, file_purged_at, approved_at, ai_estimate_examples!ai_estimate_examples_source_id_fkey(client_id)")
    .eq("organization_id", orgId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to));
  return rows.map(({ ai_estimate_examples: examples, ...source }) => {
    // source_id is unique; reapproval replaces that example and invalidation deletes it.
    const approved = Array.isArray(examples) ? examples[0] : examples;
    return { ...source, linked_client_id: source.status === "approved" ? approved?.client_id ?? null : null };
  });
}

export async function getAiEstimateSource(orgId: string, sourceId: string) {
  const supabase = asUntyped(await getSupabaseServerClient());
  const { data, error } = await supabase
    .from("ai_estimate_sources")
    .select("*, ai_estimate_extractions(id, extracted_data, confidence, provider, model), ai_estimate_jobs!ai_estimate_jobs_source_id_fkey(status, review_reasons)")
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
  let extraction = raw.ai_estimate_extractions;
  // Shared, approved evidence is readable even when the original review record is owner-only.
  // Keep the same RLS client; this never grants access to another user's private source.
  if ((!extraction || (Array.isArray(extraction) && !extraction.length)) && raw.status === "approved" && raw.visibility === "organization") {
    const { data: example, error: exampleError } = await supabase.from("ai_estimate_examples")
      .select("*, ai_estimate_example_lines(*)").eq("organization_id", orgId).eq("source_id", sourceId).maybeSingle();
    if (exampleError) throw new Error("Approved evidence could not be loaded");
    if (example) extraction = [{ id: example.id, confidence: null, provider: "human", model: "approved-snapshot",
      extracted_data: { documentKind: example.document_kind ?? "estimate", workDetails: example.work_details ?? "", assumptions: example.assumptions ?? "", exclusions: example.exclusions ?? "", currency: example.currency, taxMode: example.tax_mode, clientName: example.client_name ?? "",
        clientId: example.client_id, subject: example.subject ?? "", issueDate: example.issue_date,
        templateMessage: example.template_message ?? "", remarks: example.remarks ?? "", rawText: "", confidence: 1, warnings: [],
        lines: (example.ai_estimate_example_lines as Array<{ line_no: number; name: string; qty: number; unit: string | null; unit_price: number; tax_category: string }>)
          .sort((a, b) => a.line_no - b.line_no).map((line) => ({ name: line.name, qty: Number(line.qty), unit: line.unit ?? "",
            unitPrice: Number(line.unit_price), taxCategory: line.tax_category, confidence: 1, reason: "" })) } }];
  }
  const jobs = raw.ai_estimate_jobs;
  return {
    ...raw,
    ai_estimate_extractions: Array.isArray(extraction) ? extraction : extraction ? [extraction] : [],
    ai_estimate_jobs: Array.isArray(jobs) ? jobs : jobs ? [jobs] : [],
  } as AiEstimateSourceDetail;
}

export async function getAiPriceStats(orgId: string, clientId?: string | null, limit = 12) {
  const supabase = asUntyped(await getSupabaseServerClient());
  const anchors = await getApprovedPriceAnchors({ supabase, orgId, exampleIds: [], clientId: clientId ?? null, allApproved: true });
  return anchors.filter((anchor) => anchor.scope === (clientId ? "client" : "company")).slice(0, limit).map((anchor) => ({
    id: [anchor.normalizedName, anchor.unit, anchor.taxCategory, anchor.taxMode, anchor.currency].join("|"),
    display_name: anchor.name, normalized_name: anchor.normalizedName, unit: anchor.unit, tax_category: anchor.taxCategory,
    tax_mode: anchor.taxMode, currency: anchor.currency, sample_count: anchor.sampleCount, median_price: anchor.medianPrice,
    p25_price: anchor.p25Price, p75_price: anchor.p75Price, last_used_at: null,
  })) satisfies AiPriceStat[];
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
        allow_external_processing: boolean;
        daily_generation_limit: number;
      }
    | null;
}
