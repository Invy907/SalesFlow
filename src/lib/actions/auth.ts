"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSignupEmailAlreadyRegistered } from "@/lib/auth/signup";
import { buildAuthCallbackUrl } from "@/lib/site-url";
import { getServerSiteUrl } from "@/lib/site-url.server";

type AuthResult = { error: string } | { success: true; message?: string };

export async function signIn(
  lang: string,
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "AUTH_FIELDS_REQUIRED" };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Invalid login")) {
      return { error: "AUTH_INVALID_CREDENTIALS" };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "AUTH_EMAIL_NOT_CONFIRMED" };
    }
    return { error: "AUTH_GENERIC" };
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
    return { error: "AUTH_FIELDS_REQUIRED" };
  }
  if (password.length < 8) {
    return { error: "AUTH_PASSWORD_TOO_SHORT" };
  }
  if (password !== passwordConfirm) {
    return { error: "AUTH_PASSWORD_MISMATCH" };
  }

  const supabase = await getSupabaseServerClient();
  const siteUrl = await getServerSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
      emailRedirectTo: buildAuthCallbackUrl(siteUrl, `/${lang}`),
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "AUTH_USER_EXISTS" };
    }
    return { error: "AUTH_GENERIC" };
  }

  if (isSignupEmailAlreadyRegistered(data)) {
    return { error: "AUTH_USER_EXISTS" };
  }

  return { success: true, message: "AUTH_SIGNUP_SUCCESS" };
}

export async function forgotPassword(
  lang: string,
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "AUTH_EMAIL_REQUIRED" };
  }

  const supabase = await getSupabaseServerClient();
  const siteUrl = await getServerSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl(siteUrl, `/${lang}/auth/reset-password`),
  });

  if (error) return { error: "AUTH_GENERIC" };

  return { success: true, message: "AUTH_FORGOT_SUCCESS" };
}

export async function resetPassword(
  lang: string,
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;

  if (!password) return { error: "AUTH_PASSWORD_REQUIRED" };
  if (password.length < 8) return { error: "AUTH_PASSWORD_TOO_SHORT" };
  if (password !== passwordConfirm) return { error: "AUTH_PASSWORD_MISMATCH" };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: "AUTH_GENERIC" };

  redirect(`/${lang}/auth/sign-in?reset=success`);
}
