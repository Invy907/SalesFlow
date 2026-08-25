const REVIEW_REASON_MESSAGES: Record<string, { ja: string; ko: string; en: string }> = {
  line_amount_mismatch: {
    ja: "品目の印刷金額と数量×単価の計算結果が一致しません。",
    ko: "품목의 인쇄 금액과 수량×단가 계산 결과가 일치하지 않습니다.",
    en: "A line printed amount does not match quantity × unit price.",
  },
  subtotal_mismatch: {
    ja: "印刷された小計と明細の計算小計が一致しません。",
    ko: "인쇄된 소계와 명세 계산 소계가 일치하지 않습니다.",
    en: "The printed subtotal does not match the computed subtotal.",
  },
  total_mismatch: {
    ja: "印刷された合計と計算合計が一致しません。",
    ko: "인쇄된 합계와 계산 합계가 일치하지 않습니다.",
    en: "The printed total does not match the computed total.",
  },
};

export function batchReviewHints(
  reasons: string[] | null | undefined,
  lang: "ja" | "ko" | "en",
): string[] {
  const hints: string[] = [];
  for (const reason of reasons ?? []) {
    const message = REVIEW_REASON_MESSAGES[reason]?.[lang];
    if (message) hints.push(message);
  }
  return hints;
}

export function extractionConfidenceLabel(
  confidence: number | null | undefined,
  lang: "ja" | "ko" | "en",
): string | null {
  if (confidence === null || confidence === undefined) return null;
  const percent = Math.round(confidence * 100);
  if (lang === "ja") return `抽出信頼度 ${percent}%`;
  if (lang === "ko") return `추출 신뢰도 ${percent}%`;
  return `Extraction confidence ${percent}%`;
}
