"use client";

import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { getSettingsContent } from "../content";
import { SettingsSubNav } from "../settings-shared";

const copy = {
  ja: { notice: "この画面では所属メンバーを確認できます。メンバーの招待・権限変更はまだ対応していません。", member: "メンバー", you: "あなた", owner: "オーナー" },
  ko: { notice: "소속 멤버를 확인할 수 있습니다. 멤버 초대와 권한 변경은 아직 지원하지 않습니다.", member: "멤버", you: "본인", owner: "소유자" },
  en: { notice: "View your team members here. Invitations and role changes are not available yet.", member: "Member", you: "You", owner: "Owner" },
} as const;

export function TeamClient({ members }: { members: Array<{ id: string; role: string; name: string; email: string; self: boolean }> }) {
  const { lang } = useLanguage();
  const team = getSettingsContent(lang).team;
  const ui = copy[lang];
  const roles: Record<string, string> = { owner: ui.owner, admin: team.roleAdmin, member: team.roleMember, viewer: team.roleViewer };
  return <SalesFlowShell activeItem="settings">
    <SettingsSubNav active="team" />
    <div className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">{team.title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{ui.notice}</p>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 p-5 text-lg font-semibold">{team.membersSection} ({members.length})</h2>
        <ul className="divide-y divide-slate-100">{members.map((member, index) => <li key={member.id} className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="min-w-0"><p className="font-medium [overflow-wrap:anywhere]">{member.name || `${ui.member} ${index + 1}`}{member.self ? ` (${ui.you})` : ""}</p>{member.email && <p className="mt-1 break-all text-sm text-slate-500">{member.email}</p>}</div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">{roles[member.role] ?? member.role}</span>
        </li>)}</ul>
      </section>
    </div>
  </SalesFlowShell>;
}
