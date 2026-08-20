import { requireActiveOrg } from "@/lib/guards";
import { getDocumentDefaults } from "@/lib/db/company";
import { DocumentDefaultsFormClient } from "./document-defaults-form-client";

export const dynamic = "force-dynamic";

export default async function SettingsDocumentDefaultsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const defaults = await getDocumentDefaults(scope.orgId);

  const initial = {
    numberingRule: defaults?.numbering_rule ?? "{Y}{M}{D}-{連番:M,3}",
    estimateMessage: defaults?.estimate_message ?? "",
    estimateRemarks: defaults?.estimate_remarks ?? "",
    invoiceMessage: defaults?.invoice_message ?? "",
    invoiceRemarks: defaults?.invoice_remarks ?? "",
    taxDisplayDefault: defaults?.tax_display_default ?? "separate",
    taxRoundingDefault: defaults?.tax_rounding_default ?? "round_down",
  };

  return <DocumentDefaultsFormClient initial={initial} />;
}
