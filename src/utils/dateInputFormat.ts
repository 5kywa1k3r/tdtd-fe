export type DateInputMode = "flexible" | "full";

export type DateInputPrecision = "day" | "month" | "year";

export type DateInputParseResult = {
  ok: boolean;
  value: string | null;
  precision: DateInputPrecision | null;
};

export const FLEXIBLE_DATE_FORMAT_LABEL = "dd/MM/yyyy, MM/yyyy hoặc yyyy";
export const FULL_DATE_FORMAT_LABEL = "dd/MM/yyyy";

const DAY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MONTH_RE = /^(\d{2})\/(\d{4})$/;
const YEAR_RE = /^(\d{4})$/;
const ISO_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/;

export function getDateInputFormatLabel(mode: DateInputMode) {
  return mode === "full" ? FULL_DATE_FORMAT_LABEL : FLEXIBLE_DATE_FORMAT_LABEL;
}

export function parseDateInput(value: unknown, mode: DateInputMode): DateInputParseResult {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { ok: true, value: null, precision: null };

  const iso = ISO_DAY_RE.exec(text);
  if (iso) {
    const [, yearText, monthText, dayText] = iso;
    const normalized = `${dayText}/${monthText}/${yearText}`;
    return isValidDay(Number(dayText), Number(monthText), Number(yearText))
      ? { ok: true, value: normalized, precision: "day" }
      : { ok: false, value: null, precision: null };
  }

  const day = DAY_RE.exec(text);
  if (day) {
    const [, dayText, monthText, yearText] = day;
    return isValidDay(Number(dayText), Number(monthText), Number(yearText))
      ? { ok: true, value: text, precision: "day" }
      : { ok: false, value: null, precision: null };
  }

  if (mode === "full") {
    return { ok: false, value: null, precision: null };
  }

  const month = MONTH_RE.exec(text);
  if (month) {
    const [, monthText, yearText] = month;
    const monthNumber = Number(monthText);
    const year = Number(yearText);
    return isValidYear(year) && monthNumber >= 1 && monthNumber <= 12
      ? { ok: true, value: text, precision: "month" }
      : { ok: false, value: null, precision: null };
  }

  const year = YEAR_RE.exec(text);
  if (year) {
    const yearNumber = Number(year[1]);
    return isValidYear(yearNumber)
      ? { ok: true, value: text, precision: "year" }
      : { ok: false, value: null, precision: null };
  }

  return { ok: false, value: null, precision: null };
}

export function normalizeDateInputValue(value: unknown, mode: DateInputMode): string | null {
  const parsed = parseDateInput(value, mode);
  return parsed.ok ? parsed.value : null;
}

export function isDateInputValueValid(value: unknown, mode: DateInputMode) {
  return parseDateInput(value, mode).ok;
}

export function getDateInputErrorText(label: string, mode: DateInputMode) {
  return `${label} phải đúng định dạng ${getDateInputFormatLabel(mode)}.`;
}

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 1 && year <= 9999;
}

function isValidDay(day: number, month: number, year: number) {
  if (!isValidYear(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return false;
  }

  const maxDay = new Date(year, month, 0).getDate();
  return Number.isInteger(day) && day >= 1 && day <= maxDay;
}
