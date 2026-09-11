import React from "react";
import { MenuItem, TextField } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import type {
  AggregateFilterState,
  AggregateMetricOption,
  AggregateMode,
} from "../../../types/aggregateTypes";
import AggregateDataControls, {
  type AggregateDataAction,
  type AggregateUnitOption,
} from "./AggregateDataControls";
import { UITextKey, uiText } from "../../../constants/uiText";

export type { AggregateUnitOption };

export type AggregateFilterBarProps = {
  value: AggregateFilterState;
  defaultDynamicExcelCode?: string | null;
  defaultDynamicExcelName?: string | null;
  lockDynamicExcel?: boolean;
  showScopeMode?: boolean;
  showAggregateMode?: boolean;
  showMetricFilter?: boolean;
  metricOptions?: AggregateMetricOption[];
  metricSummaryText?: string;
  metricHelperText?: string;
  unitOptions?: AggregateUnitOption[];
  loading?: boolean;
  primaryDisabled?: boolean;
  sourceSlot?: React.ReactNode;
  targetSlot?: React.ReactNode;
  extraActions?: AggregateDataAction[];
  primaryLabel?: string;
  onChange: (next: AggregateFilterState) => void;
  onRun: () => void;
  onReset: () => void;
};

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

export function resolveMetricDisplayLabel(option: AggregateMetricOption) {
  const configuredLabel = option.label?.trim();
  if (configuredLabel) return configuredLabel;

  const fallback = METRIC_LABEL_FALLBACKS[option.metricKey];
  if (fallback) return fallback;

  const location = formatMetricLocation(option);
  if (location) return location;

  const coordinate = formatMetricKeyCoordinate(option.metricKey);
  if (coordinate) return coordinate;

  return humanizeMetricKey(option.metricKey);
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

function formatMetricLocation(option: AggregateMetricOption) {
  if (option.rowKey === "APPEND_ROWS") {
    return formatMetricAxis("Cột nguồn", option.columnKey);
  }

  if (option.columnKey === "APPEND_COLUMNS") {
    return formatMetricAxis("Dòng nguồn", option.rowKey);
  }

  return [
    formatMetricAxis("Dòng", option.rowKey),
    formatMetricAxis("Cột", option.columnKey),
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatMetricAxis(prefix: string, value?: string | null) {
  const text = value?.trim();
  if (!text || text === "APPEND_ROWS" || text === "APPEND_COLUMNS") return "";

  const ordinal = text.match(/^(row|col)_(\d+)$/i);
  if (ordinal) return `${prefix} ${ordinal[2]}`;

  return `${prefix}: ${humanizeMetricKey(text)}`;
}

function humanizeMetricKey(metricKey: string) {
  const exact = METRIC_LABEL_FALLBACKS[metricKey];
  if (exact) return exact;

  const parts = metricKey
    .split(/[.:]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : metricKey;
  const normalized = lastPart.replace(/[_-]+/g, " ").trim();
  if (!normalized) return metricKey;

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const AggregateFilterBar: React.FC<AggregateFilterBarProps> = ({
  value,
  defaultDynamicExcelCode,
  defaultDynamicExcelName,
  lockDynamicExcel = false,
  showAggregateMode = true,
  showMetricFilter = false,
  metricOptions = [],
  metricSummaryText,
  metricHelperText,
  unitOptions,
  loading = false,
  primaryDisabled = false,
  sourceSlot,
  targetSlot,
  extraActions = [],
  primaryLabel = "Xem tổng hợp",
  onChange,
  onRun,
  onReset,
}) => {
  const setField = <K extends keyof AggregateFilterState>(
    field: K,
    fieldValue: AggregateFilterState[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const selectedTemplateLabel = defaultDynamicExcelName || defaultDynamicExcelCode || "";

  const templateSlot =
    sourceSlot ??
    (
      <TextField
        label="Biểu mẫu"
        size="small"
        value={lockDynamicExcel ? selectedTemplateLabel || value.dynamicExcelId : value.dynamicExcelId}
        onChange={(event) => setField("dynamicExcelId", event.target.value)}
        fullWidth
        disabled={lockDynamicExcel}
      />
    );

  const aggregateModeSlot = showAggregateMode ? (
    <TextField
      select
      label={uiText(UITextKey.TextKieuTongHop)}
      size="small"
      value={value.aggregateMode}
      onChange={(event) => setField("aggregateMode", event.target.value as AggregateMode)}
      fullWidth
    >
      <MenuItem value="SUM_BY_CELL">{uiText(UITextKey.TextCongVaoBieuMau)}</MenuItem>
      <MenuItem value="HORIZONTAL_BY_USER">{uiText(UITextKey.TextGhepNgangTheoNguoi)}</MenuItem>
      <MenuItem value="VERTICAL_BY_USER">{uiText(UITextKey.TextGhepDocTheoNguoi)}</MenuItem>
    </TextField>
  ) : null;

  return (
    <AggregateDataControls
      title="Tập hợp dữ liệu"
      subtitle="Chọn khoảng thời gian, đơn vị và biểu mẫu/vùng; chỉ tiêu bảng và trường có nhãn thống kê sẽ được lấy tự động."
      dateFrom={value.periodDateFrom}
      dateTo={value.periodDateTo}
      onDateFromChange={(next) => setField("periodDateFrom", next)}
      onDateToChange={(next) => setField("periodDateTo", next)}
      selectedUnitIds={value.selectedUnitIds}
      onSelectedUnitIdsChange={(next) => setField("selectedUnitIds", next)}
      unitOptions={unitOptions}
      metricOptions={showMetricFilter ? metricOptions : []}
      selectedMetricKeys={[]}
      onSelectedMetricKeysChange={undefined}
      hideMetricSelector
      metricSectionTitle="Cách tổng hợp"
      metricSummaryText={
        metricSummaryText ??
        (showMetricFilter
          ? `${metricOptions.length} chỉ tiêu bảng tự động`
          : "Theo cấu hình biểu mẫu")
      }
      metricHelperText={
        metricHelperText ??
        "Tự động lấy chỉ tiêu bảng hợp lệ và trường có nhãn thống kê. Mặc định: số lấy tổng, ngày lấy giá trị muộn nhất, văn bản ngắn/chọn một đếm theo nhóm, danh sách chọn nhiều + đếm."
      }
      sourceSlot={templateSlot}
      targetSlot={targetSlot}
      metricExtraSlot={aggregateModeSlot}
      actions={[
        {
          key: "reset",
          label: "Làm mới",
          tooltip: "Đặt lại bộ lọc tập hợp dữ liệu",
          icon: RefreshIcon,
          onClick: onReset,
          disabled: loading,
        },
        ...extraActions,
      ]}
      primaryLabel={primaryLabel}
      primaryDisabled={loading || primaryDisabled}
      primaryLoading={loading}
      onPrimary={onRun}
    />
  );
};

export default AggregateFilterBar;
