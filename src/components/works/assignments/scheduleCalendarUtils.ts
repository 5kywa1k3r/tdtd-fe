import dayjs, { Dayjs } from "dayjs";
import type {
  AssignmentScheduleDto,
  QuarterDayRuleDto,
  SemiAnnualDayRuleDto,
} from "../../../types/workAssignment";

export function parseIsoDate(value?: string | null): Dayjs | null {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
}

export function toIsoDate(d: Dayjs): string {
  return d.startOf("day").format("YYYY-MM-DD");
}

export function ensureRange(
  workStartDate?: string | null,
  workEndDate?: string | null,
  scheduleStartDate?: string | null
) {
  const ws = parseIsoDate(workStartDate)?.startOf("day") ?? null;
  const we = parseIsoDate(workEndDate)?.endOf("day") ?? null;

  if (!ws || !we || we.isBefore(ws)) {
    return { from: null as Dayjs | null, to: null as Dayjs | null };
  }

  const sd = parseIsoDate(scheduleStartDate)?.startOf("day") ?? null;
  const from = sd && sd.isAfter(ws) ? sd : ws;

  if (from.isAfter(we)) {
    return { from: null as Dayjs | null, to: null as Dayjs | null };
  }

  return { from, to: we };
}

// nghiệp vụ: 1=Mon ... 7=Sun
export function toBusinessWeekday(d: Dayjs): number {
  const dow = d.day(); // Sun=0
  return dow === 0 ? 7 : dow;
}

export function weekdayLabel(v: number): string {
  switch (v) {
    case 1: return "Thứ 2";
    case 2: return "Thứ 3";
    case 3: return "Thứ 4";
    case 4: return "Thứ 5";
    case 5: return "Thứ 6";
    case 6: return "Thứ 7";
    case 7: return "Chủ nhật";
    default: return `Thứ ${v}`;
  }
}

export function quarterOfDate(d: Dayjs): number {
  return Math.floor(d.month() / 3) + 1;
}

export function quarterStartOf(d: Dayjs): Dayjs {
  const q = Math.floor(d.month() / 3);
  return d.startOf("year").month(q * 3).startOf("month").startOf("day");
}

export function offsetInQuarter(d: Dayjs): number {
  return d.startOf("day").diff(quarterStartOf(d), "day") + 1;
}

export function halfOfDate(d: Dayjs): 1 | 2 {
  return d.month() < 6 ? 1 : 2;
}

export function halfStartOf(d: Dayjs): Dayjs {
  return d.month() < 6
    ? d.startOf("year").month(0).startOf("month").startOf("day")
    : d.startOf("year").month(6).startOf("month").startOf("day");
}

export function offsetInHalf(d: Dayjs): number {
  return d.startOf("day").diff(halfStartOf(d), "day") + 1;
}

function formatWeekdayShort(v: number): string {
  return v === 7 ? "CN" : String(v + 1);
}

function buildWeeklySummary(schedule: AssignmentScheduleDto): string {
  const days = (schedule.weekDays ?? []).slice().sort((a, b) => a - b);
  if (days.length === 0) return "Chưa chọn quy tắc nào.";

  const allDays = [1, 2, 3, 4, 5, 6, 7];
  const isDaily = days.length === 7 && allDays.every((x, i) => x === days[i]);

  if (isDaily) {
    if (schedule.startDate) {
      return `Hàng ngày, từ ${dayjs(schedule.startDate).format("DD/MM/YYYY")}`;
    }
    return "Hàng ngày";
  }

  return `Thứ ${days.map(formatWeekdayShort).join(", ")} hàng tuần`;
}

function buildMonthlySummary(schedule: AssignmentScheduleDto): string {
  const days = (schedule.monthDays ?? []).slice().sort((a, b) => a - b);
  if (days.length === 0) return "Chưa chọn quy tắc nào.";
  return `Ngày ${days.join(", ")} hàng tháng`;
}

function quarterOffsetToDate(year: number, quarter: number, offset: number): Dayjs | null {
  const startMonth = (quarter - 1) * 3;
  const start = dayjs().year(year).month(startMonth).startOf("month").startOf("day");
  const d = start.add(offset - 1, "day");
  const end = start.add(3, "month").subtract(1, "day");
  if (d.isAfter(end, "day")) return null;
  return d;
}

function halfOffsetToDate(year: number, half: 1 | 2, offset: number): Dayjs | null {
  const startMonth = half === 1 ? 0 : 6;
  const start = dayjs().year(year).month(startMonth).startOf("month").startOf("day");
  const d = start.add(offset - 1, "day");
  const end = start.add(6, "month").subtract(1, "day");
  if (d.isAfter(end, "day")) return null;
  return d;
}

function buildQuarterlySummary(
  schedule: AssignmentScheduleDto,
  workStartDate?: string | null,
  workEndDate?: string | null
): string {
  const years = new Set<number>();

  const ws = parseIsoDate(workStartDate);
  const we = parseIsoDate(workEndDate);

  if (ws) years.add(ws.year());
  if (we) years.add(we.year());
  if (years.size === 0) years.add(dayjs().year());

  const out: string[] = [];

  for (const item of schedule.quarterDays ?? []) {
    const q = item.quarter;
    const days = (item.days ?? []).slice().sort((a, b) => a - b);

    for (const year of Array.from(years).sort((a, b) => a - b)) {
      for (const offset of days) {
        const d = quarterOffsetToDate(year, q, offset);
        if (!d) continue;
        out.push(`Ngày ${d.format("DD/MM")} quý ${q} năm ${year}`);
      }
    }
  }

  return out.length > 0 ? out.join("; ") : "Chưa chọn quy tắc nào.";
}

function buildSemiAnnualSummary(
  schedule: AssignmentScheduleDto,
  workStartDate?: string | null,
  workEndDate?: string | null
): string {
  const years = new Set<number>();

  const ws = parseIsoDate(workStartDate);
  const we = parseIsoDate(workEndDate);

  if (ws) years.add(ws.year());
  if (we) years.add(we.year());
  if (years.size === 0) years.add(dayjs().year());

  const out: string[] = [];

  for (const item of schedule.semiAnnualDays ?? []) {
    const half = item.half as 1 | 2;
    const days = (item.days ?? []).slice().sort((a, b) => a - b);

    for (const year of Array.from(years).sort((a, b) => a - b)) {
      for (const offset of days) {
        const d = halfOffsetToDate(year, half, offset);
        if (!d) continue;
        out.push(`Ngày ${d.format("DD/MM/YYYY")}`);
      }
    }
  }

  return out.length > 0 ? out.join("; ") : "Chưa chọn quy tắc nào.";
}

export function buildRuleSummaryText(
  schedule: AssignmentScheduleDto,
  workStartDate?: string | null,
  workEndDate?: string | null
): string {
  const cycleType = schedule.cycleType ?? "WEEKLY";

  switch (cycleType) {
    case "WEEKLY":
      return buildWeeklySummary(schedule);
    case "MONTHLY":
      return buildMonthlySummary(schedule);
    case "QUARTERLY":
      return buildQuarterlySummary(schedule, workStartDate, workEndDate);
    case "SEMI_ANNUAL":
      return buildSemiAnnualSummary(schedule, workStartDate, workEndDate);
    default:
      return "Chưa chọn quy tắc nào.";
  }
}

function toggleNumber(list: number[] | null | undefined, value: number): number[] {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set).sort((a, b) => a - b);
}

function upsertQuarter(
  list: QuarterDayRuleDto[] | null | undefined,
  quarter: number,
  days: number[]
): QuarterDayRuleDto[] {
  const next = [...(list ?? []).filter((x) => x.quarter !== quarter)];
  if (days.length > 0) next.push({ quarter, days });
  return next.sort((a, b) => a.quarter - b.quarter);
}

function upsertHalf(
  list: SemiAnnualDayRuleDto[] | null | undefined,
  half: number,
  days: number[]
): SemiAnnualDayRuleDto[] {
  const next = [...(list ?? []).filter((x) => x.half !== half)];
  if (days.length > 0) next.push({ half, days });
  return next.sort((a, b) => a.half - b.half);
}

export function toggleRuleFromDate(
  schedule: AssignmentScheduleDto,
  date: Dayjs
): AssignmentScheduleDto {
  const cycleType = schedule.cycleType ?? "WEEKLY";

  switch (cycleType) {
    case "WEEKLY": {
      const weekday = toBusinessWeekday(date);
      return {
        ...schedule,
        weekDays: toggleNumber(schedule.weekDays, weekday),
      };
    }

    case "MONTHLY": {
      const day = date.date();
      return {
        ...schedule,
        monthDays: toggleNumber(schedule.monthDays, day),
      };
    }

    case "QUARTERLY": {
      const quarter = quarterOfDate(date);
      const day = offsetInQuarter(date);
      const current = (schedule.quarterDays ?? []).find((x) => x.quarter === quarter)?.days ?? [];
      return {
        ...schedule,
        quarterDays: upsertQuarter(schedule.quarterDays, quarter, toggleNumber(current, day)),
      };
    }

    case "SEMI_ANNUAL": {
      const half = halfOfDate(date);
      const day = offsetInHalf(date);
      const current = (schedule.semiAnnualDays ?? []).find((x) => x.half === half)?.days ?? [];
      return {
        ...schedule,
        semiAnnualDays: upsertHalf(schedule.semiAnnualDays, half, toggleNumber(current, day)),
      };
    }

    default:
      return schedule;
  }
}

export function matchesScheduleDate(schedule: AssignmentScheduleDto, d: Dayjs): boolean {
  const cycleType = schedule.cycleType ?? "WEEKLY";

  switch (cycleType) {
    case "WEEKLY":
      return (schedule.weekDays ?? []).includes(toBusinessWeekday(d));

    case "MONTHLY":
      return (schedule.monthDays ?? []).includes(d.date());

    case "QUARTERLY": {
      const q = quarterOfDate(d);
      const days = (schedule.quarterDays ?? []).find((x) => x.quarter === q)?.days ?? [];
      return days.includes(offsetInQuarter(d));
    }

    case "SEMI_ANNUAL": {
      const h = halfOfDate(d);
      const days = (schedule.semiAnnualDays ?? []).find((x) => x.half === h)?.days ?? [];
      return days.includes(offsetInHalf(d));
    }

    default:
      return false;
  }
}

export function generateOccurrences(
  schedule: AssignmentScheduleDto,
  workStartDate?: string | null,
  workEndDate?: string | null
): Dayjs[] {
  const { from, to } = ensureRange(workStartDate, workEndDate, schedule.startDate);
  if (!from || !to) return [];

  const out: Dayjs[] = [];
  let cur = from.clone();

  while (cur.isBefore(to) || cur.isSame(to, "day")) {
    if (matchesScheduleDate(schedule, cur)) {
      out.push(cur.clone());
    }
    cur = cur.add(1, "day");
  }

  return out;
}

export function generateOccurrenceIsoList(
  schedule: AssignmentScheduleDto,
  workStartDate?: string | null,
  workEndDate?: string | null
): string[] {
  return generateOccurrences(schedule, workStartDate, workEndDate).map(toIsoDate);
}

export function formatViDate(value: string | Dayjs): string {
  const d = typeof value === "string" ? dayjs(value) : value;
  return d.format("DD/MM/YYYY");
}

export function buildRuleSummary(schedule: AssignmentScheduleDto): string[] {
  const cycleType = schedule.cycleType ?? "WEEKLY";

  switch (cycleType) {
    case "WEEKLY":
      return (schedule.weekDays ?? []).map(weekdayLabel);

    case "MONTHLY":
      return (schedule.monthDays ?? []).map((x) => `Ngày ${x}`);

    case "QUARTERLY":
      return (schedule.quarterDays ?? []).flatMap((q) =>
        (q.days ?? []).map((d) => `Quý ${q.quarter} · ngày ${d} từ đầu quý`)
      );

    case "SEMI_ANNUAL":
      return (schedule.semiAnnualDays ?? []).flatMap((h) =>
        (h.days ?? []).map((d) =>
          `${h.half === 1 ? "6 tháng đầu năm" : "6 tháng cuối năm"} · ngày ${d} từ đầu nửa năm`
        )
      );

    default:
      return [];
  }
}