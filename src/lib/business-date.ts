/** Documents use the service's Japanese business calendar, independent of server timezone. */
export function businessDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
}

export function dashboardMonthBounds(now = new Date()) {
  const today = businessDateKey(now);
  const [year, month] = today.split("-").map(Number);
  const boundary = (offset: number) => new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
  return { today, monthStart: boundary(0), nextMonthStart: boundary(1), lastMonthStart: boundary(-1) };
}
