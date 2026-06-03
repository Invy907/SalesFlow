import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[#f8fbfd]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 10% 20%, rgba(103, 232, 249, 0.22) 0%, transparent 55%),
            radial-gradient(ellipse 70% 55% at 90% 10%, rgba(45, 212, 191, 0.16) 0%, transparent 50%),
            radial-gradient(ellipse 65% 50% at 50% 100%, rgba(186, 230, 253, 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 40% 35% at 75% 65%, rgba(165, 243, 252, 0.2) 0%, transparent 45%)
          `,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 -z-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-1/4 -z-10 h-80 w-80 rounded-full bg-teal-300/15 blur-3xl"
        aria-hidden
      />
      {children}
    </div>
  );
}
