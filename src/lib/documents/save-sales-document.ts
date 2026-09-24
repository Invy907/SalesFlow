import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { LineItemInput } from "@/lib/validators/document";

/** The database transaction owns both the header and its ordered line items. */
export async function saveSalesDocument(
  supabase: SupabaseClient<Database>,
  kind: "estimate" | "invoice" | "delivery_note" | "receipt",
  document: Record<string, Json | undefined>,
  lines: LineItemInput[],
  id?: string,
  aiSuggestionIds?: string[],
) {
  const payload = {
    _kind: kind,
    _id: id ?? null,
    _document: Object.fromEntries(Object.entries(document).filter(([, value]) => value !== undefined)) as Json,
    _lines: lines.map((line) => ({
      item_id: line.itemId ?? null,
      name_snapshot: line.name,
      qty: line.qty,
      unit_snapshot: line.unit ?? null,
      unit_price_snapshot: line.unitPrice,
      tax_category: line.taxCategory,
      withholding_exempt_snapshot: line.withholdingExempt ?? false,
    })),
  };
  const { data, error } = kind === "estimate" && aiSuggestionIds?.length
    ? await (supabase as unknown as SupabaseClient).rpc("save_estimate_with_ai_evidence", {
      _document: payload._document, _lines: payload._lines, _id: payload._id, _suggestion_ids: [...new Set(aiSuggestionIds)],
    })
    : await supabase.rpc("save_sales_document", payload);
  return { data: data ? { id: data } : null, error };
}
