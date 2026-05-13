import React from "react";
import { MenuItem, Stack, TextField } from "@mui/material";
import type { PeriodScopeMode } from "../../../types/aggregateTypes";
import { UITextKey, uiText } from '../../../constants/uiText';

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
        label={uiText(UITextKey.TextPhamViKy)}
        size="small"
        value={periodScopeMode}
        onChange={(e) => onPeriodScopeModeChange(e.target.value as PeriodScopeMode)}
        sx={{ minWidth: 190 }}
      >
        <MenuItem value="SINGLE_PERIOD">{uiText(UITextKey.TextMotNgayKy)}</MenuItem>
        <MenuItem value="PERIOD_RANGE">{uiText(UITextKey.TextTuNgayDenNgay2)}</MenuItem>
        <MenuItem value="CUMULATIVE_TO_PERIOD">{uiText(UITextKey.TextLuyKeDenNgayKy)}</MenuItem>
        <MenuItem value="ALL_PERIODS">{uiText(UITextKey.TextToanBoKy)}</MenuItem>
      </TextField>

      {periodScopeMode === "SINGLE_PERIOD" && (
        <TextField
          label={uiText(UITextKey.TextNgayKy)}
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
            label={uiText(UITextKey.TextTuNgay2)}
            size="small"
            type="date"
            value={periodDateFrom}
            onChange={(e) => onPeriodDateFromChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label={uiText(UITextKey.TextDenNgay2)}
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
          label={uiText(UITextKey.TextLuyKeDenNgayKy)}
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
