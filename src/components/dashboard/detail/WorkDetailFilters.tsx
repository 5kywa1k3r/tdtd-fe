import React from "react";
import { Box, Button, FormControlLabel, Paper, Stack, Switch } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import { MantineDateRangeFilter } from "../../common/dateRanger/MantineDateRangeFilter";
import type { WorkDashboardDetailFilters } from "../../../types/dashboard";
import { dayjsToDateInput, filtersToDateRange } from "../../../utils/dashboardUi";

type Props = {
  value: WorkDashboardDetailFilters;
  loading?: boolean;
  onChange: (value: WorkDashboardDetailFilters) => void;
  onApply: () => void;
  onReset: () => void;
};

export default function WorkDetailFilters({
  value,
  loading = false,
  onChange,
  onApply,
  onReset,
}: Props) {
  const rangeValue = React.useMemo(
    () => filtersToDateRange(value.fromDate, value.toDate),
    [value.fromDate, value.toDate]
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
        <Box sx={{ minWidth: 280 }}>
          <MantineDateRangeFilter
            value={rangeValue}
            onChange={(next) =>
              onChange({
                ...value,
                fromDate: dayjsToDateInput(next.from),
                toDate: dayjsToDateInput(next.to),
              })
            }
            placeholder="Chọn khoảng ngày"
            inputHeight={40}
            dropdownWidth={360}
          />
        </Box>

        <Box sx={{ minWidth: 320, flex: 1 }}>
          <LazyUnitMultiSelect
            label="Đơn vị"
            value={value.unitIds}
            onChange={(unitIds) => onChange({ ...value, unitIds })}
            mode="multiple"
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={value.includeRootAssignments}
              onChange={(e) => onChange({ ...value, includeRootAssignments: e.target.checked })}
            />
          }
          label="Hiển thị công việc được giao"
        />

        <FormControlLabel
          control={
            <Switch
              checked={value.includeReportSummary}
              onChange={(e) => onChange({ ...value, includeReportSummary: e.target.checked })}
            />
          }
          label="Hiển thị tổng hợp báo cáo"
        />

        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={onApply} disabled={loading}>
            Áp dụng
          </Button>
          <Button variant="text" onClick={onReset} disabled={loading}>
            Đặt lại
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
