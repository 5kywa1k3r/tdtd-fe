import React from "react";
import { MenuItem, Stack, TextField } from "@mui/material";
import type { PeriodScopeMode } from "../../../types/aggregateTypes";

export type AggregatePeriodPickerProps = {
  periodScopeMode: PeriodScopeMode;
  periodDate: string;
  periodDateFrom: string;
  periodDateTo: string;
  onPeriodScopeModeChange: (value: PeriodScopeMode) => void;
  onPeriodDateChange: (value: string) => void;
  onPeriodDateFromChange: (value: string) => void;
  onPeriodDateToChange: (value: string) => void;
};

const AggregatePeriodPicker: React.FC<AggregatePeriodPickerProps> = ({
  periodScopeMode,
  periodDate,
  periodDateFrom,
  periodDateTo,
  onPeriodScopeModeChange,
  onPeriodDateChange,
  onPeriodDateFromChange,
  onPeriodDateToChange,
}) => {
  return (
    <Stack spacing={1.5}>
      <TextField
        select
        label="Phạm vi kỳ"
        size="small"
        value={periodScopeMode}
        onChange={(e) => onPeriodScopeModeChange(e.target.value as PeriodScopeMode)}
        sx={{ minWidth: 190 }}
      >
        <MenuItem value="SINGLE_PERIOD">Một ngày/kỳ</MenuItem>
        <MenuItem value="PERIOD_RANGE">Từ ngày đến ngày</MenuItem>
        <MenuItem value="CUMULATIVE_TO_PERIOD">Lũy kế đến ngày/kỳ</MenuItem>
        <MenuItem value="ALL_PERIODS">Toàn bộ kỳ</MenuItem>
      </TextField>

      {periodScopeMode === "SINGLE_PERIOD" && (
        <TextField
          label="Ngày/kỳ"
          size="small"
          type="date"
          value={periodDate}
          onChange={(e) => onPeriodDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      )}

      {periodScopeMode === "PERIOD_RANGE" && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            label="Từ ngày"
            size="small"
            type="date"
            value={periodDateFrom}
            onChange={(e) => onPeriodDateFromChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Đến ngày"
            size="small"
            type="date"
            value={periodDateTo}
            onChange={(e) => onPeriodDateToChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>
      )}

      {periodScopeMode === "CUMULATIVE_TO_PERIOD" && (
        <TextField
          label="Lũy kế đến ngày/kỳ"
          size="small"
          type="date"
          value={periodDateTo}
          onChange={(e) => onPeriodDateToChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      )}
    </Stack>
  );
};

export default AggregatePeriodPicker;
