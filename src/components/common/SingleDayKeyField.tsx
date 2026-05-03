import React from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";

type Props = {
  label: string;
  value: string; // yyyyMMdd
  onChange?: (value: string) => void; // yyyyMMdd
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
  disabled,
  fullWidth,
  sx,
  placeholder = "dd/MM/yyyy",
  onEnterPress,
  minDayKey,
  maxDayKey,
}) => {
  const [displayValue, setDisplayValue] = React.useState(dayKeyToDisplay(value));
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setDisplayValue(dayKeyToDisplay(value));
  }, [value]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;

    if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
      (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
      return;
    }

    input.click();
  }, [disabled]);

  return (
    <Box lang="vi" sx={{ width: fullWidth ? "100%" : undefined, ...sx }}>
      <input
        ref={inputRef}
        type="date"
        lang="vi"
        value={dayKeyToIsoDate(value)}
        min={dayKeyToIsoDate(minDayKey)}
        max={dayKeyToIsoDate(maxDayKey)}
        disabled={disabled}
        onChange={(e) => onChange?.(isoDateToDayKey(e.target.value))}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <TextField
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
              <Tooltip title="Chọn ngày">
                <IconButton edge="end" onClick={openPicker}>
                  <CalendarTodayOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export default SingleDayKeyField;