import React from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import { Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import { UITextKey, uiText } from '../../constants/uiText';

type Props = {
  label: string;
  value: string; // yyyyMMdd
  onChange?: (value: string) => void; // yyyyMMdd
  name?: string;
  id?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  sx?: any;
  placeholder?: string;
  onEnterPress?: () => void;
  minDayKey?: string;
  maxDayKey?: string;
};

export function normalizeDayKey(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 8);
}

export function dayKeyToDisplay(dayKey?: string | null) {
  const normalized = normalizeDayKey(dayKey);
  if (normalized.length !== 8) return "";
  return `${normalized.slice(6, 8)}/${normalized.slice(4, 6)}/${normalized.slice(0, 4)}`;
}

export function dayKeyToIsoDate(dayKey?: string | null) {
  const normalized = normalizeDayKey(dayKey);
  if (normalized.length !== 8) return "";
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
}

export function isoDateToDayKey(value?: string | null) {
  const normalized = (value ?? "").trim();
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return "";
  return `${matched[1]}${matched[2]}${matched[3]}`;
}

function dayKeyToDate(dayKey?: string | null) {
  const normalized = normalizeDayKey(dayKey);
  if (!isValidDayKey(normalized)) return null;

  const yyyy = Number(normalized.slice(0, 4));
  const mm = Number(normalized.slice(4, 6));
  const dd = Number(normalized.slice(6, 8));
  return new Date(yyyy, mm - 1, dd);
}

function pickerValueToDayKey(value: Date | string | null) {
  if (!value) return "";

  if (typeof value === "string") {
    const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matched) return `${matched[1]}${matched[2]}${matched[3]}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function digitsToDisplay(digits: string) {
  const clean = digits.replace(/\D/g, "").slice(0, 8);
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
}

function displayDigitsToDayKey(digits: string) {
  const clean = digits.replace(/\D/g, "").slice(0, 8);
  if (clean.length !== 8) return "";

  const dd = clean.slice(0, 2);
  const mm = clean.slice(2, 4);
  const yyyy = clean.slice(4, 8);

  return `${yyyy}${mm}${dd}`;
}

function isValidDayKey(dayKey?: string | null) {
  const normalized = normalizeDayKey(dayKey);
  if (normalized.length !== 8) return false;

  const yyyy = Number(normalized.slice(0, 4));
  const mm = Number(normalized.slice(4, 6));
  const dd = Number(normalized.slice(6, 8));

  if (!yyyy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;

  const dt = new Date(yyyy, mm - 1, dd);
  return (
    dt.getFullYear() === yyyy &&
    dt.getMonth() === mm - 1 &&
    dt.getDate() === dd
  );
}

const SingleDayKeyField: React.FC<Props> = ({
  label,
  value,
  onChange,
  name,
  id,
  disabled,
  fullWidth,
  sx,
  placeholder = "dd/MM/yyyy",
  onEnterPress,
  minDayKey,
  maxDayKey,
}) => {
  const [displayValue, setDisplayValue] = React.useState(dayKeyToDisplay(value));
  const [pickerOpened, setPickerOpened] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id ?? name ?? `single-day-${generatedId}`;

  React.useEffect(() => {
    setDisplayValue(dayKeyToDisplay(value));
  }, [value]);

  return (
    <Box lang="vi" sx={{ width: fullWidth ? "100%" : undefined, ...sx }}>
      <TextField
        id={inputId}
        name={name ?? inputId}
        size="small"
        label={label}
        value={displayValue}
        disabled={disabled}
        placeholder={placeholder}
        inputProps={{ inputMode: "numeric", maxLength: 10, lang: "vi" }}
        fullWidth={fullWidth}
        onChange={(e) => {
          const nextDisplay = digitsToDisplay(e.target.value);
          const nextDigits = nextDisplay.replace(/\D/g, "");
          const nextDayKey = normalizeDayKey(displayDigitsToDayKey(nextDigits));

          setDisplayValue(nextDisplay);
          onChange?.(nextDayKey);
        }}
        onBlur={() => {
          const normalized = normalizeDayKey(value);
          if (!normalized) {
            setDisplayValue("");
            return;
          }

          if (isValidDayKey(normalized)) {
            setDisplayValue(dayKeyToDisplay(normalized));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnterPress?.();
          }
        }}
        InputProps={{
          endAdornment: disabled ? undefined : (
            <InputAdornment position="end">
              <Popover
                opened={pickerOpened}
                onChange={setPickerOpened}
                position="bottom-end"
                shadow="md"
                withinPortal
                zIndex={20000}
              >
                <Popover.Target>
                  <IconButton
                    edge="end"
                    title={uiText(UITextKey.TextChonNgay)}
                    aria-label={uiText(UITextKey.TextChonNgay)}
                    onClick={() => setPickerOpened((opened) => !opened)}
                  >
                    <CalendarTodayOutlinedIcon fontSize="small" />
                  </IconButton>
                </Popover.Target>
                <Popover.Dropdown>
                  <DatePicker
                    locale="vi"
                    value={dayKeyToDate(value)}
                    minDate={dayKeyToDate(minDayKey) ?? undefined}
                    maxDate={dayKeyToDate(maxDayKey) ?? undefined}
                    onChange={(next) => {
                      onChange?.(pickerValueToDayKey(next));
                      setPickerOpened(false);
                    }}
                  />
                </Popover.Dropdown>
              </Popover>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export default SingleDayKeyField;
