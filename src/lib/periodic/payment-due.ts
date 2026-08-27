/**
 * 정기 청구 예약의 지급기한 계산.
 * payment_mode = 'due' 일 때만 값이 생기고, 청구일이 속한 달(current) 또는
 * 그 다음 달(next)의 지정일/말일이 된다.
 */

import { lastDayOfMonth, isValidDate } from "./schedule-math";

export type PaymentTiming = {
  paymentMode: "none" | "due";
  paymentMonth: "current" | "next" | null;
  paymentDayMode: "day" | "last";
  paymentDay: number | null;
};

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

export function computePaymentDue(issueDate: string, timing: PaymentTiming): string | null {
  if (timing.paymentMode !== "due" || !isValidDate(issueDate)) return null;

  const [year, month] = issueDate.split("-").map(Number);
  const offset = timing.paymentMonth === "next" ? 1 : 0;
  const zeroBased = year * 12 + (month - 1) + offset;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = (zeroBased % 12) + 1;

  const last = lastDayOfMonth(targetYear, targetMonth);
  const day =
    timing.paymentDayMode === "last"
      ? last
      : Math.min(Math.max(timing.paymentDay ?? 1, 1), last);

  return `${pad(targetYear, 4)}-${pad(targetMonth)}-${pad(day)}`;
}
