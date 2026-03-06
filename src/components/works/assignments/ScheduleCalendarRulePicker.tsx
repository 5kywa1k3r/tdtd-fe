import React from "react";
import dayjs from "dayjs";
import "dayjs/locale/vi";

import {
  Box,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import { DatePicker } from "@mantine/dates";

import type { AssignmentScheduleDto } from "../../../types/workAssignment";
import {
  buildRuleSummaryText,
  ensureRange,
  formatViDate,
  generateOccurrenceIsoList,
  toggleRuleFromDate,
  toIsoDate,
} from "./scheduleCalendarUtils";

dayjs.locale("vi");

type Props = {
  value: AssignmentScheduleDto;
  onChange: (next: AssignmentScheduleDto) => void;
  disabled?: boolean;
  workStartDate?: string | null;
  workEndDate?: string | null;
  showStartDateSummary?: boolean;
};

function helperTextByCycle(cycleType?: string | null) {
  switch (cycleType) {
    case "DAILY": 
      return "Hằng ngày";
    case "WEEKLY":
      return "Chọn một ngày trên lịch để bật/tắt thứ tương ứng. Các ngày cùng thứ hợp lệ sẽ được chọn.";
    case "MONTHLY":
      return "Chọn một ngày trên lịch để bật/tắt ngày trong tháng tương ứng. Các tháng hợp lệ sẽ tự áp dụng.";
    case "QUARTERLY":
      return "Chọn một ngày trên lịch để bật/tắt vị trí ngày đó trong quý tương ứng.";
    case "SEMI_ANNUAL":
      return "Chọn một ngày trên lịch để bật/tắt vị trí ngày đó trong nửa năm tương ứng.";
    default:
      return "";
  }
}

export const ScheduleCalendarRulePicker: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  workStartDate,
  workEndDate,
  showStartDateSummary = false,
}) => {
  const { from, to } = React.useMemo(
    () => ensureRange(workStartDate, workEndDate, value.startDate),
    [workStartDate, workEndDate, value.startDate]
  );

  const selectedIsoList = React.useMemo(
    () => generateOccurrenceIsoList(value, workStartDate, workEndDate),
    [value, workStartDate, workEndDate]
  );

  const selectedSet = React.useMemo(() => new Set(selectedIsoList), [selectedIsoList]);
  const ruleText = React.useMemo(
    () => buildRuleSummaryText(value, workStartDate, workEndDate),
    [value, workStartDate, workEndDate]
  );

  if (!from || !to) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          Chưa có khoảng thời gian hợp lệ của Work để cấu hình lịch.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {showStartDateSummary && value.startDate && (
        <Typography variant="caption" color="text.secondary">
          Áp dụng từ: {formatViDate(value.startDate)}
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary">
        {helperTextByCycle(value.cycleType)}
      </Typography>

      <Box
        sx={{
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 2,
          p: 1.5,
          overflowX: "auto",
        }}
      >
        <DatePicker
          type="multiple"
          locale="vi"
          numberOfColumns={2}
          value={selectedIsoList}
          defaultDate={from.format("YYYY-MM-DD")}
          minDate={from.format("YYYY-MM-DD")}
          maxDate={to.format("YYYY-MM-DD")}
          onChange={() => {}}
          getDayProps={(date) => {
            const d = dayjs(date);
            const iso = toIsoDate(d);
            const isSelected = selectedSet.has(iso);
            const inRange =
              !d.isBefore(from, "day") &&
              !d.isAfter(to, "day");

            return {
              disabled: disabled || !inRange,
              selected: isSelected,
              onClick: (event: React.MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                if (disabled || !inRange) return;
                onChange(toggleRuleFromDate(value, d));
              },
            };
          }}
        />
      </Box>

      <Divider />

      <Stack spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Dự kiến báo cáo vào các ngày
        </Typography>

        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: "action.hover",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {ruleText}
          </Typography>
        </Box>
      </Stack>
    </Stack>
  );
};