/**
 * 정기 청구 예약의 실행일 계산.
 *
 * 예약일은 "달력 날짜"(JST)로 다루고, DB(next_run_at, timestamptz)에는 그 날짜의
 * JST 자정을 저장한다. cron 은 09:30 JST 에 돌면서 next_run_at <= now() 인 예약을
 * 집어간다. 서버 타임존에 흔들리지 않도록 내부 계산은 전부 UTC 기준 수치로 한다.
 */

export type PeriodicCycle = "monthly" | "yearly" | "weekly";
export type PeriodicDayMode = "day" | "last";
export type PeriodicEndMode = "none" | "date";

export type ScheduleTiming = {
  /** YYYY-MM-DD */
  startDate: string;
  cycle: PeriodicCycle;
  dayMode: PeriodicDayMode;
  dayValue: number | null;
  endMode: PeriodicEndMode;
  /** YYYY-MM-DD */
  endDate: string | null;
};

/** 예약 날짜를 해석하는 기준 타임존. 사내 통합판은 JST 고정. */
export const PERIODIC_TZ_OFFSET = "+09:00";

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

function formatDate(year: number, month: number, day: number) {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function isValidDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { year: y, month: m, day: d };
}

export function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(date: string, days: number) {
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** 해당 연·월에서 예약이 가리키는 날짜. day_value 는 1–28 이라 말일과 겹치지 않는다. */
function occurrenceInMonth(
  year: number,
  month: number,
  dayMode: PeriodicDayMode,
  dayValue: number | null,
  fallbackDay: number,
) {
  const last = lastDayOfMonth(year, month);
  if (dayMode === "last") return formatDate(year, month, last);
  const raw = dayValue ?? fallbackDay;
  return formatDate(year, month, Math.min(Math.max(raw, 1), last));
}

function shiftMonth(year: number, month: number, delta: number) {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

function withinEnd(date: string | null, timing: ScheduleTiming) {
  if (!date) return null;
  if (timing.endMode === "date" && timing.endDate && date > timing.endDate) return null;
  return date;
}

/** 첫 실행 날짜(YYYY-MM-DD). 종료일을 넘어가면 null. */
export function computeFirstRunDate(timing: ScheduleTiming): string | null {
  if (!isValidDate(timing.startDate)) return null;
  const start = parts(timing.startDate);

  if (timing.cycle === "weekly") {
    // 주간은 시작일 요일을 그대로 따른다(일 지정 없음).
    return withinEnd(timing.startDate, timing);
  }

  if (timing.cycle === "yearly") {
    let candidate = occurrenceInMonth(start.year, start.month, timing.dayMode, timing.dayValue, start.day);
    if (candidate < timing.startDate) {
      candidate = occurrenceInMonth(start.year + 1, start.month, timing.dayMode, timing.dayValue, start.day);
    }
    return withinEnd(candidate, timing);
  }

  let candidate = occurrenceInMonth(start.year, start.month, timing.dayMode, timing.dayValue, start.day);
  if (candidate < timing.startDate) {
    const next = shiftMonth(start.year, start.month, 1);
    candidate = occurrenceInMonth(next.year, next.month, timing.dayMode, timing.dayValue, start.day);
  }
  return withinEnd(candidate, timing);
}

/** 직전 실행 날짜 다음 실행 날짜(YYYY-MM-DD). 종료일을 넘어가면 null. */
export function computeNextRunDate(timing: ScheduleTiming, previousRunDate: string): string | null {
  if (!isValidDate(previousRunDate) || !isValidDate(timing.startDate)) return null;
  const start = parts(timing.startDate);
  const prev = parts(previousRunDate);

  if (timing.cycle === "weekly") {
    return withinEnd(addDays(previousRunDate, 7), timing);
  }

  if (timing.cycle === "yearly") {
    return withinEnd(
      occurrenceInMonth(prev.year + 1, prev.month, timing.dayMode, timing.dayValue, start.day),
      timing,
    );
  }

  const next = shiftMonth(prev.year, prev.month, 1);
  return withinEnd(
    occurrenceInMonth(next.year, next.month, timing.dayMode, timing.dayValue, start.day),
    timing,
  );
}

/** 오늘(JST)의 달력 날짜. 예약을 과거 날짜로 잡지 않기 위한 기준. */
export function todayInScheduleTz(now: Date = new Date()): string {
  return dateFromRunAt(now);
}

/**
 * `fromDate` 이후(당일 포함) 첫 실행 날짜.
 * 시작일을 과거로 잡거나 예약을 수정했을 때, 이미 지난 날짜로 예약되지 않게 한다.
 */
export function computeRunDateOnOrAfter(
  timing: ScheduleTiming,
  fromDate: string,
): string | null {
  let candidate = computeFirstRunDate(timing);
  // 시작일이 아주 과거여도 끝나는 루프. (주간 최악 기준 넉넉히)
  for (let i = 0; candidate !== null && candidate < fromDate && i < 5000; i += 1) {
    candidate = computeNextRunDate(timing, candidate);
  }
  return candidate !== null && candidate >= fromDate ? candidate : null;
}

/** 달력 날짜 → next_run_at 에 넣을 타임스탬프(JST 자정). */
export function runAtFromDate(date: string): string {
  return new Date(`${date}T00:00:00${PERIODIC_TZ_OFFSET}`).toISOString();
}

/** next_run_at → 청구일로 쓸 달력 날짜(JST). */
export function dateFromRunAt(runAt: string | Date): string {
  const ms = runAt instanceof Date ? runAt.getTime() : Date.parse(runAt);
  if (!Number.isFinite(ms)) return "";
  const shifted = new Date(ms + 9 * 60 * 60 * 1000);
  return formatDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function computeFirstRunAt(timing: ScheduleTiming): string | null {
  const date = computeFirstRunDate(timing);
  return date ? runAtFromDate(date) : null;
}

/** 오늘(JST) 이후 첫 실행 타임스탬프. 예약 생성·수정 시 next_run_at 값이다. */
export function computeUpcomingRunAt(timing: ScheduleTiming, now: Date = new Date()): string | null {
  const date = computeRunDateOnOrAfter(timing, todayInScheduleTz(now));
  return date ? runAtFromDate(date) : null;
}

export function computeNextRunAt(timing: ScheduleTiming, previousRunAt: string | Date): string | null {
  const previousDate = dateFromRunAt(previousRunAt);
  if (!previousDate) return null;
  const date = computeNextRunDate(timing, previousDate);
  return date ? runAtFromDate(date) : null;
}
