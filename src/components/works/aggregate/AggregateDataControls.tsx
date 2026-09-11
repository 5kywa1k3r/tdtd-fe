import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import SingleDayKeyField, {
  dayKeyToIsoDate,
  isoDateToDayKey,
} from "../../common/SingleDayKeyField";
import type { AggregateMetricOption } from "../../../types/aggregateTypes";

export type AggregateUnitOption = {
  id: string;
  label: string;
  code?: string | null;
  secondaryLabel?: string | null;
};

export type AggregateDataAction = {
  key: string;
  label: string;
  tooltip: string;
  icon: SvgIconComponent;
  onClick: () => void;
  disabled?: boolean;
  color?: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
};

export type AggregateUnitSelectorProps = {
  selectedUnitIds: string[];
  onSelectedUnitIdsChange: (value: string[]) => void;
  unitOptions?: AggregateUnitOption[];
  disabled?: boolean;
  label?: string;
  helperText?: string;
  emptyHelperText?: string;
};

export type AggregateDataControlsProps = {
  title?: string;
  subtitle?: string;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  selectedUnitIds: string[];
  onSelectedUnitIdsChange: (value: string[]) => void;
  unitOptions?: AggregateUnitOption[];
  metricOptions?: AggregateMetricOption[];
  selectedMetricKeys?: string[];
  onSelectedMetricKeysChange?: (value: string[]) => void;
  hideMetricSelector?: boolean;
  metricSectionTitle?: string;
  metricSummaryText?: string;
  metricHelperText?: string;
  sourceSlot?: React.ReactNode;
  targetSlot?: React.ReactNode;
  metricExtraSlot?: React.ReactNode;
  actions?: AggregateDataAction[];
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary?: () => void;
};

export function AggregateUnitSelector({
  selectedUnitIds,
  onSelectedUnitIdsChange,
  unitOptions,
  disabled = false,
  label = "Đơn vị",
  helperText = "Để trống để lấy tất cả.",
  emptyHelperText = "Chưa có đơn vị phù hợp.",
}: AggregateUnitSelectorProps) {
  const restrictedUnitOptions = Array.isArray(unitOptions);
  const unitOptionList = unitOptions ?? [];
  const selectedUnits = React.useMemo(() => {
    const selected = new Set(selectedUnitIds);
    return unitOptionList.filter((item) => selected.has(item.id));
  }, [selectedUnitIds, unitOptionList]);

  if (!restrictedUnitOptions) {
    return (
      <LazyUnitMultiSelect
        mode="multiple"
        label={label}
        value={selectedUnitIds}
        onChange={onSelectedUnitIdsChange}
      />
    );
  }

  return (
    <Autocomplete
      multiple
      size="small"
      options={unitOptionList}
      value={selectedUnits}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      limitTags={2}
      disabled={disabled || unitOptionList.length === 0}
      onChange={(_, next) => onSelectedUnitIdsChange(next.map((item) => item.id))}
      renderOption={(listProps, option) => (
        <li {...listProps}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2">{option.label}</Typography>
            {option.secondaryLabel && (
              <Typography variant="caption" color="text.secondary">
                {option.secondaryLabel}
              </Typography>
            )}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={unitOptionList.length ? helperText : emptyHelperText}
        />
      )}
    />
  );
}

export default function AggregateDataControls(props: AggregateDataControlsProps) {
  const {
    title,
    subtitle,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    selectedUnitIds,
    onSelectedUnitIdsChange,
    unitOptions,
    metricOptions = [],
    selectedMetricKeys = [],
    onSelectedMetricKeysChange,
    hideMetricSelector = false,
    metricSectionTitle = "Cách tổng hợp",
    metricSummaryText = "Tự động lấy tất cả dữ liệu hợp lệ.",
    metricHelperText = "Chỉ tiêu bảng và trường có nhãn thống kê được lấy tự động. Mặc định: số lấy tổng, ngày lấy giá trị muộn nhất, văn bản/danh sách chỉ tải chi tiết khi mở.",
    sourceSlot,
    targetSlot,
    metricExtraSlot,
    actions = [],
    primaryLabel,
    primaryDisabled,
    primaryLoading,
    onPrimary,
  } = props;

  const selectedMetrics = React.useMemo(() => {
    const selected = new Set(selectedMetricKeys);
    return metricOptions.filter((item) => selected.has(item.metricKey));
  }, [metricOptions, selectedMetricKeys]);

  const setDateFrom = (next: string) => {
    onDateFromChange(next);
    if (next && dateTo && dateTo < next) {
      onDateToChange(next);
    }
  };

  const setDateTo = (next: string) => {
    if (dateFrom && next && next < dateFrom) {
      onDateToChange(dateFrom);
      return;
    }

    onDateToChange(next);
  };
  const dateFromDayKey = isoDateToDayKey(dateFrom);
  const dateToDayKey = isoDateToDayKey(dateTo);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Stack spacing={1.5}>
        {(title || subtitle) && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1}
          >
            <Box sx={{ minWidth: 0 }}>
              {title && (
                <Typography variant="subtitle1" fontWeight={800}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {(actions.length > 0 || primaryLabel) && (
              <ActionStrip
                actions={actions}
                primaryLabel={primaryLabel}
                primaryDisabled={primaryDisabled}
                primaryLoading={primaryLoading}
                onPrimary={onPrimary}
              />
            )}
          </Stack>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "1.05fr 1fr 1.35fr 1.15fr",
            },
            gap: 1.25,
            alignItems: "start",
          }}
        >
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Khoảng thời gian tập hợp
            </Typography>
            <Stack direction={{ xs: "column", sm: "row", lg: "column" }} spacing={1}>
              <SingleDayKeyField
                label="Từ ngày"
                value={dateFromDayKey}
                onChange={(next) => setDateFrom(dayKeyToIsoDate(next))}
                maxDayKey={dateToDayKey || undefined}
                fullWidth
              />
              <SingleDayKeyField
                label="Đến ngày"
                value={dateToDayKey}
                onChange={(next) => setDateTo(dayKeyToIsoDate(next))}
                minDayKey={dateFromDayKey || undefined}
                fullWidth
              />
            </Stack>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Đơn vị tập hợp
            </Typography>
            <AggregateUnitSelector
              selectedUnitIds={selectedUnitIds}
              onSelectedUnitIdsChange={onSelectedUnitIdsChange}
              unitOptions={unitOptions}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Template / vùng
            </Typography>
            {sourceSlot}
            {targetSlot}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {metricSectionTitle}
            </Typography>
            {!hideMetricSelector && metricOptions.length > 0 && onSelectedMetricKeysChange ? (
              <Autocomplete
                multiple
                size="small"
                options={metricOptions}
                value={selectedMetrics}
                getOptionLabel={resolveMetricDisplayLabel}
                isOptionEqualToValue={(option, selected) => option.metricKey === selected.metricKey}
                limitTags={2}
                onChange={(_, next) => onSelectedMetricKeysChange(next.map((item) => item.metricKey))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chỉ tiêu"
                    helperText="Để trống để lấy tất cả chỉ tiêu."
                  />
                )}
              />
            ) : (
              <TextField
                size="small"
                value={metricSummaryText}
                label="Dữ liệu tự động"
                InputProps={{ readOnly: true }}
                helperText={metricHelperText}
              />
            )}
            {metricExtraSlot}
          </Stack>
        </Box>

        {!title && (actions.length > 0 || primaryLabel) && (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <ActionStrip
              actions={actions}
              primaryLabel={primaryLabel}
              primaryDisabled={primaryDisabled}
              primaryLoading={primaryLoading}
              onPrimary={onPrimary}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}

function ActionStrip(props: {
  actions: AggregateDataAction[];
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary?: () => void;
}) {
  const { actions, primaryLabel, primaryDisabled, primaryLoading, onPrimary } = props;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Tooltip key={action.key} title={action.tooltip} arrow>
            <span>
              <IconButton
                data-testid={`aggregate-action-${action.key}`}
                size="small"
                color={action.color ?? "default"}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.label}
              >
                <Icon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
      {primaryLabel && onPrimary && (
        <Button
          data-testid="aggregate-primary-action-button"
          size="small"
          variant="contained"
          startIcon={<SearchOutlinedIcon fontSize="small" />}
          onClick={onPrimary}
          disabled={primaryDisabled || primaryLoading}
        >
          {primaryLoading ? "Đang xử lý..." : primaryLabel}
        </Button>
      )}
    </Stack>
  );
}

function resolveMetricDisplayLabel(option: AggregateMetricOption) {
  const configuredLabel = option.label?.trim();
  if (configuredLabel) return configuredLabel;

  const fallback = METRIC_LABEL_FALLBACKS[option.metricKey];
  if (fallback) return fallback;

  const coordinate = formatMetricKeyCoordinate(option.metricKey);
  if (coordinate) return coordinate;

  const parts = option.metricKey
    .split(/[.:]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : option.metricKey;
  const normalized = lastPart.replace(/[_-]+/g, " ").trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : option.metricKey;
}

function formatMetricKeyCoordinate(metricKey?: string | null) {
  const match = metricKey?.match(/(?:^|[.])R(\d+)[.]C(\d+)$/i);
  if (!match) return "";
  const row = Number(match[1]);
  const col = Number(match[2]);
  if (!Number.isInteger(row) || !Number.isInteger(col) || row <= 0 || col <= 0) return "";
  return `Ô ${excelColumnName(col - 1)}${row}`;
}

function excelColumnName(index: number) {
  let text = "";
  let n = Math.max(0, Math.floor(index)) + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    text = String.fromCharCode(65 + mod) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text;
}

const METRIC_LABEL_FALLBACKS: Record<string, string> = {
  "a.so_tiep_nhan": "Số tiếp nhận",
  "a.so_da_xu_ly": "Số đã xử lý",
  "a.so_ton": "Số còn tồn",
  "b.nhom_dong": "Nhóm dòng",
  "b.so_dong": "Số dòng",
  "b.ngay_phat_sinh": "Ngày phát sinh",
  "b.don_vi_lien_quan": "Đơn vị liên quan",
  "b.co_vuong_mac": "Có vướng mắc",
  "b.ky_ghi_nhan": "Kỳ ghi nhận",
  "c.append.tong_so": "Tổng số",
  "c.append.da_xu_ly": "Đã xử lý",
  "c.append.chua_xu_ly": "Chưa xử lý",
  "c.matrix.tiep_nhan.trong_ky": "Tiếp nhận trong kỳ",
  "c.matrix.tiep_nhan.luy_ke": "Tiếp nhận lũy kế",
  "c.matrix.xu_ly.trong_ky": "Xử lý trong kỳ",
  "c.matrix.xu_ly.luy_ke": "Xử lý lũy kế",
};
