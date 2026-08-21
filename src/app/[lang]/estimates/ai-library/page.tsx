import { requireActiveOrg } from "@/lib/guards";
import { getAiEstimateSources, getAiPriceStats } from "@/lib/db/ai-estimates";
import { AiEstimateLibraryClient } from "./ai-library-client";

export const dynamic = "force-dynamic";

export default async function AiEstimateLibraryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const [sources, priceStats] = await Promise.all([
    getAiEstimateSources(scope.orgId),
    getAiPriceStats(scope.orgId, null, 8),
  ]);
  return <AiEstimateLibraryClient sources={sources} priceStats={priceStats} />;
}
