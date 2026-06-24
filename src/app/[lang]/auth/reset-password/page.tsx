"use client";

import { useActionState, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/actions/auth";
import { formatSalesAuthError } from "@/lib/format-action-error";
import type { AppLocale } from "@/contexts/language-context";
import { AuthCard, AuthInput, AuthSubmitButton } from "../_components/auth-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowLeft, AlertCircle } from "lucide-react";

const initialState = null;

function ResetPasswordForm({ lang }: { lang: string }) {
  const locale = (lang === "ko" || lang === "en" ? lang : "ja") as AppLocale;
  const searchParams = useSearchParams();

  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const boundResetPassword = resetPassword.bind(null, lang);
  const [state, action, pending] = useActionState(boundResetPassword, initialState);

  // OTP / magic-link token을 세션으로 교환
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setSessionError("リンクが無効または期限切れです。もう一度お試しください。");
        } else {
          setSessionReady(true);
        }
      });
    } else {
      // Already has a session (redirected from callback route)
      setSessionReady(true);
    }
  }, [searchParams]);

  if (sessionError) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={26} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">リンクが無効です</h2>
          <p className="text-sm text-slate-500">{sessionError}</p>
          <Link
            href={`/${lang}/auth/forgot-password`}
            className="mt-2 text-sm text-cyan-600 hover:underline font-medium"
          >
            パスワードリセットをやり直す
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex items-center justify-center min-h-48">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <svg className="animate-spin h-7 w-7" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">確認中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthCard
      lang={lang}
      title="新しいパスワードを設定"
      description="安全な新しいパスワードを入力してください。"
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
          label="新しいパスワード"
          name="password"
          type="password"
          placeholder="8文字以上"
          autoComplete="new-password"
          required
          hint="英数字を含む8文字以上"
        />
        <AuthInput
          label="新しいパスワード（確認）"
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

        <AuthSubmitButton pending={pending}>
          {pending ? "更新中..." : "パスワードを更新"}
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang ?? "ja";

  return (
    <Suspense fallback={null}>
      <ResetPasswordForm lang={lang} />
    </Suspense>
  );
}
