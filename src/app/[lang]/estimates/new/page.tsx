import { buildNewEstimateInitial } from "../estimate-form-data";
import { EstimateFormClient } from "../estimate-form-client";

export const dynamic = "force-dynamic";

export default async function NewEstimatePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { initial, clients } = await buildNewEstimateInitial(lang);
  return <EstimateFormClient initial={initial} clients={clients} />;
}
