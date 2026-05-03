import React from "react";
import { Autocomplete, Box, Button, MenuItem, Stack, TextField } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import type {
  AggregateFilterState,
  AggregateMode,
  AggregateMetricOption,
  AggregateScopeMode,
  SourceStatusMode,
} from "../../../types/aggregateTypes";
import AggregatePeriodPicker from "./AggregatePeriodPicker";

export type AggregateFilterBarProps = {
  value: AggregateFilterState;
  defaultDynamicExcelCode?: string | null;
  defaultDynamicExcelName?: string | null;
  lockDynamicExcel?: boolean;
  showScopeMode?: boolean;
  showAggregateMode?: boolean;
  showMetricFilter?: boolean;
  metricOptions?: AggregateMetricOption[];
  loading?: boolean;
  onChange: (next: AggregateFilterState) => void;
  onRun: () => void;
  onReset: () => void;
};

const WorkAggregateFilterBar: React.FC<AggregateFilterBarProps> = ({
  value,
  defaultDynamicExcelCode,
  defaultDynamicExcelName,
  lockDynamicExcel = false,
  showScopeMode = false,
  showAggregateMode = true,
  showMetricFilter = false,
  metricOptions = [],
  loading = false,
  onChange,
  onRun,
  onReset,
}) => {
  const setField = <K extends keyof AggregateFilterState>(field: K, fieldValue: AggregateFilterState[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const selectedMetricOptions = React.useMemo(() => {
    const selected = new Set(value.metricKeys);
    return metricOptions.filter((item) => selected.has(item.metricKey));
  }, [metricOptions, value.metricKeys]);

  const formatMetricOption = React.useCallback((option: AggregateMetricOption) => {
    if (option.label?.trim()) return option.label.trim();
    const position = [option.rowKey, option.columnKey].filter(Boolean).join(" / ");
    return position ? `${option.metricKey} (${position})` : option.metricKey;
  }, []);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <TextField
          label="Biểu mẫu"
          size="small"
          value={value.dynamicExcelId}
          onChange={(e) => setField("dynamicExcelId", e.target.value)}
          fullWidth
          disabled={lockDynamicExcel}
          helperText={
            defaultDynamicExcelCode || defaultDynamicExcelName
              ? `${defaultDynamicExcelCode || ""} ${defaultDynamicExcelName || ""}`.trim()
              : "Nhập DynamicExcelId để lấy template"
          }
        />

        <TextField
          select
          label="Nguồn lấy báo cáo"
          size="small"
          value={value.sourceStatusMode}
          onChange={(e) => setField("sourceStatusMode", e.target.value as SourceStatusMode)}
          sx={{ minWidth: 230 }}
        >
          <MenuItem value="APPROVED_ONLY">Chỉ báo cáo đã duyệt</MenuItem>
          <MenuItem value="APPROVED_AND_SUBMITTED">Đã duyệt + đã nộp</MenuItem>
        </TextField>

        {showScopeMode && (
          <TextField
            select
            label="Scope"
            size="small"
            value={value.scopeMode}
            onChange={(e) => setField("scopeMode", e.target.value as AggregateScopeMode)}
            sx={{ minWidth: 210 }}
          >
            <MenuItem value="DIRECT_CHILDREN">Direct children</MenuItem>
            <MenuItem value="SUBTREE">Full subtree</MenuItem>
          </TextField>
        )}

        {showAggregateMode && (
          <TextField
            select
            label="Kiểu tổng hợp"
            size="small"
            value={value.aggregateMode}
            onChange={(e) => setField("aggregateMode", e.target.value as AggregateMode)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="SUM_BY_CELL">Cộng vào biểu mẫu</MenuItem>
            <MenuItem value="HORIZONTAL_BY_USER">Ghép ngang theo người</MenuItem>
            <MenuItem value="VERTICAL_BY_USER">Ghép dọc theo người</MenuItem>
          </TextField>
        )}
      </Stack>

      {showMetricFilter && metricOptions.length > 0 && (
        <Autocomplete
          multiple
          size="small"
          options={metricOptions}
          value={selectedMetricOptions}
          getOptionLabel={formatMetricOption}
          isOptionEqualToValue={(option, selected) => option.metricKey === selected.metricKey}
          limitTags={3}
          onChange={(_, next) => setField("metricKeys", next.map((item) => item.metricKey))}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Metric filter"
            />
          )}
        />
      )}

      <Box>
        <LazyUnitMultiSelect
          mode="multiple"
          label="Đơn vị tổng hợp"
          value={value.selectedUnitIds}
          onChange={(next) => setField("selectedUnitIds", next)}
        />
      </Box>

      <AggregatePeriodPicker
        periodScopeMode={value.periodScopeMode}
        periodDate={value.periodDate}
        periodDateFrom={value.periodDateFrom}
        periodDateTo={value.periodDateTo}
        onPeriodScopeModeChange={(next) => setField("periodScopeMode", next)}
        onPeriodDateChange={(next) => setField("periodDate", next)}
        onPeriodDateFromChange={(next) => setField("periodDateFrom", next)}
        onPeriodDateToChange={(next) => setField("periodDateTo", next)}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<RefreshIcon />}
          onClick={onReset}
          disabled={loading}
        >
          Làm mới
        </Button>
        <Button variant="contained" onClick={onRun} disabled={loading}>
          Chạy tổng hợp
        </Button>
      </Box>
    </Stack>
  );
};

export default WorkAggregateFilterBar;
