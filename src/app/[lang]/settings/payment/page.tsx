import { requireActiveOrg } from "@/lib/guards";
import { getBankAccounts } from "@/lib/db/company";
import { PaymentFormClient } from "./payment-form-client";

export const dynamic = "force-dynamic";

export default async function SettingsPaymentPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const banks = await getBankAccounts(scope.orgId);

  const accounts = banks.map((b) => ({
    id: b.id as string,
    bankName: (b.bank_name as string) ?? "",
    branchName: (b.branch_name as string) ?? "",
    accountType: (b.account_type as "futsu" | "touza" | "chochiku") ?? "futsu",
    accountNumber: (b.account_number as string) ?? "",
    accountHolder: (b.account_holder as string) ?? "",
    displayOrder: Number(b.display_order ?? 0),
  }));

  return <PaymentFormClient orgId={scope.orgId} accounts={accounts} />;
}
