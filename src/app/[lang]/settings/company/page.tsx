import { requireActiveOrg } from "@/lib/guards";
import { getCompanyProfile } from "@/lib/db/company";
import SettingsCompanyPageClient from "./company-form-client";

export const dynamic = "force-dynamic";

export default async function SettingsCompanyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const profile = await getCompanyProfile(scope.orgId);

  const initial = {
    orgId: scope.orgId,
    postalCode: profile?.postal_code ?? "",
    addressLine1: profile?.address_line1 ?? "",
    addressLine2: profile?.address_line2 ?? "",
    addressLine3: profile?.address_line3 ?? "",
    companyNameLine1: profile?.company_name_line1 ?? "",
    companyNameLine2: profile?.company_name_line2 ?? "",
    companyNameLine3: profile?.company_name_line3 ?? "",
    tel: profile?.tel ?? "",
    fax: profile?.fax ?? "",
    email: profile?.email ?? "",
    invoiceRegistrationNumber: profile?.invoice_registration_number ?? "",
    representativeName: profile?.representative_name ?? "",
  };

  return <SettingsCompanyPageClient initial={initial} />;
}
