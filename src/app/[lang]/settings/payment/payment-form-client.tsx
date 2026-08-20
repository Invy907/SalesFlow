"use client";

import { useState, useTransition } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import {
  createBankAccount,
  deleteBankAccount,
} from "@/lib/actions/company";
import { getSettingsContent } from "../content";
import {
  SettingsIntegrationRow,
  SettingsSaveBar,
  SettingsSectionHeader,
  SettingsSubNav,
} from "../settings-shared";

export type BankAccountRow = {
  id: string;
  bankName: string;
  branchName: string;
  accountType: "futsu" | "touza" | "chochiku";
  accountNumber: string;
  accountHolder: string;
  displayOrder: number;
};

export function PaymentFormClient({
  orgId,
  accounts: initialAccounts,
}: {
  orgId: string;
  accounts: BankAccountRow[];
}) {
  const { lang } = useLanguage();
  const ui = getSettingsContent(lang);
  const payment = ui.payment;

  const [accounts, setAccounts] = useState(initialAccounts);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    bankName: "",
    branchName: "",
    accountType: "futsu" as BankAccountRow["accountType"],
    accountNumber: "",
    accountHolder: "",
  });

  function handleCreate() {
    if (accounts.length >= 3) {
      setError("入金口座は最大3件までです");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createBankAccount(orgId, {
        ...draft,
        displayOrder: accounts.length + 1,
      });
      if (result.ok) {
        setAccounts((a) => [
          ...a,
          {
            id: result.data,
            bankName: draft.bankName,
            branchName: draft.branchName,
            accountType: draft.accountType,
            accountNumber: draft.accountNumber,
            accountHolder: draft.accountHolder,
            displayOrder: accounts.length + 1,
          },
        ]);
        setDraft({
          bankName: "",
          branchName: "",
          accountType: "futsu",
          accountNumber: "",
          accountHolder: "",
        });
      } else setError(result.error);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteBankAccount(id);
      if (result.ok) setAccounts((a) => a.filter((x) => x.id !== id));
      else setError(result.error);
    });
  }

  return (
    <SalesFlowShell activeItem="settings">
      <SettingsSubNav active="payment" />

      <div className="mx-auto w-full max-w-[1260px] px-4 py-6 pb-12 sm:px-6 sm:py-8 sm:pb-14 lg:px-8 lg:py-10 lg:pb-16">
        <h1 className="text-[30px] font-bold tracking-tight text-slate-900">{payment.title}</h1>
        <p className="mt-4 max-w-[900px] text-[15px] leading-7 text-slate-600">{payment.intro}</p>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-10 space-y-8">
          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title="入金口座" />
            <div className="px-6 py-6 space-y-4">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0"
                >
                  <div className="text-[15px] text-slate-700">
                    {a.bankName} {a.branchName} {a.accountNumber} ({a.accountHolder})
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    disabled={pending}
                    className="text-sm text-red-600 hover:underline disabled:opacity-60"
                  >
                    削除
                  </button>
                </div>
              ))}

              {accounts.length < 3 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    className="field"
                    placeholder="銀行名"
                    value={draft.bankName}
                    onChange={(e) => setDraft((d) => ({ ...d, bankName: e.target.value }))}
                  />
                  <input
                    className="field"
                    placeholder="支店名"
                    value={draft.branchName}
                    onChange={(e) => setDraft((d) => ({ ...d, branchName: e.target.value }))}
                  />
                  <select
                    className="field bg-white"
                    value={draft.accountType}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        accountType: e.target.value as BankAccountRow["accountType"],
                      }))
                    }
                  >
                    <option value="futsu">普通</option>
                    <option value="touza">当座</option>
                    <option value="chochiku">貯蓄</option>
                  </select>
                  <input
                    className="field"
                    placeholder="口座番号"
                    value={draft.accountNumber}
                    onChange={(e) => setDraft((d) => ({ ...d, accountNumber: e.target.value }))}
                  />
                  <input
                    className="field"
                    placeholder="口座名義"
                    value={draft.accountHolder}
                    onChange={(e) => setDraft((d) => ({ ...d, accountHolder: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={pending}
                    className="rounded bg-[#14a7bb] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    口座を追加
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <SettingsSectionHeader title={payment.accountSection} />
            <SettingsIntegrationRow
              title={payment.cardPayment.title}
              description={payment.cardPayment.desc}
              linkText={payment.cardPayment.link}
              buttonLabel={payment.cardPayment.button}
            />
            <SettingsIntegrationRow
              title={payment.deferredPayment.title}
              description={payment.deferredPayment.desc}
              linkText={payment.deferredPayment.link}
              note={payment.deferredPayment.note}
              helpText={payment.deferredPayment.helpPrefix}
              helpLink={payment.deferredPayment.helpLink}
              helpSuffix={payment.deferredPayment.helpSuffix}
              buttonLabel={payment.deferredPayment.button}
            />
          </section>
        </div>
      </div>
    </SalesFlowShell>
  );
}
