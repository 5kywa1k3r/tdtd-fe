import {
  Box,
  ButtonBase,
  Chip,
  Stack,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";

import type { LabelDataType, LabelUsage } from "../../api/labelApi";

export const LABEL_COLOR_PALETTE = [
  "#2563EB",
  "#0F766E",
  "#16A34A",
  "#65A30D",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
  "#DB2777",
  "#9333EA",
  "#4F46E5",
  "#0891B2",
  "#475569",
  "#7C2D12",
  "#854D0E",
  "#166534",
  "#1E40AF",
];

export const LABEL_FALLBACK_COLOR = "#64748B";

export const LABEL_DATA_TYPE_OPTIONS: Array<{ value: LabelDataType; label: string }> = [
  { value: "NUMBER", label: "Số" },
  { value: "SHORT_TEXT", label: "Nội dung cố định" },
  { value: "STRING_LIST", label: "Danh sách nội dung" },
  { value: "DATE", label: "Ngày" },
  { value: "BOOLEAN", label: "Có/không" },
];

export const LABEL_USAGE_OPTIONS: Array<{
  value: LabelUsage;
  label: string;
  description: string;
  usesDataType: boolean;
}> = [
  {
    value: "CLASSIFICATION",
    label: "Thẻ phân loại",
    description:
      "Dùng để gắn tag cho biểu mẫu, phần hoặc block bảng. Chỉ phục vụ tìm kiếm/nhóm/gợi ý mapping, không tạo số liệu thống kê và không cần kiểu dữ liệu.",
    usesDataType: false,
  },
  {
    value: "STATISTIC",
    label: "Nhãn thống kê",
    description:
      "Dùng cho trường hoặc cột đã bật thống kê. Bắt buộc có kiểu dữ liệu và kiểu này phải khớp với trường/cột được gắn nhãn.",
    usesDataType: true,
  },
  {
    value: "TABLE_TARGET",
    label: "Nhãn vị trí bảng",
    description:
      "Dùng cho vị trí trong bảng Excel động như dòng, cột, ô hoặc vùng. Kiểu dữ liệu của nhãn phải khớp với vị trí được gắn.",
    usesDataType: true,
  },
];

export function normalizeLabelColor(value?: string | null) {
  const color = value?.trim();
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : LABEL_FALLBACK_COLOR;
}

export function isValidLabelColor(value?: string | null) {
  const color = value?.trim();
  return !color || /^#[0-9a-fA-F]{6}$/.test(color);
}

export function getReadableTextColor(color?: string | null) {
  const hex = normalizeLabelColor(color).slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111827" : "#FFFFFF";
}

export function formatLabelDataType(dataType?: string | null) {
  return LABEL_DATA_TYPE_OPTIONS.find((item) => item.value === dataType)?.label ?? "Số";
}

export function formatLabelUsage(usage?: string | null) {
  return LABEL_USAGE_OPTIONS.find((item) => item.value === usage)?.label ?? "Thẻ phân loại";
}

export function formatLabelUsageDescription(usage?: string | null) {
  return (
    LABEL_USAGE_OPTIONS.find((item) => item.value === usage)?.description ??
    "Chọn nhãn theo đúng nơi sẽ sử dụng để hệ thống lọc picker và kiểm tra dữ liệu chính xác."
  );
}

export function labelUsageUsesDataType(usage?: string | null) {
  return usage === "STATISTIC" || usage === "TABLE_TARGET";
}

export function LabelSwatch({
  color,
  size = 14,
  sx,
}: {
  color?: string | null;
  size?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: normalizeLabelColor(color),
        border: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
        ...sx,
      }}
    />
  );
}

export function LabelPreviewChip({
  name,
  code,
  color,
  size = "small",
}: {
  name?: string | null;
  code?: string | null;
  color?: string | null;
  size?: "small" | "medium";
}) {
  const bgColor = normalizeLabelColor(color);
  return (
    <Chip
      size={size}
      label={name?.trim() || code?.trim() || "-"}
      sx={{
        maxWidth: "100%",
        bgcolor: bgColor,
        color: getReadableTextColor(bgColor),
        borderColor: bgColor,
        fontWeight: 700,
        "& .MuiChip-label": {
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
}

export function LabelColorPalette({
  value,
  disabled,
  onChange,
}: {
  value?: string | null;
  disabled?: boolean;
  onChange: (color: string) => void;
}) {
  const current = normalizeLabelColor(value);

  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {LABEL_COLOR_PALETTE.map((color) => {
        const selected = current === color;
        return (
          <Tooltip key={color} title={color}>
            <span>
              <ButtonBase
                disabled={disabled}
                onClick={() => onChange(color)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  border: "2px solid",
                  borderColor: selected ? "text.primary" : "divider",
                  bgcolor: color,
                  boxShadow: selected ? 2 : 0,
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                }}
              />
            </span>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

export function LabelColorPreview({
  code,
  name,
  color,
  groupCode,
  usage,
  dataType,
  showDataType = false,
}: {
  code: string;
  name: string;
  color?: string | null;
  groupCode?: string | null;
  usage?: string | null;
  dataType?: string | null;
  showDataType?: boolean;
}) {
  const details = [
    code.trim() || "-",
    usage ? formatLabelUsage(usage) : null,
    groupCode?.trim() || null,
    showDataType && labelUsageUsesDataType(usage) ? formatLabelDataType(dataType) : null,
  ].filter(Boolean);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        bgcolor: "background.default",
      }}
    >
      <Stack spacing={0.75} alignItems="flex-start">
        <LabelPreviewChip name={name} code={code} color={color} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {details.join(" | ")}
        </Typography>
      </Stack>
    </Box>
  );
}
