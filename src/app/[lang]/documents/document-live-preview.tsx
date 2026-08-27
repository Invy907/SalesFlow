"use client";

import { useMemo } from "react";
import { SalesDocumentPreview } from "@/components/sales-document-preview";
import type { SalesDocumentDetail, SalesDocumentDetailUi } from "@/lib/documents/detail-types";
import type { DocumentOutputLocale } from "@/lib/documents/output-locale";
import type { ClientHonorific } from "@/lib/documents/client-honorific";
import { computeDocumentTotals, taxCategoryFromLabel, type TaxRounding } from "@/lib/tax";
import type { LineItemRow } from "./new-document-shared";

/**
 * 작성 화면 옆에 붙는 실시간 프리뷰.
 *
 * 저장된 문서를 보여주는 상세/공유 화면과 같은 `SalesDocumentPreview` 를 쓰기 때문에
 * "입력한 그대로 완성 이미지"가 보인다. 합계는 서버 저장 로직과 같은
 * `computeDocumentTotals` 로 계산해서 저장 후 금액과 어긋나지 않게 한다.
 */
export type LivePreviewInput = {
  documentNumber: string;
  clientName: string;
  clientHonorific: ClientHonorific;
  subject: string;
  issueDate: string;
  secondaryDate?: string;
  outputLocale: DocumentOutputLocale;
  templateMessage: string;
  remarks: string;
  senderCompanyName: string;
  senderTel?: string;
  senderEmail?: string;
  taxRounding: TaxRounding;
  rows: LineItemRow[];
};

function toNumber(value: string) {
  const parsed = Number(String(value ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildLivePreviewDetail(input: LivePreviewInput): SalesDocumentDetail {
  // 완전히 빈 행은 합계·표에서 제외한다(작성 중에 빈 줄이 잔뜩 보이지 않게).
  const filled = input.rows.filter(
    (row) => row.name.trim() !== "" || row.qty.trim() !== "" || row.price.trim() !== "",
  );

  const totals = computeDocumentTotals(
    filled.map((row) => ({
      qty: toNumber(row.qty),
      unitPrice: toNumber(row.price),
      taxCategory: taxCategoryFromLabel(row.tax),
    })),
    input.taxRounding,
  );

  return {
    id: "preview",
    documentNumber: input.documentNumber,
    clientName: input.clientName,
    subject: input.subject,
    issueDate: input.issueDate,
    secondaryDate: input.secondaryDate,
    status: "draft",
    outputLocale: input.outputLocale,
    showClientHonorific: input.clientHonorific !== "none",
    clientHonorific: input.clientHonorific,
    templateMessage: input.templateMessage,
    remarks: input.remarks,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    lines: filled.map((row, index) => ({
      lineNo: index + 1,
      name: row.name,
      qty: toNumber(row.qty),
      unit: row.unit,
      unitPrice: toNumber(row.price),
    })),
    sender: {
      companyName: input.senderCompanyName,
      tel: input.senderTel ?? "",
      email: input.senderEmail ?? "",
    },
  };
}

export function DocumentLivePreview({
  input,
  ui,
}: {
  input: LivePreviewInput;
  ui: SalesDocumentDetailUi;
}) {
  const detail = useMemo(() => buildLivePreviewDetail(input), [input]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* 원본 프리뷰는 A4 폭 기준이라 좁은 열에서는 가로 스크롤로 원래 비율을 유지한다. */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <SalesDocumentPreview detail={detail} ui={ui} />
        </div>
      </div>
    </div>
  );
}
