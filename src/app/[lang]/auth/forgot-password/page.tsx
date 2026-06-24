"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { forgotPassword } from "@/lib/actions/auth";
import { formatSalesAuthError } from "@/lib/format-action-error";
import type { AppLocale } from "@/contexts/language-context";
import { AuthCard, AuthInput, AuthSubmitButton } from "../_components/auth-card";
import { CheckCircle2, ArrowLeft } from "lucide-react";

const initialState = null;

export default function ForgotPasswordPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang ?? "ja";
  const locale = (lang === "ko" || lang === "en" ? lang : "ja") as AppLocale;

  const boundForgotPassword = forgotPassword.bind(null, lang);
  const [state, action, pending] = useActionState(boundForgotPassword, initialState);

  if (state && "success" in state) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-cyan-50 flex items-center justify-center">
            <CheckCircle2 size={26} className="text-cyan-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">メールを送信しました</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            パスワードリセット用のリンクをメールで送信しました。
            <br />
            受信トレイをご確認ください。
          </p>
          <Link
            href={`/${lang}/auth/sign-in`}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-cyan-600 hover:underline font-medium"
          >
            <ArrowLeft size={14} />
            サインインに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthCard
      lang={lang}
      title="パスワードをお忘れですか？"
      description="登録済みのメールアドレスを入力してください。リセット用のリンクを送信します。"
      footer={
        <Link
          href={`/${lang}/auth/sign-in`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-cyan-600 hover:underline"
        >
          <ArrowLeft size={14} />
          サインインに戻る
        </Link>
      }
    >
      <form action={action} className="flex flex-col gap-4">
        <AuthInput
          label="メールアドレス"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        {state && "error" in state && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {formatSalesAuthError(state.error, locale)}
          </p>
        )}

        <AuthSubmitButton pending={pending}>
          {pending ? "送信中..." : "リセットリンクを送信"}
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
