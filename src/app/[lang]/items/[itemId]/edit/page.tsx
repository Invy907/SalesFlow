import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ItemForm, type ItemFormValues } from "../../item-form";
import type { TaxCategory } from "@/lib/tax";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ lang: string; itemId: string }>;
}) {
  const { lang, itemId } = await params;
  await requireActiveOrg(lang);

  const supabase = await getSupabaseServerClient();
  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .is("deleted_at", null)
    .single();

  if (!item) notFound();

  const initial: ItemFormValues = {
    id: item.id as string,
    name: (item.name as string) ?? "",
    unit: (item.unit as string) ?? "",
    unitPrice: String(item.unit_price ?? ""),
    taxCategory: (item.tax_category as TaxCategory) ?? "follow_company",
    withholdingExempt: Boolean(item.withholding_exempt),
  };

  return <ItemForm initial={initial} />;
}
