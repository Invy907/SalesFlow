import { requireActiveOrg } from "@/lib/guards";
import { AiEstimateUploadClient } from "./ai-estimate-upload-client";

export const dynamic = "force-dynamic";

export default async function AiEstimateUploadPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  await requireActiveOrg(lang);
  return <AiEstimateUploadClient />;
}
