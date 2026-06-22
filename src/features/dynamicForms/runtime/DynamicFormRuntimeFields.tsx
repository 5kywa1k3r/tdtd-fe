import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import type { DynamicFormField, DynamicFormSection } from "../dynamicForm.types";
import DynamicFormSectionSelect, {
  type DynamicFormSectionEntryStatus,
  type DynamicFormSectionValidationStatus,
} from "../components/DynamicFormSectionSelect";
import { getDynamicFormFieldDisplayName } from "../dynamicFormSchema";
import { UITextKey, uiText } from '../../../constants/uiText';
import {
  useLazySearchPickerLabelEnumOptionsQuery,
  useLazySearchPickerPositionsQuery,
  useLazySearchPickerUnitTypesQuery,
  useLazySearchPickerUnitsByCodeQuery,
  useLazySearchPickerUsersQuery,
} from "../../../api/pickersApi";
import {
  getDateInputFormatLabel,
  normalizeDateInputValue,
  type DateInputMode,
} from "../../../utils/dateInputFormat";

export type DynamicFormRuntimeValue =
  | string
  | number
  | boolean
  | string[]
  | null;

export type DynamicFormRuntimeValues = Record<string, DynamicFormRuntimeValue>;

export type DynamicFormRuntimeFieldState = {
  readOnly?: boolean;
};

export type DynamicFormRuntimeFieldsProps = {
  sections: DynamicFormSection[];
  fields: DynamicFormField[];
  values: DynamicFormRuntimeValues;
  readOnly?: boolean;
  disabled?: boolean;
  onChange: (fieldId: string, value: DynamicFormRuntimeValue) => void;
  getFieldState?: (field: DynamicFormField) => DynamicFormRuntimeFieldState | null | undefined;
  title?: ReactNode;
  layout?: "card" | "workspace";
  renderSectionExtra?: (section: DynamicFormSection) => ReactNode;
  getSectionExtraCount?: (section: DynamicFormSection) => number;
  getSectionValidationState?: (
    section: DynamicFormSection,
  ) => { status: DynamicFormSectionValidationStatus; issueCount?: number } | null;
  getSectionEntryState?: (
    section: DynamicFormSection,
  ) => { status: DynamicFormSectionEntryStatus; lastUpdatedAt?: string | null } | null;
  onSectionChange?: (section: DynamicFormSection) => void | boolean | Promise<void | boolean>;
};

function clampSpan(value: number | undefined) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(12, Math.max(3, Math.floor(value ?? 12)));
}

function asText(value: DynamicFormRuntimeValue | undefined) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function asLongText(value: DynamicFormRuntimeValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  return asText(value);
}

function asDateText(value: DynamicFormRuntimeValue | undefined, mode: DateInputMode) {
  if (typeof value !== "string") return "";
  return normalizeDateInputValue(value, mode) ?? value;
}

function asNumberText(value: DynamicFormRuntimeValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return "";
}

function asBoolean(value: DynamicFormRuntimeValue | undefined) {
  return value === true;
}

function asStringArray(value: DynamicFormRuntimeValue | undefined) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

type ChoiceRuntimeOption = {
  code: string;
  label: string;
};

function renderField(
  field: DynamicFormField,
  value: DynamicFormRuntimeValue | undefined,
  locked: boolean,
  onChange: (value: DynamicFormRuntimeValue) => void,
) {
  const displayName = getDynamicFormFieldDisplayName(field);

  if (field.type === "boolean") {
    return (
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          minHeight: field.minHeight,
          px: 1.25,
          py: 0.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={asBoolean(value)}
              disabled={locked}
              onChange={(event) => onChange(event.target.checked)}
            />
          }
          label={displayName}
          sx={{ m: 0, minWidth: 0 }}
        />
        {field.isStatistic && <Chip size="small" variant="outlined" label={uiText(UITextKey.TextThongKe)} />}
      </Box>
    );
  }

  if (field.type === "shortText" || field.type === "singleSelect" || field.type === "multiSelect") {
    return (
      <RuntimeChoiceSelect
        field={field}
        value={value}
        locked={locked}
        onChange={onChange}
      />
    );
  }

  if (field.type === "longText") {
    return (
      <TextField
        fullWidth
        size="small"
        label={displayName}
        required={field.required}
        disabled={locked}
        value={asLongText(value)}
        multiline
        minRows={3}
        onChange={(event) => onChange(event.target.value || null)}
        sx={{ minHeight: field.minHeight }}
      />
    );
  }

  if (field.type === "stringList") {
    return (
      <StringListRuntimeEditor
        label={displayName}
        value={asStringArray(value)}
        required={field.required}
        minHeight={field.minHeight}
        locked={locked}
        onChange={onChange}
      />
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === "number" ? "number" : "text"}
      label={displayName}
      required={field.required}
      disabled={locked}
      value={
        field.type === "number"
          ? asNumberText(value)
          : field.type === "date" || field.type === "fullDate"
            ? asDateText(value, field.type === "fullDate" ? "full" : "flexible")
            : asText(value)
      }
      onChange={(event) => {
        const raw = event.target.value;
        if (field.type === "number") {
          onChange(raw === "" ? null : Number(raw));
          return;
        }

        onChange(raw || null);
      }}
      placeholder={
        field.type === "date" || field.type === "fullDate"
          ? getDateInputFormatLabel(field.type === "fullDate" ? "full" : "flexible")
          : undefined
      }
      helperText={
        field.type === "date" || field.type === "fullDate"
          ? `Định dạng: ${getDateInputFormatLabel(field.type === "fullDate" ? "full" : "flexible")}`
          : undefined
      }
      InputLabelProps={field.type === "date" || field.type === "fullDate" ? { shrink: true } : undefined}
      sx={{ minHeight: field.minHeight }}
    />
  );
}

function renderRuntimeSectionValidationChip(item: {
  validationStatus?: DynamicFormSectionValidationStatus;
  validationIssueCount?: number;
}) {
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

function renderRuntimeSectionEntryChip(item: {
  entryStatus?: DynamicFormSectionEntryStatus;
}) {
  if (item.entryStatus === "entered") {
    return (
      <Chip
        size="small"
        color="success"
        variant="outlined"
        label="Đã nhập"
        sx={{ flexShrink: 0 }}
      />
    );
  }

  if (item.entryStatus === "empty") {
    return (
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        label="Chưa nhập"
        sx={{ flexShrink: 0 }}
      />
    );
  }

  return null;
}

function formatRuntimeSectionDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatRuntimeSectionSummary(item: {
  fieldCount?: number;
  blockCount?: number;
  lastUpdatedAt?: string | null;
}) {
  return [
    item.fieldCount ? `${item.fieldCount} trường` : null,
    item.blockCount ? `${item.blockCount} bảng` : null,
    formatRuntimeSectionDateTime(item.lastUpdatedAt)
      ? `Cập nhật: ${formatRuntimeSectionDateTime(item.lastUpdatedAt)}`
      : null,
  ].filter(Boolean).join(" · ") || "Chưa có nội dung";
}

function RuntimeChoiceSelect({
  field,
  value,
  locked,
  onChange,
}: {
  field: DynamicFormField;
  value: DynamicFormRuntimeValue | undefined;
  locked: boolean;
  onChange: (value: DynamicFormRuntimeValue) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [externalOptions, setExternalOptions] = useState<ChoiceRuntimeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUnits] = useLazySearchPickerUnitsByCodeQuery();
  const [searchUsers] = useLazySearchPickerUsersQuery();
  const [searchPositions] = useLazySearchPickerPositionsQuery();
  const [searchUnitTypes] = useLazySearchPickerUnitTypesQuery();
  const [searchLabelEnumOptions] = useLazySearchPickerLabelEnumOptionsQuery();

  const source = field.valueSource;
  const isMulti = field.type === "multiSelect";
  const usesExternalSource = Boolean(source && source.sourceType !== "FIXED_ENUM");
  const fixedOptions = useMemo(
    () => normalizeRuntimeChoiceOptions(
      source?.sourceType === "FIXED_ENUM" && source.options?.length
        ? source.options
        : field.options,
    ),
    [field.options, source],
  );

  useEffect(() => {
    if (!usesExternalSource || !source) {
      setExternalOptions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const rows = await loadRuntimeValueSourceOptions({
          source,
          query: inputValue,
          searchUnits,
          searchUsers,
          searchPositions,
          searchUnitTypes,
          searchLabelEnumOptions,
        });
        if (!cancelled) setExternalOptions(rows);
      } catch {
        if (!cancelled) setExternalOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    inputValue,
    searchLabelEnumOptions,
    searchPositions,
    searchUnitTypes,
    searchUnits,
    searchUsers,
    source,
    usesExternalSource,
  ]);

  const baseOptions = usesExternalSource ? externalOptions : fixedOptions;
  const selectedCodes = isMulti ? asStringArray(value) : asText(value) ? [asText(value)] : [];
  const mergedOptions = useMemo(
    () => mergeRuntimeChoiceOptions(baseOptions, selectedCodes),
    [baseOptions, selectedCodes],
  );
  const selectedOptions = selectedCodes
    .map((code) => mergedOptions.find((option) => option.code === code) ?? { code, label: code })
    .filter((option) => option.code);
  const displayName = getDynamicFormFieldDisplayName(field);

  if (isMulti) {
    return (
      <Autocomplete<ChoiceRuntimeOption, true, false, false>
        multiple
        fullWidth
        size="small"
        disabled={locked}
        loading={loading}
        options={mergedOptions}
        value={selectedOptions}
        inputValue={inputValue}
        filterSelectedOptions
        isOptionEqualToValue={(option, selected) => option.code === selected.code}
        getOptionLabel={(option) => option.label || option.code}
        onInputChange={(_event, next) => setInputValue(next)}
        onChange={(_event, rows) => onChange(rows.length > 0 ? rows.map((row) => row.code) : null)}
        noOptionsText="Không có lựa chọn"
        renderInput={(params) => (
          <TextField
            {...params}
            label={displayName}
            required={field.required}
            helperText={getRuntimeChoiceHelperText(source)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        sx={{ minHeight: field.minHeight }}
      />
    );
  }

  return (
    <Autocomplete<ChoiceRuntimeOption, false, false, false>
      fullWidth
      size="small"
      disabled={locked}
      loading={loading}
      options={mergedOptions}
      value={selectedOptions[0] ?? null}
      inputValue={inputValue}
      isOptionEqualToValue={(option, selected) => option.code === selected.code}
      getOptionLabel={(option) => option.label || option.code}
      onInputChange={(_event, next) => setInputValue(next)}
      onChange={(_event, row) => onChange(row?.code ?? null)}
      noOptionsText="Không có lựa chọn"
      renderInput={(params) => (
        <TextField
          {...params}
          label={displayName}
          required={field.required}
          helperText={getRuntimeChoiceHelperText(source)}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={18} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={{ minHeight: field.minHeight }}
    />
  );
}

function normalizeRuntimeChoiceOptions(options?: Array<{ code: string; label: string }> | null): ChoiceRuntimeOption[] {
  const seen = new Set<string>();
  const rows: ChoiceRuntimeOption[] = [];
  for (const option of options ?? []) {
    const code = String(option.code ?? "").trim();
    if (!code || seen.has(code.toLowerCase())) continue;
    seen.add(code.toLowerCase());
    rows.push({ code, label: String(option.label ?? "").trim() || code });
  }
  return rows;
}

function mergeRuntimeChoiceOptions(options: ChoiceRuntimeOption[], selectedCodes: string[]) {
  const seen = new Set<string>();
  const rows: ChoiceRuntimeOption[] = [];
  for (const option of options) {
    if (!option.code || seen.has(option.code)) continue;
    seen.add(option.code);
    rows.push(option);
  }
  for (const code of selectedCodes) {
    if (!code || seen.has(code)) continue;
    seen.add(code);
    rows.push({ code, label: code });
  }
  return rows;
}

function getRuntimeChoiceHelperText(source: DynamicFormField["valueSource"]) {
  if (!source || source.sourceType === "FIXED_ENUM") {
    return "Chọn từ danh sách đã cấu hình; hệ thống lưu mã để thống kê.";
  }
  if (source.sourceType === "ENUM_CATALOG") {
    return "Chọn từ danh mục enum riêng; hệ thống lưu mã để thống kê.";
  }
  return "Chọn từ danh mục hệ thống; hệ thống lưu mã để thống kê.";
}

async function loadRuntimeValueSourceOptions({
  source,
  query,
  searchUnits,
  searchUsers,
  searchPositions,
  searchUnitTypes,
  searchLabelEnumOptions,
}: {
  source: NonNullable<DynamicFormField["valueSource"]>;
  query: string;
  searchUnits: ReturnType<typeof useLazySearchPickerUnitsByCodeQuery>[0];
  searchUsers: ReturnType<typeof useLazySearchPickerUsersQuery>[0];
  searchPositions: ReturnType<typeof useLazySearchPickerPositionsQuery>[0];
  searchUnitTypes: ReturnType<typeof useLazySearchPickerUnitTypesQuery>[0];
  searchLabelEnumOptions: ReturnType<typeof useLazySearchPickerLabelEnumOptionsQuery>[0];
}): Promise<ChoiceRuntimeOption[]> {
  const q = query.trim();
  if (source.sourceType === "ENUM_CATALOG") {
    if (!source.catalogId) return [];
    const result = await searchLabelEnumOptions({ catalogId: source.catalogId, q, page: 0, pageSize: 50 }).unwrap();
    return result.rows.map((row) => ({ code: row.code, label: row.label || row.code }));
  }
  if (source.sourceType === "SYSTEM_UNIT") {
    const result = await searchUnits({ code: q, page: 0, pageSize: 50 }).unwrap();
    return result.rows.map((row) => ({ code: row.id, label: [row.fullName, row.code].filter(Boolean).join(" - ") }));
  }
  if (source.sourceType === "SYSTEM_USER") {
    const result = await searchUsers({ q, page: 0, pageSize: 50 }).unwrap();
    return result.rows.map((row) => ({ code: row.id, label: [row.fullName, row.username].filter(Boolean).join(" - ") }));
  }
  if (source.sourceType === "SYSTEM_POSITION") {
    const result = await searchPositions({ q, page: 0, pageSize: 50 }).unwrap();
    return result.rows.map((row) => ({ code: row.code, label: row.name || row.code }));
  }
  if (source.sourceType === "SYSTEM_UNIT_TYPE") {
    const result = await searchUnitTypes({ q, page: 0, pageSize: 50 }).unwrap();
    return result.rows.map((row) => ({ code: row.code, label: row.name || row.code }));
  }
  return [];
}

function StringListRuntimeEditor({
  label,
  value,
  required,
  minHeight,
  locked,
  onChange,
}: {
  label: string;
  value: string[];
  required: boolean;
  minHeight: number;
  locked: boolean;
  onChange: (value: DynamicFormRuntimeValue) => void;
}) {
  const rows = value.length > 0 ? value : [""];
  const commit = (nextRows: string[]) => {
    onChange(nextRows.length > 0 ? nextRows : null);
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        minHeight,
        p: 1,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {label}{required ? " *" : ""}
          </Typography>
          {!locked && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => commit([...rows, ""])}
            >
              Thêm ý
            </Button>
          )}
        </Stack>
        {rows.map((item, index) => (
          <Stack key={index} direction="row" spacing={0.75} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label={`Ý ${index + 1}`}
              value={item}
              disabled={locked}
              multiline
              minRows={2}
              onChange={(event) => {
                const next = [...rows];
                next[index] = event.target.value;
                commit(next);
              }}
            />
            {!locked && (
              <IconButton
                size="small"
                aria-label="Xóa ý"
                disabled={rows.length <= 1}
                onClick={() => commit(rows.filter((_row, rowIndex) => rowIndex !== index))}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function DynamicFormRuntimeFields(props: DynamicFormRuntimeFieldsProps) {
  const {
    sections,
    fields,
    values,
    readOnly = false,
    disabled = false,
    onChange,
    getFieldState,
    title = "Trường bổ sung",
    layout = "card",
    renderSectionExtra,
    getSectionExtraCount,
    getSectionValidationState,
    getSectionEntryState,
    onSectionChange,
  } = props;

  const locked = readOnly || disabled;
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections],
  );
  const fieldsBySection = useMemo(
    () =>
      fields.reduce<Record<string, DynamicFormField[]>>((acc, field) => {
        (acc[field.sectionId] ??= []).push(field);
        return acc;
      }, {}),
    [fields],
  );
  const visibleSections = useMemo(
    () =>
      sortedSections.filter((section) => {
        const sectionFields = fieldsBySection[section.id] ?? [];
        const extraCount = getSectionExtraCount?.(section) ?? 0;
        return sectionFields.length > 0 || extraCount > 0;
      }),
    [fieldsBySection, getSectionExtraCount, sortedSections],
  );
  const statisticCount = useMemo(
    () => fields.filter((field) => field.isStatistic).length,
    [fields],
  );
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [sectionSwitching, setSectionSwitching] = useState(false);
  const selectedSection =
    visibleSections.find((section) => section.id === selectedSectionId) ??
    visibleSections[0] ??
    null;
  const selectedSectionFields = selectedSection
    ? [...(fieldsBySection[selectedSection.id] ?? [])].sort((a, b) => a.order - b.order)
    : [];
  const selectedSectionExtra = selectedSection ? renderSectionExtra?.(selectedSection) : null;
  const sectionItems = useMemo(
    () =>
      visibleSections.map((section) => {
        const validationState = getSectionValidationState?.(section);
        const entryState = getSectionEntryState?.(section);

        return {
          section,
          fieldCount: fieldsBySection[section.id]?.length ?? 0,
          blockCount: getSectionExtraCount?.(section) ?? 0,
          entryStatus: entryState?.status,
          lastUpdatedAt: entryState?.lastUpdatedAt,
          validationStatus: validationState?.status,
          validationIssueCount: validationState?.issueCount,
        };
      }),
    [fieldsBySection, getSectionEntryState, getSectionExtraCount, getSectionValidationState, visibleSections],
  );

  useEffect(() => {
    setSelectedSectionId((prev) =>
      visibleSections.some((section) => section.id === prev)
        ? prev
        : visibleSections[0]?.id ?? "",
    );
  }, [visibleSections]);

  if (visibleSections.length === 0) return null;

  const requestSectionChange = async (section: DynamicFormSection) => {
    if (sectionSwitching || section.id === selectedSection?.id) return;

    try {
      const result = onSectionChange?.(section);
      if (result && typeof (result as Promise<void | boolean>).then === "function") {
        setSectionSwitching(true);
        const allowed = await result;
        if (allowed === false) return;
      } else if (result === false) {
        return;
      }

      setSelectedSectionId(section.id);
    } catch {
      // Caller owns user-facing error messaging.
    } finally {
      setSectionSwitching(false);
    }
  };

  const renderSelectedSectionContent = () => (
    selectedSection && (
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>
            {selectedSection.title}
          </Typography>
          {selectedSection.description && (
            <Typography variant="body2" color="text.secondary">
              {selectedSection.description}
            </Typography>
          )}
        </Box>

        {selectedSectionFields.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(12, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            {selectedSectionFields.map((field) => (
              <Box
                key={field.id}
                sx={{
                  gridColumn: {
                    xs: "1 / -1",
                    sm: `span ${clampSpan(field.colSpan)}`,
                  },
                  minWidth: 0,
                }}
              >
                <Stack spacing={0.5}>
                  {renderField(field, values[field.id], locked || Boolean(getFieldState?.(field)?.readOnly), (value) =>
                    onChange(field.id, value),
                  )}
                  {field.isStatistic && field.type !== "boolean" && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={uiText(UITextKey.TextThongKe)}
                      sx={{ alignSelf: "flex-start" }}
                    />
                  )}
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        {selectedSectionFields.length > 0 && selectedSectionExtra && <Divider />}
        {selectedSectionExtra}

        {selectedSectionFields.length === 0 && !selectedSectionExtra && (
          <Box
            sx={{
              minHeight: 160,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Phần này chưa có trường dữ liệu hoặc bảng.
            </Typography>
          </Box>
        )}
      </Stack>
    )
  );

  if (layout === "workspace") {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
        <Box
          sx={{
            px: { xs: 1.25, md: 1.5 },
            py: 1.25,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {title && (
              <Typography
                variant="subtitle1"
                fontWeight={800}
                aria-label={typeof title === "string" ? title : undefined}
              >
                <Box component="span">{title}</Box>
                <Box component="span" sx={{ display: "none" }}>
                  Trường bổ sung
                </Box>
              </Typography>
            )}
            <Chip size="small" variant="outlined" label={`${visibleSections.length} phần`} />
            {statisticCount > 0 && (
              <Chip size="small" variant="outlined" label={`${statisticCount} trường thống kê`} />
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "240px minmax(0, 1fr)" },
            minHeight: 420,
          }}
        >
          <Box
            sx={{
              borderRight: { md: "1px solid" },
              borderBottom: { xs: "1px solid", md: "none" },
              borderColor: "divider",
              bgcolor: "background.default",
              p: 1,
              maxHeight: { xs: 220, md: "min(760px, calc(100dvh - 210px))" },
              overflow: "auto",
            }}
          >
            <List dense disablePadding sx={{ display: "grid", gap: 0.5 }}>
              {sectionItems.map((item, index) => {
                const selected = item.section.id === selectedSection?.id;
                return (
                  <ListItemButton
                    key={item.section.id}
                    selected={selected}
                    disabled={sectionSwitching}
                    onClick={() => void requestSectionChange(item.section)}
                    sx={{
                      borderRadius: 1,
                      alignItems: "flex-start",
                      border: "1px solid",
                      borderColor: selected ? "primary.main" : "transparent",
                      px: 1,
                      py: 0.8,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800} noWrap sx={{ minWidth: 0 }}>
                            {index + 1}. {item.section.title || "Chưa đặt tiêu đề"}
                          </Typography>
                          {renderRuntimeSectionEntryChip(item)}
                          {renderRuntimeSectionValidationChip(item)}
                        </Stack>
                      }
                      secondary={formatRuntimeSectionSummary(item)}
                      secondaryTypographyProps={{ noWrap: true }}
                      sx={{ my: 0 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>

          <Box
            sx={{
              minWidth: 0,
              p: { xs: 1.25, md: 1.5 },
              maxHeight: { md: "min(760px, calc(100dvh - 210px))" },
              overflow: "auto",
            }}
          >
            {renderSelectedSectionContent()}
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              aria-label={typeof title === "string" ? title : undefined}
            >
              <Box component="span">{title}</Box>
              <Box component="span" sx={{ display: "none" }}>
              Trường bổ sung
              </Box>
            </Typography>
            {statisticCount > 0 && (
              <Chip size="small" variant="outlined" label={`${statisticCount} trường thống kê`} />
            )}
          </Stack>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1.25,
                bgcolor: "background.default",
              }}
            >
              <DynamicFormSectionSelect
                label="Phần"
                value={selectedSection?.id ?? ""}
                items={sectionItems}
                disabled={sectionSwitching}
                onChange={(section) => void requestSectionChange(section)}
              />
            </Box>

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: { xs: 1.5, md: 2 },
                minHeight: 360,
                maxHeight: { md: "min(680px, calc(100dvh - 220px))" },
                overflow: "auto",
                bgcolor: "background.default",
              }}
            >
              {selectedSection && (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      {selectedSection.title}
                    </Typography>
                    {selectedSection.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedSection.description}
                      </Typography>
                    )}
                  </Box>

                  {selectedSectionFields.length > 0 && (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(12, minmax(0, 1fr))",
                        },
                        gap: 1.5,
                      }}
                    >
                      {selectedSectionFields.map((field) => (
                        <Box
                          key={field.id}
                          sx={{
                            gridColumn: {
                              xs: "1 / -1",
                              sm: `span ${clampSpan(field.colSpan)}`,
                            },
                            minWidth: 0,
                          }}
                        >
                          <Stack spacing={0.5}>
                            {renderField(field, values[field.id], locked || Boolean(getFieldState?.(field)?.readOnly), (value) =>
                              onChange(field.id, value),
                            )}
                            {field.isStatistic && field.type !== "boolean" && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={uiText(UITextKey.TextThongKe)}
                                sx={{ alignSelf: "flex-start" }}
                              />
                            )}
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {selectedSectionFields.length > 0 && selectedSectionExtra && <Divider />}
                  {selectedSectionExtra}

                  {selectedSectionFields.length === 0 && !selectedSectionExtra && (
                    <Box
                      sx={{
                        minHeight: 160,
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 1,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Phần này chưa có trường dữ liệu hoặc bảng.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              )}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
