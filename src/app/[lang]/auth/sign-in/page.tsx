"use client";

import { useActionState, Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/actions/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AuthCard,
  AuthDivider,
  AuthInput,
  AuthSubmitButton,
  GoogleSignInButton,
} from "../_components/auth-card";
import { CheckCircle2 } from "lucide-react";

const initialState = null;

function authCallbackUrl(lang: string) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${siteUrl}/auth/callback?next=/${lang}`;
}

function SignInForm({ lang }: { lang: string }) {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const callbackError = searchParams.get("error") === "callback_error";
  const boundSignIn = signIn.bind(null, lang);
  const [state, action, pending] = useActionState(boundSignIn, initialState);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl(lang) },
    });
    if (error) {
      setGoogleError(
        "Googleサインインを開始できませんでした。しばらくしてからもう一度お試しください。",
      );
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      lang={lang}
      title="おかえりなさい"
      description="アカウントにサインインしてください。"
      footer={
        <p>
          アカウントをお持ちでない方は{" "}
          <Link href={`/${lang}/auth/sign-up`} className="text-cyan-600 hover:underline font-medium">
            新規登録
          </Link>
        </p>
      }
    >
      {resetSuccess && (
        <div className="mb-5 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0" />
          パスワードを変更しました。新しいパスワードでサインインしてください。
        </div>
      )}

      {(callbackError || googleError) && (
        <p className="mb-5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {googleError ??
            "Googleサインインを完了できませんでした。もう一度お試しください。"}
        </p>
      )}

      <GoogleSignInButton
        onClick={() => void handleGoogleSignIn()}
        loading={googleLoading}
        disabled={pending}
        label="Googleでサインイン"
        loadingLabel="Googleに移動中..."
      />

      <AuthDivider label="または" />

      <form action={action} className="flex flex-col gap-4">
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
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {state && "error" in state && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {state.error}
          </p>
        )}

        <div className="flex justify-end -mt-1">
          <Link
            href={`/${lang}/auth/forgot-password`}
            className="text-xs text-slate-500 hover:text-cyan-600 hover:underline"
          >
            パスワードをお忘れですか？
          </Link>
        </div>

        <AuthSubmitButton pending={pending}>
          {pending ? "サインイン中..." : "サインイン"}
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}

export default function SignInPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang ?? "ja";

  return (
    <Suspense fallback={null}>
      <SignInForm lang={lang} />
    </Suspense>
  );
}
