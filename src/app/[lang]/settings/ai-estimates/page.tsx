import { getAiEstimateCapabilities } from "@/lib/actions/ai-estimates";
import { requireActiveOrg } from "@/lib/guards";
import { getAiEstimateSettings } from "@/lib/db/ai-estimates";
import { AiEstimateSettingsForm } from "./ai-estimate-settings-form";

export const dynamic = "force-dynamic";

export default async function AiEstimateSettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const [settings, capabilities] = await Promise.all([getAiEstimateSettings(scope.orgId), getAiEstimateCapabilities()]);
  return (
    <AiEstimateSettingsForm
      initial={{
        allowExternalProcessing: settings?.allow_external_processing ?? false,
        dailyGenerationLimit: settings?.daily_generation_limit ?? 100,
        enabled: settings?.enabled ?? true,
        allowPrivateSources: settings?.allow_private_sources ?? false,
        minimumPriceSamples: settings?.minimum_price_samples ?? 3,
        autoImportIssuedEstimates: settings?.auto_import_issued_estimates ?? false,
        sourceRetentionDays: settings?.source_retention_days ?? null,
        allowWebMarketResearch: settings?.allow_web_market_research ?? false,
      }}
      providerOptions={capabilities.ok ? capabilities.data.providerOptions : []}
      providerConfigured={capabilities.ok && capabilities.data.modelGenerationConfigured}
      extractionConfigured={capabilities.ok && capabilities.data.extractionConfigured}
      canEdit={scope.role === "owner" || scope.role === "admin"}
    />
  );
}
