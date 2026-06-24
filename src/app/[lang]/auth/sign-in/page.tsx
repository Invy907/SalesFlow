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
import { SignInPageShell } from "../_components/sign-in-shell";
import {
  buildOAuthCallbackUrl,
  getClientSiteUrl,
  setAuthNextPathCookie,
} from "@/lib/site-url";
import { formatSalesAuthError } from "@/lib/format-action-error";
import type { AppLocale } from "@/contexts/language-context";
import { CheckCircle2 } from "lucide-react";

const initialState = null;

function SignInForm({ lang }: { lang: string }) {
  const locale = (lang === "ko" || lang === "en" ? lang : "ja") as AppLocale;
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
    setAuthNextPathCookie(`/${lang}`);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildOAuthCallbackUrl(getClientSiteUrl()) },
    });
    if (error) {
      setGoogleError(formatSalesAuthError("AUTH_GOOGLE_FAILED", locale));
      setGoogleLoading(false);
    }
  };

  return (
    <SignInPageShell lang={lang}>
      <AuthCard
        lang={lang}
        variant="sign-in"
        title="おかえりなさい"
        description="メールアドレスでサインインするか、Googleアカウントをご利用ください。"
        footer={
          <p>
            アカウントをお持ちでない方は{" "}
            <Link
              href={`/${lang}/auth/sign-up`}
              className="font-semibold text-cyan-700 underline-offset-4 transition-colors hover:text-cyan-800 hover:underline"
            >
              新規登録はこちら
            </Link>
          </p>
        }
      >
        {resetSuccess && (
          <div
            className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800"
            role="status"
          >
            <CheckCircle2 size={16} className="shrink-0" aria-hidden />
            パスワードを更新しました。新しいパスワードでサインインしてください。
          </div>
        )}

        {(callbackError || googleError) && (
          <p
            className="mb-5 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {googleError ??
              "Googleサインインを完了できませんでした。もう一度お試しください。"}
          </p>
        )}

        <GoogleSignInButton
          premium
          onClick={() => void handleGoogleSignIn()}
          loading={googleLoading}
          disabled={pending}
          label="Googleでサインイン"
          loadingLabel="Googleに移動しています..."
        />

        <AuthDivider label="またはメールアドレスで" surface="glass" />

        <form action={action} className="flex flex-col gap-5">
          <AuthInput
            premium
            label="メールアドレス"
            name="email"
            type="email"
            placeholder="name@company.co.jp"
            autoComplete="email"
            required
          />
          <AuthInput
            premium
            label="パスワード"
            name="password"
            type="password"
            placeholder="パスワードを入力"
            autoComplete="current-password"
            required
          />

          {state && "error" in state && (
            <p
              className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {formatSalesAuthError(state.error, locale)}
            </p>
          )}

          <div className="-mt-1 flex justify-end">
            <Link
              href={`/${lang}/auth/forgot-password`}
              className="text-xs text-slate-500 underline-offset-2 transition-colors hover:text-cyan-700 hover:underline"
            >
              パスワードをお忘れですか？
            </Link>
          </div>

          <AuthSubmitButton premium pending={pending}>
            {pending ? "サインイン中..." : "サインイン"}
          </AuthSubmitButton>
        </form>
      </AuthCard>
    </SignInPageShell>
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
