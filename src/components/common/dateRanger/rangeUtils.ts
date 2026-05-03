import dayjs, { Dayjs } from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(quarterOfYear);

export type HierarchyRangeType = "day" | "month" | "quarter" | "year";

export interface HierarchyRangeValue {
  type: HierarchyRangeType;
  from: Dayjs | null;
  to: Dayjs | null;
}

export function normalizeRange(
  type: HierarchyRangeType,
  from: Dayjs | null,
  to: Dayjs | null
): HierarchyRangeValue {
  let f = from;
  let t = to;

  if (f && t && f.isAfter(t)) {
    t = f;
  }

  switch (type) {
    case "day":
      return {
        type,
        from: f ? f.startOf("day") : null,
        to: t ? t.endOf("day") : null,
      };

    case "month":
      return {
        type,
        from: f ? f.startOf("month") : null,
        to: t ? t.endOf("month") : null,
      };

    case "quarter":
      return {
        type,
        from: f ? f.startOf("quarter") : null,
        to: t ? t.endOf("quarter") : null,
      };

    case "year":
      return {
        type,
        from: f ? f.startOf("year") : null,
        to: t ? t.endOf("year") : null,
      };

    default:
      return { type, from: f, to: t };
  }
}

export function formatRangeLabel(value?: HierarchyRangeValue | null): string {
  if (!value) return "";

  const { type, from, to } = value;
  if (!from && !to) return "";

  const fmt = (() => {
    switch (type) {
      case "day":
        return "DD/MM/YYYY";
      case "month":
        return "MM/YYYY";
      case "quarter":
        return "[Q]Q/YYYY";
      case "year":
        return "YYYY";
    }
  })();

  if (from && !to) return `Từ ${from.format(fmt)}`;
  if (!from && to) return `Đến ${to.format(fmt)}`;
  return `${from!.format(fmt)} – ${to!.format(fmt)}`;
}

export function getComparableValue(
  type: HierarchyRangeType,
  value: Dayjs | null
): Dayjs | null {
  if (!value) return null;

  switch (type) {
    case "day":
      return value.startOf("day");
    case "month":
      return value.startOf("month");
    case "quarter":
      return value.startOf("quarter");
    case "year":
      return value.startOf("year");
    default:
      return value;
  }
}

export function isAfterByType(
  type: HierarchyRangeType,
  left: Dayjs | null,
  right: Dayjs | null
): boolean {
  const l = getComparableValue(type, left);
  const r = getComparableValue(type, right);
  if (!l || !r) return false;
  return l.isAfter(r);
}

export function isBeforeByType(
  type: HierarchyRangeType,
  left: Dayjs | null,
  right: Dayjs | null
): boolean {
  const l = getComparableValue(type, left);
  const r = getComparableValue(type, right);
  if (!l || !r) return false;
  return l.isBefore(r);
}

export function quarterStart(year: number, quarter: number): Dayjs {
  const month = (quarter - 1) * 3;
  return dayjs().year(year).month(month).startOf("quarter");
}