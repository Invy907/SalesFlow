"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { signUp } from "@/lib/actions/auth";
import { formatSalesAuthError } from "@/lib/format-action-error";
import type { AppLocale } from "@/contexts/language-context";
import {
  AuthCard,
  AuthInput,
  AuthSubmitButton,
} from "../_components/auth-card";
import { CheckCircle2, Mail } from "lucide-react";

const initialState = null;

export default function SignUpPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang ?? "ja";
  const locale = (lang === "ko" || lang === "en" ? lang : "ja") as AppLocale;

  const boundSignUp = signUp.bind(null, lang);
  const [state, action, pending] = useActionState(boundSignUp, initialState);

  if (state && "success" in state) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <Mail size={26} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">確認メールを送信しました</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {formatSalesAuthError(state.message ?? "", locale)}
            <br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link
            href={`/${lang}/auth/sign-in`}
            className="mt-2 text-sm text-cyan-600 hover:underline font-medium"
          >
            サインインページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthCard
      lang={lang}
      title="新規アカウント登録"
      description="無料でSalesFlowを始めましょう。"
      footer={
        <p>
          すでにアカウントをお持ちの方は{" "}
          <Link href={`/${lang}/auth/sign-in`} className="text-cyan-600 hover:underline font-medium">
            サインイン
          </Link>
        </p>
      }
    >
      <form action={action} className="flex flex-col gap-4">
        <AuthInput
          label="表示名"
          name="displayName"
          type="text"
          placeholder="山田 太郎"
          autoComplete="name"
          hint="ワークスペース名として使用されます"
        />
        <AuthInput
          label="メールアドレス"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <AuthInput
          label="パスワード"
          name="password"
          type="password"
          placeholder="8文字以上"
          autoComplete="new-password"
          required
          hint="英数字を含む8文字以上"
        />
        <AuthInput
          label="パスワード（確認）"
          name="passwordConfirm"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        {state && "error" in state && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {formatSalesAuthError(state.error, locale)}
          </p>
        )}

        {/* 利用規約 */}
        <p className="text-xs text-slate-400 leading-relaxed">
          登録することで、
          <a href="#" className="text-cyan-600 hover:underline">利用規約</a>および
          <a href="#" className="text-cyan-600 hover:underline">プライバシーポリシー</a>に同意したものとみなされます。
        </p>

        <AuthSubmitButton pending={pending}>
          {pending ? "登録中..." : "アカウントを作成"}
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
