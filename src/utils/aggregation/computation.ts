import type { ComputationType } from "../../types/workAssignment";

export function normalizeNumbers(values: Array<number | null | undefined>) {
  return values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
}

export function computeAggregateValue(
  values: Array<number | null | undefined>,
  computationType: ComputationType
): number | null {
  const nums = normalizeNumbers(values);
  if (nums.length === 0) return null;

  switch (computationType) {
    case "SUM":
      return nums.reduce((s, x) => s + x, 0);

    case "MEAN":
      return nums.reduce((s, x) => s + x, 0) / nums.length;

    case "MAX":
      return Math.max(...nums);

    case "MIN":
      return Math.min(...nums);

    default:
      return null;
  }
}