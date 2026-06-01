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
