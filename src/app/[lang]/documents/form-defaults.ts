import "server-only";

import { getCompanyProfile, getDocumentDefaults } from "@/lib/db/company";
import { getDocumentSealUrl } from "@/lib/documents/seal-url";
import type { TaxDisplay, TaxRounding } from "@/lib/tax";
import { getTodayDateValue } from "../estimates/date-field-utils";

export async function getSimpleDocumentDefaults(orgId: string, type: "delivery_note" | "receipt") {
  const [profile, defaults] = await Promise.all([getCompanyProfile(orgId), getDocumentDefaults(orgId)]);
  return {
    issueDate: getTodayDateValue(),
    senderCompanyName: profile?.company_name_line1 ?? "",
    sender: {
      postalCode: profile?.postal_code ?? "", addressLine1: profile?.address_line1 ?? "",
      addressLine2: profile?.address_line2 ?? "", addressLine3: profile?.address_line3 ?? "",
      tel: profile?.tel ?? "", fax: profile?.fax ?? "", email: profile?.email ?? "",
      registrationNumber: profile?.invoice_registration_number ?? "",
    },
    sealUrl: await getDocumentSealUrl(profile?.seal_path ?? null, 60 * 60 * 2),
    taxDisplay: (defaults?.tax_display_default ?? "separate") as TaxDisplay,
    taxRounding: (defaults?.tax_rounding_default ?? "round_down") as TaxRounding,
    templateKey: defaults?.[`${type}_template_key`] ?? "standard",
    templateMessage: defaults?.[`${type}_message`] ?? "",
    remarks: defaults?.[`${type}_remarks`] ?? "",
  };
}

export type SimpleDocumentDefaults = Awaited<ReturnType<typeof getSimpleDocumentDefaults>>;
