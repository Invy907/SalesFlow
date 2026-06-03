import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  lang: string;
}

export function AuthCard({ title, description, children, footer, lang }: AuthCardProps) {
  return (
    <div className="w-full max-w-[420px]">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <Link href={`/${lang}`} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center shadow-sm group-hover:bg-cyan-600 transition-colors">
            <Image
              src="/salesflow-sf-mark.svg"
              alt="SalesFlow"
              width={22}
              height={22}
              className="brightness-0 invert"
            />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">SalesFlow</span>
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6">
          <h1 className="text-[1.4rem] font-bold text-slate-900 leading-snug">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{description}</p>
          )}
        </div>
        {children}
      </div>

      {footer && (
        <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>
      )}
    </div>
  );
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function AuthInput({ label, error, hint, className, ...props }: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        className={`field ${error ? "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.18)]" : ""} ${className ?? ""}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

interface AuthSubmitButtonProps {
  children: ReactNode;
  pending?: boolean;
}

export function AuthSubmitButton({ children, pending }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-12 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
    >
      {pending && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-3 text-slate-400">{label}</span>
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
}

export function GoogleSignInButton({
  onClick,
  loading,
  disabled,
  label,
  loadingLabel,
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full h-12 items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
