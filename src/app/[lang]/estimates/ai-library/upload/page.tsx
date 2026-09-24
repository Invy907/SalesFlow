import { canWriteOrganizationBusinessData } from "@/lib/organization-permissions";
import { getAiEstimateCapabilities } from "@/lib/actions/ai-estimates";
import { requireActiveOrg } from "@/lib/guards";
import { AiEstimateUploadClient } from "./ai-estimate-upload-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function AiEstimateUploadPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const capabilities = await getAiEstimateCapabilities();
  return <AiEstimateUploadClient canUpload={canWriteOrganizationBusinessData(scope.role) && capabilities.ok && capabilities.data.enabled} allowPrivate={capabilities.ok && capabilities.data.allowPrivateSources} automaticExtraction={capabilities.ok && capabilities.data.externalProcessingAllowed && capabilities.data.extractionConfigured} />;
}
