import React from "react";
import {
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type {
  AssignmentScheduleDto,
  ReportCycleType,
} from "../../../types/workAssignment";
import SingleDayKeyField, {
  dayKeyToIsoDate,
  isoDateToDayKey,
} from "../../common/SingleDayKeyField";
import { parseIsoDate } from "./scheduleCalendarUtils";
import { ScheduleCalendarRulePicker } from "./ScheduleCalendarRulePicker";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  value: AssignmentScheduleDto | null;
  onChange: (v: AssignmentScheduleDto | null) => void;
  disabled?: boolean;
  workStartDate?: string | null;
  workEndDate?: string | null;
};

function ensureSchedule(
  x: AssignmentScheduleDto | null,
  workStartDate?: string | null
): AssignmentScheduleDto {
  const defaultStart = workStartDate
    ? parseIsoDate(workStartDate)?.toISOString() ?? null
    : null;

  return {
    cycleType: x?.cycleType ?? "WEEKLY",
    startDate: x?.startDate ?? defaultStart,
    weekDays: x?.weekDays ?? [],
    monthDays: x?.monthDays ?? [],
    quarterDays: x?.quarterDays ?? [],
    semiAnnualDays: x?.semiAnnualDays ?? [],
    note: x?.note ?? "",
  };
}

function resetByCycle(
  cycleType: ReportCycleType,
  workStartDate?: string | null
): AssignmentScheduleDto {
  const defaultStart = workStartDate
    ? parseIsoDate(workStartDate)?.toISOString() ?? null
    : null;

  return {
    cycleType,
    startDate: defaultStart,
    weekDays: [],
    monthDays: [],
    quarterDays: [],
    semiAnnualDays: [],
    note: "",
  };
}

export const PeriodicScheduleEditor: React.FC<Props> = React.memo(function PeriodicScheduleEditor({
  value,
  onChange,
  disabled,
  workStartDate,
  workEndDate,
}) {
  const s = React.useMemo(
    () => ensureSchedule(value, workStartDate),
    [value, workStartDate]
  );

  const setPartial = React.useCallback(
    (patch: Partial<AssignmentScheduleDto>) => {
      onChange({ ...s, ...patch });
    },
    [onChange, s]
  );

  const displayCycleType = React.useMemo(() => {
    return s.cycleType === "WEEKLY" &&
      ((s.weekDays ?? []).length === 7 || (s.weekDays ?? []).length === 0)
      ? "DAILY"
      : (s.cycleType ?? "WEEKLY");
  }, [s.cycleType, s.weekDays]);

  const handleCycleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;

      if (v === "DAILY") {
        onChange({
          ...resetByCycle("WEEKLY", workStartDate),
          weekDays: [1, 2, 3, 4, 5, 6, 7],
        });
        return;
      }

      if (v === "WEEKLY") {
        onChange({
          ...resetByCycle("WEEKLY", workStartDate),
          weekDays: [1],
        });
        return;
      }

      onChange(resetByCycle(v as ReportCycleType, workStartDate));
    },
    [onChange, workStartDate]
  );

  const handleStartDateChange = React.useCallback(
    (dayKey: string) => {
      setPartial({
        startDate: dayKey ? `${dayKeyToIsoDate(dayKey)}T00:00:00.000Z` : null,
      });
    },
    [setPartial]
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle2">
            Cấu hình định kỳ báo cáo
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              size="small"
              label={uiText(UITextKey.TextLoaiKy)}
              value={displayCycleType}
              disabled={disabled}
              onChange={handleCycleChange}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="DAILY">{uiText(UITextKey.TextHangNgay)}</MenuItem>
              <MenuItem value="WEEKLY">{uiText(UITextKey.TextTuan)}</MenuItem>
              <MenuItem value="MONTHLY">{uiText(UITextKey.TextThang)}</MenuItem>
              <MenuItem value="QUARTERLY">{uiText(UITextKey.TextQuy)}</MenuItem>
              <MenuItem value="SEMI_ANNUAL">{uiText(UITextKey.TextNuaNam)}</MenuItem>
            </TextField>

            <SingleDayKeyField
              label={uiText(UITextKey.TextNgayBatDauApDung)}
              value={s.startDate ? isoDateToDayKey(String(s.startDate).slice(0, 10)) : ""}
              disabled={disabled}
              fullWidth
              minDayKey={workStartDate ? isoDateToDayKey(String(workStartDate).slice(0, 10)) : ""}
              maxDayKey={workEndDate ? isoDateToDayKey(String(workEndDate).slice(0, 10)) : ""}
              onChange={handleStartDateChange}
            />
          </Stack>

          <ScheduleCalendarRulePicker
            value={s}
            onChange={onChange}
            disabled={disabled}
            workStartDate={workStartDate}
            workEndDate={workEndDate}
          />
        </Stack>
      </CardContent>
    </Card>
  );
});
