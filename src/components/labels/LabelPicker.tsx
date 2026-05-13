import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";

import {
  type LabelRow,
  useSearchLabelsMutation,
} from "../../api/labelApi";
import { formatLabelDataType, LabelSwatch } from "./labelUi";

export type LabelPickerUsage = "generic" | "tag" | "row" | "statistic";

type LabelPickerProps = {
  value?: string[];
  onChange: (codes: string[], rows: LabelRow[]) => void;
  allowedCodes?: string[];
  groupCode?: string | null;
  usage?: LabelPickerUsage;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  limitTags?: number;
  size?: "small" | "medium";
  lazySearch?: boolean;
  sx?: SxProps<Theme>;
};

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function uniqueCodes(values?: string[]) {
  return Array.from(
    new Set((values ?? []).map(normalizeCode).filter((x) => x.length > 0)),
  );
}

function fallbackLabel(code: string): LabelRow {
  return {
    id: `code:${code}`,
    code,
    name: code,
    description: null,
    color: null,
    groupCode: null,
    dataType: "NUMBER",
    scopeType: "GLOBAL",
    scopeId: null,
    isSystem: false,
    isActive: true,
    canManage: false,
    createdAtUtc: "",
    updatedAtUtc: "",
  };
}

function labelMetaText(row: LabelRow, showDataType: boolean) {
  const parts = [
    row.code,
    row.groupCode?.trim() || null,
    showDataType ? formatLabelDataType(row.dataType) : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function LabelPicker({
  value,
  onChange,
  allowedCodes,
  groupCode,
  usage = "generic",
  label = "Nhãn",
  placeholder = "Chọn nhãn",
  helperText,
  error,
  disabled,
  limitTags = 4,
  size = "medium",
  lazySearch = false,
  sx,
}: LabelPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [search, searchState] = useSearchLabelsMutation();
  const showDataType = usage === "generic" || usage === "statistic";

  const selectedCodes = useMemo(() => uniqueCodes(value), [value]);
  const allowedSet = useMemo(() => {
    const codes = uniqueCodes(allowedCodes);
    return codes.length > 0 ? new Set(codes) : null;
  }, [allowedCodes]);

  useEffect(() => {
    if (disabled) return;
    if (lazySearch && !inputValue.trim()) return;

    const handle = window.setTimeout(() => {
      search({
        q: inputValue.trim() || null,
        groupCode: groupCode?.trim() || null,
        isActive: true,
        page: 0,
        pageSize: 50,
        sortField: "name",
        sortDirection: "asc",
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [disabled, groupCode, inputValue, lazySearch, search]);

  const options = useMemo(() => {
    const rows = searchState.data?.rows ?? [];
    return allowedSet ? rows.filter((row) => allowedSet.has(row.code)) : rows;
  }, [allowedSet, searchState.data?.rows]);

  const selectedRows = useMemo(() => {
    return selectedCodes.map(
      (code) => options.find((row) => row.code === code) ?? fallbackLabel(code),
    );
  }, [options, selectedCodes]);

  const mergedOptions = useMemo(() => {
    const seen = new Set<string>();
    const rows: LabelRow[] = [];

    for (const row of selectedRows.concat(options)) {
      if (seen.has(row.code)) continue;
      seen.add(row.code);
      rows.push(row);
    }

    return rows;
  }, [options, selectedRows]);

  return (
    <Autocomplete<LabelRow, true, false, false>
      multiple
      disabled={disabled}
      loading={searchState.isLoading}
      options={mergedOptions}
      value={selectedRows}
      inputValue={inputValue}
      limitTags={limitTags}
      filterSelectedOptions
      isOptionEqualToValue={(option, selected) => option.code === selected.code}
      getOptionLabel={(option) => option.name || option.code}
      onInputChange={(_event, next) => setInputValue(next)}
      onChange={(_event, rows) => {
        const codes = uniqueCodes(rows.map((row) => row.code));
        onChange(codes, rows.filter((row) => codes.includes(row.code)));
      }}
      noOptionsText="Không có nhãn"
      renderTags={(rows, getTagProps) =>
        rows.map((row, index) => (
          <Chip
            {...getTagProps({ index })}
            key={row.code}
            size="small"
            label={row.name || row.code}
            variant="outlined"
            sx={{
              maxWidth: 180,
              borderColor: row.color ?? "divider",
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />
        ))
      }
      renderOption={(props, row) => (
        <Box component="li" {...props} key={row.code} sx={{ gap: 1 }}>
          <LabelSwatch color={row.color} size={12} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {labelMetaText(row, showDataType)}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size={size}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {searchState.isLoading && <CircularProgress color="inherit" size={18} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={sx}
    />
  );
}
