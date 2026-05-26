import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  /** Extra bottom padding for sticky document action bars */
  spaciousBottom?: boolean;
};

const baseClass =
  "mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10";

export function pageContainerClass(options?: { spaciousBottom?: boolean; className?: string }) {
  return [
    baseClass,
    options?.spaciousBottom ? "pb-24 sm:pb-28 lg:pb-32" : "pb-12 sm:pb-14 lg:pb-16",
    options?.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function PageContainer({
  children,
  className = "",
  spaciousBottom = false,
}: PageContainerProps) {
  return <div className={pageContainerClass({ spaciousBottom, className })}>{children}</div>;
}
