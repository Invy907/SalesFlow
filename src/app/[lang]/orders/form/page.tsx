import { redirect } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseListInteger } from "@/lib/document-list-state";
import { OrderFormsClient } from "./order-forms-client";

export const dynamic = "force-dynamic";

export default async function OrderFormPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ page?: string }> }) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const page = parseListInteger((await searchParams).page, 1);
  const pageSize = 30;
  const supabase = await getSupabaseServerClient();
  const { data, count, error } = await supabase.from("order_forms")
    .select("id, name, subject, expiration_date, is_published, created_at, order_form_line_items(name_snapshot, unit_snapshot, unit_price_snapshot, line_no)", { count: "exact" })
    .eq("organization_id", scope.orgId).is("deleted_at", null)
    .order("created_at", { ascending: false }).order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  if (page > totalPages) redirect(`/${lang}/orders/form?page=${totalPages}`);
  return <OrderFormsClient rows={data ?? []} page={page} totalPages={totalPages} />;
}
