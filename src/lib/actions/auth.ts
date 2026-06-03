"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildAuthCallbackUrl, getServerSiteUrl } from "@/lib/site-url";

type AuthResult = { error: string } | { success: true; message?: string };

export async function signIn(
  lang: string,
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Invalid login")) {
      return { error: "メールアドレスまたはパスワードが正しくありません。" };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "メールアドレスの確認が完了していません。受信トレイをご確認ください。" };
    }
    return { error: error.message };
  }

  redirect(`/${lang}`);
}

export async function signUp(
  lang: string,
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;
  const displayName = formData.get("displayName") as string;

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }
  if (password.length < 8) {
    return { error: "パスワードは8文字以上にしてください。" };
  }
  if (password !== passwordConfirm) {
    return { error: "パスワードが一致しません。" };
  }

  const supabase = await getSupabaseServerClient();
  const siteUrl = await getServerSiteUrl();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
      emailRedirectTo: buildAuthCallbackUrl(siteUrl, `/${lang}`),
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "このメールアドレスはすでに登録されています。" };
    }
    return { error: error.message };
  }

  return {
    success: true,
    message: "確認メールを送信しました。受信トレイをご確認ください。",
  };
}

export async function forgotPassword(
  lang: string,
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "メールアドレスを入力してください。" };
  }

  const supabase = await getSupabaseServerClient();
  const siteUrl = await getServerSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl(siteUrl, `/${lang}/auth/reset-password`),
  });

  if (error) return { error: error.message };

  return {
    success: true,
    message: "パスワードリセットのメールを送信しました。",
  };
}

export async function resetPassword(
  lang: string,
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;

  if (!password) return { error: "新しいパスワードを入力してください。" };
  if (password.length < 8) return { error: "パスワードは8文字以上にしてください。" };
  if (password !== passwordConfirm) return { error: "パスワードが一致しません。" };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  redirect(`/${lang}/auth/sign-in?reset=success`);
}
