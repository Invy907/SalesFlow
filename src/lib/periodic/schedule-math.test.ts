import assert from "node:assert/strict";
import test from "node:test";
import {
  computeFirstRunDate,
  computeNextRunDate,
  computeFirstRunAt,
  computeNextRunAt,
  computeRunDateOnOrAfter,
  computeUpcomingRunAt,
  todayInScheduleTz,
  dateFromRunAt,
  runAtFromDate,
  lastDayOfMonth,
  type ScheduleTiming,
} from "./schedule-math";
import { computePaymentDue } from "./payment-due";

const monthly = (over: Partial<ScheduleTiming> = {}): ScheduleTiming => ({
  startDate: "2026-08-27",
  cycle: "monthly",
  dayMode: "day",
  dayValue: 1,
  endMode: "none",
  endDate: null,
  ...over,
});

test("매월 지정일: 시작일이 지난 달은 건너뛰고 다음 달 1일부터 시작한다", () => {
  assert.equal(computeFirstRunDate(monthly()), "2026-09-01");
});

test("매월 지정일: 시작일과 같은 달의 지정일이 아직 안 지났으면 그 달부터 시작한다", () => {
  assert.equal(computeFirstRunDate(monthly({ startDate: "2026-08-01" })), "2026-08-01");
  assert.equal(computeFirstRunDate(monthly({ startDate: "2026-08-01", dayValue: 15 })), "2026-08-15");
});

test("매월 말일: 달마다 실제 말일을 따라간다 (2월·윤년 포함)", () => {
  const timing = monthly({ startDate: "2027-01-01", dayMode: "last", dayValue: null });
  assert.equal(computeFirstRunDate(timing), "2027-01-31");
  assert.equal(computeNextRunDate(timing, "2027-01-31"), "2027-02-28");
  assert.equal(computeNextRunDate(timing, "2027-03-31"), "2027-04-30");

  const leap = monthly({ startDate: "2028-01-01", dayMode: "last", dayValue: null });
  assert.equal(computeNextRunDate(leap, "2028-01-31"), "2028-02-29");
});

test("매월 지정일: 12월 다음은 이듬해 1월", () => {
  assert.equal(computeNextRunDate(monthly({ dayValue: 10 }), "2026-12-10"), "2027-01-10");
});

test("매년: 시작 월의 같은 날, 다음은 1년 뒤", () => {
  const timing = monthly({ cycle: "yearly", startDate: "2026-03-10", dayValue: null });
  assert.equal(computeFirstRunDate(timing), "2026-03-10");
  assert.equal(computeNextRunDate(timing, "2026-03-10"), "2027-03-10");
});

test("매년: 시작일이 이미 지났으면 이듬해부터", () => {
  const timing = monthly({ cycle: "yearly", startDate: "2026-03-10", dayValue: 5 });
  assert.equal(computeFirstRunDate(timing), "2027-03-05");
});

test("매주: 시작일부터 7일 간격", () => {
  const timing = monthly({ cycle: "weekly", startDate: "2026-08-27" });
  assert.equal(computeFirstRunDate(timing), "2026-08-27");
  assert.equal(computeNextRunDate(timing, "2026-08-27"), "2026-09-03");
  // 월을 넘어가도 단순 +7일
  assert.equal(computeNextRunDate(timing, "2026-08-31"), "2026-09-07");
});

test("종료일을 넘어서면 다음 실행이 없다", () => {
  const timing = monthly({
    startDate: "2026-08-01",
    dayValue: 1,
    endMode: "date",
    endDate: "2026-10-15",
  });
  assert.equal(computeNextRunDate(timing, "2026-09-01"), "2026-10-01");
  assert.equal(computeNextRunDate(timing, "2026-10-01"), null);
});

test("시작 전에 이미 종료일이 지났으면 첫 실행도 없다", () => {
  const timing = monthly({
    startDate: "2026-08-01",
    dayValue: 20,
    endMode: "date",
    endDate: "2026-08-10",
  });
  assert.equal(computeFirstRunDate(timing), null);
});

test("잘못된 날짜는 null 로 떨어진다", () => {
  assert.equal(computeFirstRunDate(monthly({ startDate: "2026-13-40" })), null);
  assert.equal(computeNextRunDate(monthly(), "not-a-date"), null);
});

test("next_run_at 은 JST 자정으로 저장되고 다시 같은 날짜로 읽힌다", () => {
  assert.equal(runAtFromDate("2026-09-01"), "2026-08-31T15:00:00.000Z");
  assert.equal(dateFromRunAt("2026-08-31T15:00:00.000Z"), "2026-09-01");
  // cron 이 09:30 JST(00:30 UTC)에 읽어도 같은 날짜다.
  assert.equal(dateFromRunAt("2026-09-01T00:30:00.000Z"), "2026-09-01");
});

test("타임스탬프 헬퍼는 날짜 계산과 같은 결과를 낸다", () => {
  const timing = monthly({ startDate: "2026-08-01", dayValue: 1 });
  const first = computeFirstRunAt(timing);
  assert.equal(first, runAtFromDate("2026-08-01"));
  assert.equal(computeNextRunAt(timing, first!), runAtFromDate("2026-09-01"));
});

test("말일 계산", () => {
  assert.equal(lastDayOfMonth(2026, 2), 28);
  assert.equal(lastDayOfMonth(2028, 2), 29);
  assert.equal(lastDayOfMonth(2026, 4), 30);
  assert.equal(lastDayOfMonth(2026, 12), 31);
});

test("지급기한: 당월/익월 지정일과 말일", () => {
  const base = { paymentMode: "due" as const, paymentDayMode: "day" as const, paymentDay: 25 };
  assert.equal(computePaymentDue("2026-08-01", { ...base, paymentMonth: "current" }), "2026-08-25");
  assert.equal(computePaymentDue("2026-08-01", { ...base, paymentMonth: "next" }), "2026-09-25");
  assert.equal(
    computePaymentDue("2026-12-31", { ...base, paymentMonth: "next" }),
    "2027-01-25",
  );
  assert.equal(
    computePaymentDue("2027-01-10", {
      paymentMode: "due",
      paymentMonth: "next",
      paymentDayMode: "last",
      paymentDay: null,
    }),
    "2027-02-28",
  );
});

test("지급기한: 설정하지 않으면 null", () => {
  assert.equal(
    computePaymentDue("2026-08-01", {
      paymentMode: "none",
      paymentMonth: null,
      paymentDayMode: "day",
      paymentDay: null,
    }),
    null,
  );
});

test("과거 시작일이어도 오늘 이후 첫 실행일부터 예약된다", () => {
  const timing = monthly({ startDate: "2020-01-01", dayValue: 10 });
  assert.equal(computeRunDateOnOrAfter(timing, "2026-08-27"), "2026-09-10");
  assert.equal(computeRunDateOnOrAfter(timing, "2026-09-10"), "2026-09-10");
});

test("주간 예약은 과거 시작일의 요일을 유지한다", () => {
  // 2026-08-27 은 목요일. 다음 목요일은 2026-09-03.
  const timing = monthly({ cycle: "weekly", startDate: "2026-06-04" });
  const next = computeRunDateOnOrAfter(timing, "2026-08-28");
  assert.equal(next, "2026-09-03");
});

test("이미 종료된 예약은 다가오는 실행이 없다", () => {
  const timing = monthly({
    startDate: "2026-01-01",
    dayValue: 1,
    endMode: "date",
    endDate: "2026-06-30",
  });
  assert.equal(computeRunDateOnOrAfter(timing, "2026-08-27"), null);
  assert.equal(computeUpcomingRunAt(timing, new Date("2026-08-27T00:00:00+09:00")), null);
});

test("todayInScheduleTz 는 JST 달력 날짜를 돌려준다", () => {
  // 2026-08-27 23:30 JST = 14:30 UTC → 여전히 8/27
  assert.equal(todayInScheduleTz(new Date("2026-08-27T14:30:00Z")), "2026-08-27");
  // 2026-08-27 16:00 UTC = 8/28 01:00 JST
  assert.equal(todayInScheduleTz(new Date("2026-08-27T16:00:00Z")), "2026-08-28");
});

test("computeUpcomingRunAt 은 JST 자정 타임스탬프", () => {
  const timing = monthly({ startDate: "2026-08-01", dayValue: 1 });
  assert.equal(
    computeUpcomingRunAt(timing, new Date("2026-08-27T00:00:00+09:00")),
    runAtFromDate("2026-09-01"),
  );
});
