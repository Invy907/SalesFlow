import { buildNewEstimateInitial } from "../estimate-form-data";
import { EstimateFormClient } from "../estimate-form-client";

export const dynamic = "force-dynamic";

export default async function NewEstimatePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { lang } = await params;
  const { clientId } = await searchParams;
  const { initial, clients, items } = await buildNewEstimateInitial(lang, clientId);
  return <EstimateFormClient initial={initial} clients={clients} items={items} />;
}
