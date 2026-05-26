import type { ReactNode } from "react";

export function OrderMainInner({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1260px] px-4 pb-12 sm:px-6 lg:px-8">{children}</div>
  );
}
