import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getCompanyProfile } from "@/lib/db/company";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TAX_CATEGORY_TO_LABEL } from "@/lib/tax";
import NewOrderFormClient, { type OrderFormInitial } from "./new-order-form-client";

export const dynamic = "force-dynamic";

export default async function NewOrderFormPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ copyFrom?: string }> }) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const profile = await getCompanyProfile(scope.orgId);
  const { copyFrom } = await searchParams;
  let initial: OrderFormInitial | undefined;
  if (copyFrom) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.from("order_forms").select("*, order_form_line_items(*)")
      .eq("id", copyFrom).eq("organization_id", scope.orgId).is("deleted_at", null).maybeSingle();
    if (error || !data) notFound();
    initial = {
      name: data.name ?? "", subject: data.subject ?? "", expirationMode: data.expiration_mode === "date" ? "date" : "none", expirationDate: data.expiration_date ?? "",
      rows: data.order_form_line_items.sort((a, b) => a.line_no - b.line_no).map((line) => ({ name: line.name_snapshot, unit: line.unit_snapshot ?? "", price: String(line.unit_price_snapshot), tax: TAX_CATEGORY_TO_LABEL[line.tax_category] })),
    };
  }
  return <NewOrderFormClient key={copyFrom ?? "new"} companyName={profile?.company_name_line1 ?? ""} hasLogo={Boolean(profile?.logo_path)} initial={initial} />;
}
