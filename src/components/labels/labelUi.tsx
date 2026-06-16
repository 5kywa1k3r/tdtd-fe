import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";

import type {
  LabelDataType,
  LabelUsage,
  LabelValueOption,
  LabelValueSourceType,
} from "../../api/labelApi";
import {
  type LabelEnumCatalogRow,
  useSearchLabelEnumCatalogsMutation,
} from "../../api/labelEnumCatalogApi";

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

export const LABEL_VALUE_SOURCE_OPTIONS: Array<{ value: LabelValueSourceType; label: string; description: string }> = [
  {
    value: "NONE",
    label: "Không áp dụng",
    description: "Nhãn không ép người nhập chọn từ danh mục.",
  },
  {
    value: "FIXED_ENUM",
    label: "Danh sách cố định",
    description: "Quản trị viên cấu hình sẵn các mã/lựa chọn.",
  },
  {
    value: "ENUM_CATALOG",
    label: "Danh mục enum riêng",
    description: "Chọn danh mục enum do MU/ML quản lý, có phân quyền theo phạm vi.",
  },
  {
    value: "SYSTEM_UNIT",
    label: "Danh mục đơn vị",
    description: "Người nhập chọn đơn vị đang có trong hệ thống.",
  },
  {
    value: "SYSTEM_USER",
    label: "Danh mục người dùng",
    description: "Người nhập chọn tài khoản/người dùng đang có trong hệ thống.",
  },
  {
    value: "SYSTEM_POSITION",
    label: "Danh mục chức vụ",
    description: "Người nhập chọn chức vụ từ catalog hệ thống.",
  },
  {
    value: "SYSTEM_UNIT_TYPE",
    label: "Danh mục loại đơn vị",
    description: "Người nhập chọn loại đơn vị từ catalog hệ thống.",
  },
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

export function formatLabelValueSourceType(value?: string | null) {
  return LABEL_VALUE_SOURCE_OPTIONS.find((item) => item.value === value)?.label ?? "Không áp dụng";
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

export function labelValueSourceApplies(dataType?: string | null) {
  return dataType === "SHORT_TEXT" || dataType === "STRING_LIST";
}

export function normalizeLabelValueOptions(value?: LabelValueOption[] | null) {
  const seen = new Set<string>();
  const rows: LabelValueOption[] = [];
  for (const item of value ?? []) {
    const code = String(item?.code ?? "").trim();
    if (!code) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const label = String(item?.label ?? "").trim() || code;
    rows.push({ code, label });
  }
  return rows;
}

export function LabelValueSourceEditor({
  dataType,
  valueSourceType,
  valueOptions,
  valueSourceCatalogId,
  valueSourceCatalogName,
  disabled,
  onSourceTypeChange,
  onOptionsChange,
  onCatalogChange,
}: {
  dataType: LabelDataType;
  valueSourceType: LabelValueSourceType;
  valueOptions: LabelValueOption[];
  valueSourceCatalogId?: string | null;
  valueSourceCatalogName?: string | null;
  disabled?: boolean;
  onSourceTypeChange: (value: LabelValueSourceType) => void;
  onOptionsChange: (value: LabelValueOption[]) => void;
  onCatalogChange?: (catalog: LabelEnumCatalogRow | null) => void;
}) {
  const sourceOptions = labelValueSourceApplies(dataType)
    ? LABEL_VALUE_SOURCE_OPTIONS
    : LABEL_VALUE_SOURCE_OPTIONS.filter((item) => item.value === "NONE");
  const options = valueOptions.length > 0 ? valueOptions : [{ code: "OPT_1", label: "Lựa chọn 1" }];

  return (
    <Stack spacing={1}>
      <TextField
        select
        size="small"
        label="Nguồn giá trị"
        value={labelValueSourceApplies(dataType) ? valueSourceType : "NONE"}
        disabled={disabled || !labelValueSourceApplies(dataType)}
        helperText={
          labelValueSourceApplies(dataType)
            ? "Nếu chọn nguồn hệ thống, người báo cáo bắt buộc chọn từ select box."
            : "Nguồn giá trị chỉ áp dụng cho nhãn kiểu nội dung."
        }
        onChange={(event) => onSourceTypeChange(event.target.value as LabelValueSourceType)}
        InputLabelProps={{ shrink: true }}
      >
        {sourceOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {valueSourceType === "FIXED_ENUM" && labelValueSourceApplies(dataType) && (
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary">
            Danh sách mã cố định dùng để lưu thống kê; tên hiển thị dùng cho UI.
          </Typography>
          {options.map((option, index) => (
            <Box
              key={index}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "160px minmax(0, 1fr) auto" },
                gap: 0.75,
                alignItems: "start",
              }}
            >
              <TextField
                size="small"
                label="Mã"
                value={option.code}
                disabled={disabled}
                onChange={(event) => {
                  const next = options.slice();
                  next[index] = { ...next[index], code: event.target.value };
                  onOptionsChange(next);
                }}
              />
              <TextField
                size="small"
                label="Tên hiển thị"
                value={option.label}
                disabled={disabled}
                onChange={(event) => {
                  const next = options.slice();
                  next[index] = { ...next[index], label: event.target.value };
                  onOptionsChange(next);
                }}
              />
              <Button
                size="small"
                color="error"
                disabled={disabled || options.length <= 1}
                onClick={() => onOptionsChange(options.filter((_item, itemIndex) => itemIndex !== index))}
                sx={{ minHeight: 40 }}
              >
                Xóa
              </Button>
            </Box>
          ))}
          <Button
            size="small"
            variant="outlined"
            disabled={disabled}
            onClick={() =>
              onOptionsChange([
                ...options,
                { code: `OPT_${options.length + 1}`, label: `Lựa chọn ${options.length + 1}` },
              ])
            }
          >
            Thêm lựa chọn
          </Button>
        </Stack>
      )}

      {valueSourceType === "ENUM_CATALOG" && labelValueSourceApplies(dataType) && (
        <LabelEnumCatalogSelect
          value={valueSourceCatalogId ?? ""}
          selectedName={valueSourceCatalogName ?? ""}
          disabled={disabled}
          onChange={(catalog) => onCatalogChange?.(catalog)}
        />
      )}
    </Stack>
  );
}

export function LabelEnumCatalogSelect({
  value,
  selectedName,
  disabled,
  helperText = "Chỉ hiển thị danh mục enum trong phạm vi tài khoản được phép sử dụng.",
  onChange,
}: {
  value?: string | null;
  selectedName?: string | null;
  disabled?: boolean;
  helperText?: string;
  onChange: (catalog: LabelEnumCatalogRow | null) => void;
}) {
  const [q, setQ] = useState("");
  const [search, searchState] = useSearchLabelEnumCatalogsMutation();

  useEffect(() => {
    search({
      q: q.trim() || null,
      isActive: true,
      page: 0,
      pageSize: 50,
      sortField: "name",
      sortDirection: "asc",
    });
  }, [q, search]);

  const rows = searchState.data?.rows ?? [];
  const options = useMemo(() => {
    if (!value || rows.some((row) => row.id === value)) return rows;
    return [
      {
        id: value,
        code: "",
        name: selectedName || value,
        description: null,
        scopeType: "GLOBAL" as const,
        scopeId: null,
        scopeUnitCode: null,
        scopeLevel: null,
        activeOptionCount: 0,
        totalOptionCount: 0,
        isActive: true,
        canManage: false,
        createdByUsername: "",
        createdAtUtc: "",
        updatedAtUtc: "",
      },
      ...rows,
    ];
  }, [rows, selectedName, value]);

  return (
    <Stack spacing={0.75}>
      <TextField
        size="small"
        label="Tìm danh mục enum"
        value={q}
        disabled={disabled}
        placeholder="Nhập mã hoặc tên danh mục"
        onChange={(event) => setQ(event.target.value)}
      />
      <TextField
        select
        size="small"
        label="Danh mục enum"
        value={value ?? ""}
        disabled={disabled || searchState.isLoading}
        helperText={helperText}
        onChange={(event) => {
          const selected = options.find((row) => row.id === event.target.value) ?? null;
          onChange(selected);
        }}
        InputLabelProps={{ shrink: true }}
      >
        <MenuItem value="">Chưa chọn danh mục enum</MenuItem>
        {options.map((row) => (
          <MenuItem key={row.id} value={row.id}>
            {row.name} ({row.code || row.id})
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
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
