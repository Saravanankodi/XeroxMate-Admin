import "server-only";

import type { TimeRange } from "@/types/analytics";

/**
 * Date bucketing for dashboard/analytics series.
 *
 * The product is India-facing, so "today" and daily buckets are computed in
 * IST regardless of where the server runs.
 */
const IST = "Asia/Kolkata";

const RANGE_DAYS: Record<TimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

/** `YYYY-MM-DD` of an instant in IST. */
export function dateKey(value: string | number | Date): string {
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: IST,
  });
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** `YYYY-MM-DD` for `days` days ago (0 = today). */
export function daysAgoKey(days: number): string {
  return dateKey(Date.now() - days * 86400000);
}

export function rangeDays(range: TimeRange): number {
  return RANGE_DAYS[range] ?? 30;
}

/** Ascending `YYYY-MM-DD` keys covering the range, ending today. */
export function rangeDayKeys(range: TimeRange): string[] {
  const days = rangeDays(range);

  return Array.from({ length: days }, (_, index) =>
    daysAgoKey(days - 1 - index)
  );
}
