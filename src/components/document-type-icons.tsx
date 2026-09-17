import {
  FileText,
  PackageCheck,
  ReceiptText,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

/** 홈 빠른 작성·사이드바와 동일한 문서 타입 키 */
export type DocumentTypeIconKey =
  | "estimates"
  | "delivery-notes"
  | "invoices"
  | "receipts";

const icons: Record<DocumentTypeIconKey, LucideIcon> = {
  estimates: FileText,
  "delivery-notes": PackageCheck,
  invoices: ReceiptText,
  receipts: ScrollText,
};

export function DocumentTypeIcon({
  type,
  className = "h-5 w-5",
}: {
  type: DocumentTypeIconKey;
  className?: string;
}) {
  const Icon = icons[type];
  return <Icon className={className} aria-hidden />;
}
