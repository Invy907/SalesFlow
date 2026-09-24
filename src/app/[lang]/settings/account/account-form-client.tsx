"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { updateDisplayName } from "@/lib/actions/profile";
import type { getShellSession } from "@/lib/session";
import { SettingsSubNav } from "../settings-shared";

const copy = {
  ja: { title: "アカウント情報", profile: "プロフィール", name: "表示名", email: "メールアドレス", organizations: "所属組織", save: "保存する", saving: "保存中…", saved: "保存しました。", error: "保存できませんでした。入力内容を確認して再度お試しください。" },
  ko: { title: "계정 정보", profile: "프로필", name: "표시 이름", email: "이메일 주소", organizations: "소속 조직", save: "저장", saving: "저장 중…", saved: "저장했습니다.", error: "저장하지 못했습니다. 입력 내용을 확인한 후 다시 시도하세요." },
  en: { title: "Account information", profile: "Profile", name: "Display name", email: "Email address", organizations: "Organizations", save: "Save", saving: "Saving…", saved: "Saved.", error: "Unable to save. Check your name and try again." },
} as const;

export function AccountFormClient({ session }: { session: Awaited<ReturnType<typeof getShellSession>> }) {
  const { lang } = useLanguage();
  const ui = copy[lang];
  const router = useRouter();
  const [name, setName] = useState(session.profile?.name ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<"saved" | "error" | null>(null);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      try {
        const response = await updateDisplayName(name);
        setResult(response.ok ? "saved" : "error");
        if (response.ok) router.refresh();
      } catch { setResult("error"); }
    });
  }

  return (
    <SalesFlowShell key={session.profile?.name} activeItem="settings" initialSession={session}>
      <SettingsSubNav active="account" />
      <div className="mx-auto w-full min-w-0 [overflow-wrap:anywhere] max-w-[1260px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <h1 className="text-2xl font-bold sm:text-[30px] tracking-tight text-slate-900">{ui.title}</h1>
        <form onSubmit={save} className="mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="mb-6 text-lg font-semibold">{ui.profile}</h2>
          <label className="block text-sm font-medium" htmlFor="profile-display-name">{ui.name}</label>
          <input id="profile-display-name" required maxLength={100} autoComplete="name" value={name}
            onChange={(event) => { setName(event.target.value); setResult(null); }}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          <dl className="mt-6 space-y-5 text-sm">
            <div><dt className="font-medium">{ui.email}</dt><dd className="mt-1 break-all text-slate-600">{session.profile?.email}</dd></div>
            <div><dt className="font-medium">{ui.organizations}</dt><dd className="mt-1 text-slate-600 [overflow-wrap:anywhere]">{session.organizations.map((org) => org.name).join(", ") || "—"}</dd></div>
          </dl>
          <div aria-live="polite" className="mt-5 text-sm">
            {result && <p className={result === "error" ? "text-red-600" : "text-emerald-700"} role={result === "error" ? "alert" : "status"}>{ui[result]}</p>}
          </div>
          <button type="submit" disabled={pending || !name.trim()} className="mt-4 rounded-lg bg-[#0A4D34] px-6 py-2.5 font-semibold text-white disabled:opacity-50">{pending ? ui.saving : ui.save}</button>
        </form>
      </div>
    </SalesFlowShell>
  );
}
