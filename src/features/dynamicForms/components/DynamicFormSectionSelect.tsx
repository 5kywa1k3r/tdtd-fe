import {
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";

import type { DynamicFormSection } from "../dynamicForm.types";

export type DynamicFormSectionSelectItem = {
  section: DynamicFormSection;
  fieldCount?: number;
  blockCount?: number;
  validationStatus?: DynamicFormSectionValidationStatus;
  validationIssueCount?: number;
};

export type DynamicFormSectionValidationStatus = "valid" | "invalid";

type DynamicFormSectionSelectProps = {
  items: DynamicFormSectionSelectItem[];
  value: string;
  onChange: (section: DynamicFormSection) => void;
  label?: string;
  dense?: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
};

export default function DynamicFormSectionSelect({
  items,
  value,
  onChange,
  label = "Section",
  dense = false,
  disabled = false,
  sx,
}: DynamicFormSectionSelectProps) {
  const selectedItem =
    items.find((item) => item.section.id === value) ??
    items[0] ??
    null;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ xs: "stretch", sm: "center" }}
      sx={sx}
    >
      <TextField
        select
        fullWidth
        size="small"
        label={label}
        value={selectedItem?.section.id ?? ""}
        disabled={disabled || items.length === 0}
        onChange={(event) => {
          const next = items.find((item) => item.section.id === event.target.value);
          if (next) onChange(next.section);
        }}
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: {
                maxHeight: 264,
              },
            },
          },
          renderValue: (selected) => {
            const item = items.find((entry) => entry.section.id === selected);
            return item ? (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography component="span" variant="body2" fontWeight={700} noWrap>
                    {item.section.title || "Chưa đặt tiêu đề"}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                    noWrap
                  >
                    {formatSectionSummary(item)}
                  </Typography>
                </Box>
                {renderValidationChip(item)}
              </Stack>
            ) : "";
          },
        }}
      >
        {items.map((item, index) => (
          <MenuItem key={item.section.id} value={item.section.id}>
            <Stack spacing={0.25} sx={{ minWidth: 0, width: "100%" }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {index + 1}. {item.section.title || "Chưa đặt tiêu đề"}
                </Typography>
                {item.section.tagCodes?.length ? (
                  <Chip size="small" variant="outlined" label={`${item.section.tagCodes.length} nhãn`} />
                ) : null}
                {renderValidationChip(item)}
              </Stack>
              <Typography variant="caption" color="text.secondary" noWrap>
                {formatSectionSummary(item)}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </TextField>

      <Chip
        size={dense ? "small" : "medium"}
        variant="outlined"
        label={`${items.length} phần`}
        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
      />
    </Stack>
  );
}

function renderValidationChip(item: DynamicFormSectionSelectItem) {
  if (item.validationStatus === "valid") {
    return (
      <Chip
        size="small"
        color="success"
        variant="outlined"
        label="Đã kiểm tra"
        sx={{ flexShrink: 0 }}
      />
    );
  }

  if (item.validationStatus === "invalid") {
    const count = Number(item.validationIssueCount ?? 0);
    return (
      <Chip
        size="small"
        color="error"
        variant="outlined"
        label={count > 0 ? `${count} lỗi` : "Có lỗi"}
        sx={{ flexShrink: 0 }}
      />
    );
  }

  return null;
}

function formatSectionSummary(item: DynamicFormSectionSelectItem) {
  return [
    item.fieldCount ? `${item.fieldCount} trường` : null,
    item.blockCount ? `${item.blockCount} bảng` : null,
  ].filter(Boolean).join(" · ") || "Chưa có nội dung";
}
