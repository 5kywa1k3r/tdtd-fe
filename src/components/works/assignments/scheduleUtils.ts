import dayjs, { Dayjs } from "dayjs";

export function parseIsoDate(value?: string | null): Dayjs | null {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
}

export function clampRange(
  workStart?: string | null,
  workEnd?: string | null,
  startDate?: string | null
) {
  const ws = parseIsoDate(workStart)?.startOf("day") ?? null;
  const we = parseIsoDate(workEnd)?.endOf("day") ?? null;
  const sd = parseIsoDate(startDate)?.startOf("day") ?? null;

  if (!ws || !we || we.isBefore(ws)) {
    return { from: null as Dayjs | null, to: null as Dayjs | null };
  }

  const from = sd && sd.isAfter(ws) ? sd : ws;
  return { from, to: we };
}

// Quy ước nghiệp vụ:
// 1 = Monday ... 7 = Sunday
export function toBusinessWeekday(d: Dayjs): number {
  const dow = d.day(); // 0..6, Sunday=0
  return dow === 0 ? 7 : dow;
}

export function getValidWeekdays(workStart?: string | null, workEnd?: string | null, startDate?: string | null) {
  const { from, to } = clampRange(workStart, workEnd, startDate);
  if (!from || !to) return [];

  const set = new Set<number>();
  let cur = from.clone();

  while (cur.isBefore(to) || cur.isSame(to, "day")) {
    set.add(toBusinessWeekday(cur));
    cur = cur.add(1, "day");
  }

  return Array.from(set).sort((a, b) => a - b);
}

export function getValidMonthDays(workStart?: string | null, workEnd?: string | null, startDate?: string | null) {
  const { from, to } = clampRange(workStart, workEnd, startDate);
  if (!from || !to) return [];

  const set = new Set<number>();
  let cur = from.clone();

  while (cur.isBefore(to) || cur.isSame(to, "day")) {
    set.add(cur.date());
    cur = cur.add(1, "day");
  }

  return Array.from(set).sort((a, b) => a - b);
}

function quarterStartOf(d: Dayjs) {
  const q = Math.floor(d.month() / 3);
  return d.startOf("year").month(q * 3).startOf("month").startOf("day");
}

function quarterOfDate(d: Dayjs): number {
  return Math.floor(d.month() / 3) + 1;
}

export function getValidQuarterOffsets(
  quarter: number,
  workStart?: string | null,
  workEnd?: string | null,
  startDate?: string | null
) {
  const { from, to } = clampRange(workStart, workEnd, startDate);
  if (!from || !to) return [];

  const set = new Set<number>();
  let cur = from.clone();

  while (cur.isBefore(to) || cur.isSame(to, "day")) {
    if (quarterOfDate(cur) === quarter) {
      const offset = cur.startOf("day").diff(quarterStartOf(cur), "day") + 1;
      if (offset >= 1 && offset <= 92) set.add(offset);
    }
    cur = cur.add(1, "day");
  }

  return Array.from(set).sort((a, b) => a - b);
}

function halfStartOf(d: Dayjs) {
  const half = d.month() < 6 ? 0 : 6;
  return d.startOf("year").month(half).startOf("month").startOf("day");
}

function halfOfDate(d: Dayjs): 1 | 2 {
  return d.month() < 6 ? 1 : 2;
}

export function getValidHalfOffsets(
  half: 1 | 2,
  workStart?: string | null,
  workEnd?: string | null,
  startDate?: string | null
) {
  const { from, to } = clampRange(workStart, workEnd, startDate);
  if (!from || !to) return [];

  const set = new Set<number>();
  let cur = from.clone();

  while (cur.isBefore(to) || cur.isSame(to, "day")) {
    if (halfOfDate(cur) === half) {
      const offset = cur.startOf("day").diff(halfStartOf(cur), "day") + 1;
      if (offset >= 1 && offset <= 184) set.add(offset);
    }
    cur = cur.add(1, "day");
  }

  return Array.from(set).sort((a, b) => a - b);
}

export function chunkNumbers(values: number[], chunkSize: number) {
  const out: number[][] = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    out.push(values.slice(i, i + chunkSize));
  }
  return out;
}