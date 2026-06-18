import * as React from "react";
import {
  Autocomplete,
  Box,
  Chip,
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
  const [open, setOpen] = React.useState(false);
  const selectedItem =
    items.find((item) => item.section.id === value) ??
    items[0] ??
    null;

  React.useEffect(() => {
    if (disabled || items.length === 0) setOpen(false);
  }, [disabled, items.length]);

  return (
    <Box sx={sx}>
      <Autocomplete<DynamicFormSectionSelectItem, false, false, false>
        fullWidth
        size="small"
        open={open}
        openOnFocus
        blurOnSelect
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        value={selectedItem}
        options={items}
        disabled={disabled || items.length === 0}
        isOptionEqualToValue={(option, current) => option.section.id === current.section.id}
        getOptionLabel={(item) => getSectionTitle(item)}
        filterOptions={(options, state) => {
          const query = normalizeSearchText(state.inputValue);
          if (!query) return options;
          return options.filter((item) => normalizeSearchText(getSectionSearchText(item)).includes(query));
        }}
        onChange={(_, next) => {
          setOpen(false);
          if (next) onChange(next.section);
        }}
        ListboxProps={{
          style: {
            maxHeight: dense ? 260 : 320,
            padding: 0,
          },
        }}
        groupBy={() => "sections"}
        renderGroup={(params) => {
          const visibleCount = React.Children.count(params.children);
          return (
            <li key={params.key}>
              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                flexWrap="wrap"
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  px: 1.25,
                  py: 1,
                  bgcolor: "background.paper",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Chip size="small" color="primary" variant="outlined" label={`${items.length} phần`} />
                <Chip size="small" variant="outlined" label={`Hiển thị: ${visibleCount}`} />
              </Stack>
              <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
            </li>
          );
        }}
        renderOption={(props, item, state) => (
          <Box component="li" {...props} key={item.section.id}>
            <Stack spacing={0.5} sx={{ minWidth: 0, width: "100%", py: 0.25 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {state.index + 1}. {getSectionTitle(item)}
              </Typography>
              {item.section.description ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {item.section.description}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                {renderCountChips(item)}
                {renderValidationChip(item)}
              </Stack>
            </Stack>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder="Lọc section"
          />
        )}
        noOptionsText="Không có section phù hợp"
      />
    </Box>
  );
}

function getSectionTitle(item: DynamicFormSectionSelectItem) {
  return item.section.title?.trim() || "Chưa đặt tiêu đề";
}

function getSectionSearchText(item: DynamicFormSectionSelectItem) {
  return [
    item.section.title,
    item.section.description,
    ...(item.section.tagCodes ?? []),
    item.section.id,
  ].filter(Boolean).join(" ");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderCountChips(item: DynamicFormSectionSelectItem) {
  const chips = [
    item.fieldCount ? <Chip key="fields" size="small" variant="outlined" label={`${item.fieldCount} trường`} /> : null,
    item.blockCount ? <Chip key="blocks" size="small" variant="outlined" label={`${item.blockCount} bảng`} /> : null,
    item.section.tagCodes?.length ? (
      <Chip key="tags" size="small" variant="outlined" label={`${item.section.tagCodes.length} nhãn`} />
    ) : null,
  ].filter(Boolean);

  return chips.length > 0 ? chips : <Chip size="small" variant="outlined" label="Chưa có nội dung" />;
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
