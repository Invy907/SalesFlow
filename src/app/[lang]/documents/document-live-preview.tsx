"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SalesDocumentPreview } from "@/components/sales-document-preview";
import { getDocumentPreviewPanelLabels } from "@/lib/documents/preview-panel-labels";
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
  recipient?: Partial<NonNullable<SalesDocumentDetail["recipient"]>>;
  bankAccounts?: string[];
  senderPostalCode?: string;
  senderAddressLine1?: string;
  senderAddressLine2?: string;
  senderAddressLine3?: string;
  senderTel?: string;
  senderFax?: string;
  senderEmail?: string;
  senderRegistrationNumber?: string;
  /** Seal image (signed URL) and whether it is stamped on this document */
  sealUrl?: string | null;
  showSeal?: boolean;
  taxRounding: TaxRounding;
  rows: LineItemRow[];
};

function toNumber(value: string) {
  const parsed = Number(String(value ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildLivePreviewDetail(input: LivePreviewInput): SalesDocumentDetail {
  // 저장되는 모습 그대로 보여 준다. 비워 둔 행도 빈 줄로 남는다(수정 요청 ⑤).
  const lines = input.rows;

  const totals = computeDocumentTotals(
    lines.map((row) => ({
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
    lines: lines.map((row, index) => ({
      lineNo: index + 1,
      name: row.name,
      qty: toNumber(row.qty),
      unit: row.unit,
      unitPrice: toNumber(row.price),
    })),
    recipient: {
      postalCode: input.recipient?.postalCode ?? "",
      addressLine1: input.recipient?.addressLine1 ?? "",
      addressLine2: input.recipient?.addressLine2 ?? "",
      department: input.recipient?.department ?? "",
      section: input.recipient?.section ?? "",
      contact: input.recipient?.contact ?? "",
      phone: input.recipient?.phone ?? "",
    },
    bankAccounts: input.bankAccounts ?? [],
    showSeal: input.showSeal !== false,
    sender: {
      companyName: input.senderCompanyName,
      postalCode: input.senderPostalCode ?? "",
      addressLine1: input.senderAddressLine1 ?? "",
      addressLine2: input.senderAddressLine2 ?? "",
      addressLine3: input.senderAddressLine3 ?? "",
      tel: input.senderTel ?? "",
      fax: input.senderFax ?? "",
      email: input.senderEmail ?? "",
      registrationNumber: input.senderRegistrationNumber ?? "",
      sealUrl: input.sealUrl ?? null,
    },
  };
}

/**
 * 프리뷰 본문을 이 폭으로 그린 뒤 열 너비에 맞춰 축소한다.
 * A4 문서를 좁은 열에 그대로 넣으면 좌우가 잘려서 오히려 못 알아보기 때문에,
 * 비율을 유지한 채 전체가 한눈에 들어오게 하는 쪽을 기본값으로 둔다.
 */
const PREVIEW_DESIGN_WIDTH = 900;

function ScaledDocument({
  detail,
  ui,
  actualSize,
}: {
  detail: SalesDocumentDetail;
  ui: SalesDocumentDetailUi;
  actualSize: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const update = () => {
      const available = frame.clientWidth;
      const next = actualSize || available <= 0 ? 1 : Math.min(1, available / PREVIEW_DESIGN_WIDTH);
      setScale(next);
      // offsetHeight 는 transform 이 반영되지 않은 레이아웃 높이라 축소 전 높이를 그대로 준다.
      setFrameHeight(content.offsetHeight * next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(content);
    return () => observer.disconnect();
  }, [actualSize]);

  return (
    <div ref={frameRef} className={actualSize ? "overflow-x-auto" : "overflow-hidden"}>
      <div style={{ height: frameHeight || undefined }}>
        <div
          ref={contentRef}
          style={{
            width: PREVIEW_DESIGN_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <SalesDocumentPreview detail={detail} ui={ui} variant="panel" />
        </div>
      </div>
    </div>
  );
}

export function DocumentLivePreview({
  input,
  ui,
  actualSize = false,
}: {
  input: LivePreviewInput;
  ui: SalesDocumentDetailUi;
  actualSize?: boolean;
}) {
  const detail = useMemo(() => buildLivePreviewDetail(input), [input]);
  return <ScaledDocument detail={detail} ui={ui} actualSize={actualSize} />;
}

/**
 * 작성 화면 오른쪽에 붙는 프리뷰 패널. 제목줄 + 배율 토글 + 접기까지 포함한다.
 * 문서가 길어도 페이지가 늘어나지 않도록 패널 안에서만 세로 스크롤한다.
 */
export function DocumentPreviewPanel({
  input,
  ui,
  uiLocale,
  onClose,
}: {
  input: LivePreviewInput;
  ui: SalesDocumentDetailUi;
  uiLocale: string;
  onClose?: () => void;
}) {
  const labels = getDocumentPreviewPanelLabels(uiLocale);
  const [actualSize, setActualSize] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-800">{labels.title}</p>
          <p className="truncate text-[12px] text-slate-500">{labels.note}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-[12px] font-medium">
            {[
              { key: "fit", label: labels.fit, active: !actualSize },
              { key: "actual", label: labels.actual, active: actualSize },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setActualSize(option.key === "actual")}
                className={[
                  "rounded px-2.5 py-1 transition",
                  option.active
                    ? "bg-cyan-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="rounded p-1 text-xl leading-none text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="max-h-[calc(100vh-13rem)] overflow-y-auto">
        <DocumentLivePreview input={input} ui={ui} actualSize={actualSize} />
      </div>
    </div>
  );
}
