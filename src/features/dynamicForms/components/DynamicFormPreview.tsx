import React from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import type { DynamicFormDetail } from "../../../api/dynamicFormApi";
import WorkbookDataGrid from "../../../components/excel/fortune/WorkbookDataGrid";
import type { DynamicFormField, DynamicFormSection } from "../dynamicForm.types";
import {
  buildEditorValue,
  excelSpecKindLabels,
  fieldTypeLabels,
  getExcelSpecKindFromBlockLike,
  getDynamicFormBlockJsonList,
  getDynamicFormFieldDisplayName,
  tableModeLabels,
} from "../dynamicFormSchema";

export type DynamicFormPreviewProps = {
  detail: DynamicFormDetail;
  dense?: boolean;
};

type BlockPreview = {
  json: string;
  index: number;
  sectionId?: string | null;
  dynamicExcelTemplateId?: string | null;
  title: string;
  code?: string | null;
  excelSpecKind?: keyof typeof excelSpecKindLabels | null;
  tableMode?: keyof typeof tableModeLabels | null;
  dataRect?: string | null;
  dataRectValue?: { r0: number; c0: number; r1: number; c1: number } | null;
};

export default function DynamicFormPreview({ detail, dense = false }: DynamicFormPreviewProps) {
  const value = React.useMemo(
    () =>
      buildEditorValue({
        code: detail.code,
        name: detail.name,
        description: detail.description,
        tagCodes: detail.tagCodes,
        schemaVersion: detail.schemaVersion,
        isActive: detail.isActive,
        sectionsJson: detail.sectionsJson,
        fieldsJson: detail.fieldsJson,
        excelBlockJson: detail.excelBlockJson,
        blocksJson: detail.blocksJson,
      }),
    [detail]
  );

  const blocks = React.useMemo(
    () =>
      getDynamicFormBlockJsonList(value.blocksJson, value.excelBlockJson, value.sections[0]?.id)
        .map((json, index) => toBlockPreview(json, index)),
    [value.blocksJson, value.excelBlockJson, value.sections]
  );

  const blocksWithoutSection = blocks.filter((block) => !block.sectionId);

  return (
    <Stack spacing={dense ? 1.5 : 2}>
      <Paper variant="outlined" sx={{ p: dense ? 1.5 : 2, borderRadius: 1 }}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant={dense ? "subtitle1" : "h6"} sx={{ fontWeight: 850 }}>
              {value.name || "Biểu mẫu động"}
            </Typography>
            <Chip size="small" label={value.code || detail.id} variant="outlined" />
            <Chip
              size="small"
              label={detail.isPublished ? "Đã công bố" : "Bản nháp"}
              color={detail.isPublished ? "success" : "default"}
              variant={detail.isPublished ? "filled" : "outlined"}
            />
          </Stack>

          {value.description && (
            <Typography variant="body2" color="text.secondary">
              {value.description}
            </Typography>
          )}

          {(value.tagCodes ?? []).length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {value.tagCodes.map((tagCode) => (
                <Chip key={tagCode} size="small" label={tagCode} />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {value.sections.map((section) => (
        <SectionPreview
          key={section.id}
          section={section}
          fields={value.fields.filter((field) => field.sectionId === section.id)}
          blocks={blocks.filter((block) => block.sectionId === section.id)}
          dense={dense}
        />
      ))}

      {blocksWithoutSection.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Phần bảng
          </Typography>
          {blocksWithoutSection.map((block) => (
            <TableBlockPreview key={`${block.index}_${block.title}`} block={block} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function SectionPreview({
  section,
  fields,
  blocks,
  dense,
}: {
  section: DynamicFormSection;
  fields: DynamicFormField[];
  blocks: BlockPreview[];
  dense: boolean;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: dense ? 1.5 : 2, "&:last-child": { pb: dense ? 1.5 : 2 } }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
              {section.title}
            </Typography>
            {section.description && (
              <Typography variant="body2" color="text.secondary">
                {section.description}
              </Typography>
            )}
          </Box>

          {section.tagCodes?.length ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {section.tagCodes.map((tagCode) => (
                <Chip key={tagCode} size="small" label={tagCode} variant="outlined" />
              ))}
            </Stack>
          ) : null}

          <Grid container spacing={1.5}>
            {fields.map((field) => (
              <Grid key={field.id} size={{ xs: 12, sm: field.colSpan }}>
                <FieldPreviewCard field={field} />
              </Grid>
            ))}
          </Grid>

          {fields.length === 0 && blocks.length === 0 && (
            <Box
              sx={{
                minHeight: 120,
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

          {blocks.map((block) => (
            <TableBlockPreview key={`${block.index}_${block.title}`} block={block} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function FieldPreviewCard({ field }: { field: DynamicFormField }) {
  const displayName = getDynamicFormFieldDisplayName(field);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 1,
        minHeight: Math.max(72, field.minHeight ?? 72),
        bgcolor: "background.default",
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" sx={{ fontWeight: 750 }}>
            {displayName}
          </Typography>
          {field.required && <Chip size="small" label="Bắt buộc" variant="outlined" />}
          {field.isStatistic && <Chip size="small" label="Thống kê" color="primary" variant="outlined" />}
          <Chip size="small" label={fieldTypeLabels[field.type]} variant="outlined" />
        </Stack>

        <FieldControlPreview field={field} />
      </Stack>
    </Paper>
  );
}

function FieldControlPreview({ field }: { field: DynamicFormField }) {
  const displayName = getDynamicFormFieldDisplayName(field);

  if (field.type === "boolean") {
    return <FormControlLabel control={<Checkbox disabled />} label={displayName} />;
  }

  if (field.type === "shortText" || field.type === "singleSelect") {
    return (
      <Select
        size="small"
        fullWidth
        value=""
        disabled
        displayEmpty
        renderValue={() => (
          <Typography component="span" color="text.secondary">
            Chưa chọn
          </Typography>
        )}
      >
        <MenuItem value="">Chưa chọn</MenuItem>
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    );
  }

  if (field.type === "multiSelect") {
    return (
      <Select
        size="small"
        fullWidth
        multiple
        value={[]}
        disabled
        displayEmpty
        renderValue={() => (
          <Typography component="span" color="text.secondary">
            Chưa chọn
          </Typography>
        )}
      >
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      multiline={field.type === "longText" || field.type === "stringList"}
      minRows={field.type === "longText" || field.type === "stringList" ? 3 : undefined}
      label={displayName}
      disabled
      InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
    />
  );
}

function TableBlockPreview({ block }: { block: BlockPreview }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: "background.default" }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TableChartOutlinedIcon fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {block.title}
          </Typography>
          {block.code && <Chip size="small" label={block.code} variant="outlined" />}
          {block.excelSpecKind && (
            <Chip size="small" label={excelSpecKindLabels[block.excelSpecKind]} variant="outlined" />
          )}
          {block.tableMode && <Chip size="small" label={tableModeLabels[block.tableMode]} variant="outlined" />}
        </Stack>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {block.dataRect && <Chip size="small" label={`Vùng dữ liệu: ${block.dataRect}`} />}
          <Chip size="small" label="Cấu hình bảng Excel động" variant="outlined" />
        </Stack>

        <Box
          sx={{
            width: "100%",
            minHeight: 72,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 1,
            px: 2,
            py: 1.5,
          }}
        >
          <DynamicExcelBlockWorkbookPreview block={block} />
        </Box>
      </Stack>
    </Paper>
  );
}

function DynamicExcelBlockWorkbookPreview({ block }: { block: BlockPreview }) {
  const dynamicExcelId = block.dynamicExcelTemplateId?.trim() ?? "";
  const { data, isLoading, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId },
    { skip: !dynamicExcelId },
  );

  const parsed = React.useMemo(() => {
    if (!data) return null;
    const dataRect = block.dataRectValue ?? normalizeDataRectValue(data.dataRect);
    if (!dataRect) return null;

    return {
      spec: safeParseJson<any>(data.specJson, null),
      workbook: safeParseJson<any[]>(data.rawWorkbookDataJson, []) ?? [],
      dataRect,
    };
  }, [block.dataRectValue, data]);

  if (!dynamicExcelId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Bảng chưa có mã biểu mẫu Excel động để xem trước.
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 120 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (isError || !parsed) {
    return <Alert severity="error">Không tải được biểu mẫu Excel động để xem trước.</Alert>;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <WorkbookDataGrid
        initialSpec={parsed.spec}
        initialWorkbookData={parsed.workbook}
        dataRect={parsed.dataRect ?? { r0: 0, c0: 0, r1: 0, c1: 0 }}
        mode="view"
        readOnly
        showActions={false}
      />
    </Box>
  );
}

function toBlockPreview(json: string, index: number): BlockPreview {
  const obj = parseObject(json);
  const dynamicExcelTemplateId = readString(
    obj?.dynamicExcelTemplateId ??
      obj?.DynamicExcelTemplateId ??
      obj?.excelBlockDynamicExcelTemplateId ??
      obj?.ExcelBlockDynamicExcelTemplateId,
  );
  const dynamicExcelCode = readString(obj?.dynamicExcelCode ?? obj?.DynamicExcelCode ?? obj?.code);
  const dynamicExcelName = readString(obj?.dynamicExcelName ?? obj?.DynamicExcelName ?? obj?.name);
  const excelSpecKind = getExcelSpecKindFromBlockLike(obj);
  const tableMode = normalizeTableModeValue(obj?.tableMode ?? obj?.TableMode);
  const dataRectValue = normalizeDataRectValue(obj?.dataRect);
  const fallbackTitle = `Phần bảng ${index + 1}`;

  return {
    json,
    index,
    sectionId: readString(obj?.sectionId ?? obj?.SectionId),
    dynamicExcelTemplateId,
    title: [dynamicExcelCode, dynamicExcelName].filter(Boolean).join(" - ") || fallbackTitle,
    code: dynamicExcelCode,
    excelSpecKind,
    tableMode,
    dataRect: formatDataRect(dataRectValue),
    dataRectValue,
  };
}

function parseObject(json: string | null | undefined): Record<string, any> | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeParseJson<T>(input?: string | null, fallback?: T): T | undefined {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTableModeValue(value: unknown): keyof typeof tableModeLabels | null {
  const raw = readString(value)?.toUpperCase();
  return raw && raw in tableModeLabels ? (raw as keyof typeof tableModeLabels) : null;
}

function normalizeDataRectValue(value: unknown): { r0: number; c0: number; r1: number; c1: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rect = value as Record<string, unknown>;
  const r0 = Number(rect.r0 ?? rect.R0);
  const c0 = Number(rect.c0 ?? rect.C0);
  const r1 = Number(rect.r1 ?? rect.R1);
  const c1 = Number(rect.c1 ?? rect.C1);
  if (![r0, c0, r1, c1].every(Number.isFinite)) return null;
  if (r0 < 0 || c0 < 0 || r1 < r0 || c1 < c0) return null;
  return { r0, c0, r1, c1 };
}

function formatDataRect(value: unknown): string | null {
  const rect = normalizeDataRectValue(value);
  if (!rect) return null;
  const { r0, c0, r1, c1 } = rect;
  return `R${r0 + 1}:C${c0 + 1} - R${r1 + 1}:C${c1 + 1}`;
}
