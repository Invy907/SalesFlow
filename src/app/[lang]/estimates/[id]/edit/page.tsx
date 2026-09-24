import { notFound } from "next/navigation";
import { buildEditEstimateInitial } from "../../estimate-form-data";
import { EstimateFormClient } from "../../estimate-form-client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function EstimateEditPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const data = await buildEditEstimateInitial(lang, id);
  if (!data) notFound();
  return <EstimateFormClient initial={data.initial} clients={data.clients} items={data.items} />;
}
