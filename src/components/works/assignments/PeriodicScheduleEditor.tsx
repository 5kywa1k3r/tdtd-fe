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
import { parseIsoDate } from "./scheduleCalendarUtils";
import { ScheduleCalendarRulePicker } from "./ScheduleCalendarRulePicker";

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

export const PeriodicScheduleEditor: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  workStartDate,
  workEndDate,
}) => {
  const s = ensureSchedule(value, workStartDate);

  const setPartial = (patch: Partial<AssignmentScheduleDto>) => {
    onChange({ ...s, ...patch });
  };

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
              label="Loại kỳ"
              value={
                s.cycleType === "WEEKLY" &&
                ((s.weekDays ?? []).length === 7 || (s.weekDays ?? []).length === 0)
                  ? "DAILY"
                  : (s.cycleType ?? "WEEKLY")
              }
              disabled={disabled}
              onChange={(e) => {
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
                    weekDays: [1], // ✅ mặc định thứ 2
                  });
                  return;
                }

                onChange(resetByCycle(v as ReportCycleType, workStartDate));
              }}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="DAILY">Hàng ngày</MenuItem>
              <MenuItem value="WEEKLY">Tuần</MenuItem>
              <MenuItem value="MONTHLY">Tháng</MenuItem>
              <MenuItem value="QUARTERLY">Quý</MenuItem>
              <MenuItem value="SEMI_ANNUAL">Nửa năm</MenuItem>
            </TextField>

            <TextField
              size="small"
              type="date"
              label="Ngày bắt đầu áp dụng"
              value={s.startDate ? String(s.startDate).slice(0, 10) : ""}
              disabled={disabled}
              onChange={(e) =>
                setPartial({
                  startDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: workStartDate ? String(workStartDate).slice(0, 10) : undefined,
                max: workEndDate ? String(workEndDate).slice(0, 10) : undefined,
              }}
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
};