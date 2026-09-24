import type { AiDraftApplyOptions } from "@/lib/ai/estimates/apply-draft";

/** Replacing all lines replaces their evidence; text-only changes retain line evidence. */
export function nextAppliedSuggestionIds(current: string[], suggestionId: string, options: Pick<AiDraftApplyOptions, "mode" | "lineIndexes">): string[] | null {
  const next = options.mode === "replace" && options.lineIndexes.length > 0
    ? [suggestionId]
    : [...new Set([...current, suggestionId])];
  return next.length <= 20 ? next : null;
}
