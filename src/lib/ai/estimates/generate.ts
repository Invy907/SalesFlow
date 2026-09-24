import "server-only";
import { buildAiEstimateGenerationContext, type AiEstimateGenerationEvidence, type AiEstimatePriceAnchor } from "./generation-core";
import { generationConfig, requestGeneratedEstimate, AiGenerationError, type RequestedGenerationProvider } from "./generation-provider";

export function getAiEstimateGenerationConfig(provider?: RequestedGenerationProvider) { return generationConfig(process.env, provider); }
export function isAiEstimateGenerationConfigured(provider?: RequestedGenerationProvider) { return getAiEstimateGenerationConfig(provider) !== null; }
export const AI_ESTIMATE_GENERATION_MODEL = getAiEstimateGenerationConfig()?.model ?? null;

export async function generateAiEstimateWithProvider(input: {
  clientName: string; subject: string; workDescription: string;
  evidence: AiEstimateGenerationEvidence[]; priceAnchors: AiEstimatePriceAnchor[];
  locale?: "ja" | "ko" | "en"; taxMode?: "included" | "excluded";
  provider?: RequestedGenerationProvider;
  requirements?: string; assumptions?: string; exclusions?: string;
}) {
  const config = getAiEstimateGenerationConfig(input.provider);
  if (!config) throw new AiGenerationError("configuration");
  const context = buildAiEstimateGenerationContext(input);
  return requestGeneratedEstimate(config, { ...context, language: input.locale ?? "ja", currency: "JPY", targetTaxMode: input.taxMode ?? "excluded" });
}
