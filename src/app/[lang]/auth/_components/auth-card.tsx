"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import type { AppLocale } from "@/contexts/language-context";

type AuthCardVariant = "default" | "sign-in";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  lang: string;
  variant?: AuthCardVariant;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  lang,
  variant = "default",
}: AuthCardProps) {
  const isSignIn = variant === "sign-in";

  return (
    <div className={isSignIn ? "w-full" : "w-full max-w-[420px]"}>
      {!isSignIn && (
        <div className="mb-8 flex justify-center">
          <Link href={`/${lang}`} className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 shadow-sm transition-colors group-hover:bg-cyan-600">
              <Image
                src="/salesflow-sf-mark.svg"
                alt="SalesFlow"
                width={22}
                height={22}
                className="brightness-0 invert"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">SalesFlow</span>
          </Link>
        </div>
      )}

      <div
        className={
          isSignIn
            ? "rounded-3xl border border-white/80 bg-white/85 p-8 shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-200/50 backdrop-blur-xl sm:p-9 lg:p-10"
            : "rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        }
      >
        <div className={isSignIn ? "mb-7" : "mb-6"}>
          <h1
            className={
              isSignIn
                ? "text-[1.5rem] font-bold leading-snug tracking-tight text-slate-900"
                : "text-[1.4rem] font-bold leading-snug text-slate-900"
            }
          >
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
        {children}
      </div>

      {footer && (
        <div
          className={
            isSignIn
              ? "mt-6 rounded-2xl border border-slate-200/60 bg-white/40 px-4 py-3.5 text-center text-sm text-slate-600 backdrop-blur-sm"
              : "mt-5 text-center text-sm text-slate-500"
          }
        >
          {footer}
        </div>
      )}
    </div>
  );
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  premium?: boolean;
  locale?: AppLocale;
}

const passwordToggleLabels: Record<AppLocale, { show: string; hide: string }> = {
  ja: { show: "パスワードを表示", hide: "パスワードを非表示" },
  ko: { show: "비밀번호 표시", hide: "비밀번호 숨기기" },
  en: { show: "Show password", hide: "Hide password" },
};

export function AuthInput({
  label,
  error,
  hint,
  className,
  premium,
  id,
  type,
  locale = "ja",
  ...props
}: AuthInputProps) {
  const inputId = id ?? props.name;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;
  const toggleLabels = passwordToggleLabels[locale];

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className={isPassword ? "relative" : undefined}>
        <input
          id={inputId}
          type={inputType}
          className={`field ${premium ? "field-premium" : ""} ${error ? "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.18)]" : ""} ${isPassword ? "pr-11" : ""} ${className ?? ""}`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? toggleLabels.hide : toggleLabels.show}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

interface AuthSubmitButtonProps {
  children: ReactNode;
  pending?: boolean;
  premium?: boolean;
}

export function AuthSubmitButton({ children, pending, premium }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        premium
          ? "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-500 to-teal-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:from-cyan-600 hover:via-cyan-600 hover:to-teal-600 hover:shadow-cyan-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:from-cyan-300 disabled:via-cyan-300 disabled:to-teal-300 disabled:shadow-none"
          : "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:bg-cyan-300"
      }
    >
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

interface AuthDividerProps {
  label: string;
  surface?: "white" | "glass";
}

export function AuthDivider({ label, surface = "white" }: AuthDividerProps) {
  const bgClass = surface === "glass" ? "bg-white/85" : "bg-white";

  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-slate-200/80" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className={`${bgClass} px-3 text-slate-400`}>{label}</span>
      </div>
    </div>
  );
}

interface GoogleSignInButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
  premium?: boolean;
}

export function GoogleSignInButton({
  onClick,
  loading,
  disabled,
  label,
  loadingLabel,
  premium,
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={
        premium
          ? "flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200/90 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          : "flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M21.8 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.5 3.1-7.7Z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.7 0 5-.9 6.7-2.5l-3.2-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.7A10 10 0 0 0 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.2 13.6a6 6 0 0 1 0-3.2V7.7H2.9a10 10 0 0 0 0 8.6l3.3-2.7Z"
          fill="#FBBC05"
        />
        <path
          d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 2.9 7.7l3.3 2.7C7 7.8 9.3 6 12 6Z"
          fill="#EA4335"
        />
      </svg>
      {loading ? loadingLabel : label}
    </button>
  );
}
