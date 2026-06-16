import React from "react";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { DynamicFormDetail } from "../../../api/dynamicFormApi";
import type { DynamicFormField, DynamicFormSection } from "../dynamicForm.types";
import DynamicFormExcelBlockPreview from "./DynamicFormExcelBlockPreview";
import DynamicFormSectionSelect from "./DynamicFormSectionSelect";
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

  const fieldsBySection = React.useMemo(
    () =>
      value.fields.reduce<Record<string, DynamicFormField[]>>((acc, field) => {
        (acc[field.sectionId] ??= []).push(field);
        return acc;
      }, {}),
    [value.fields],
  );
  const blocksBySection = React.useMemo(() => {
    const sectionIds = new Set(value.sections.map((section) => section.id));
    const fallbackSectionId = value.sections[0]?.id ?? "";

    return blocks.reduce<Record<string, BlockPreview[]>>((acc, block) => {
      const targetSectionId =
        block.sectionId && sectionIds.has(block.sectionId)
          ? block.sectionId
          : fallbackSectionId;
      if (!targetSectionId) return acc;
      (acc[targetSectionId] ??= []).push(block);
      return acc;
    }, {});
  }, [blocks, value.sections]);
  const sectionItems = React.useMemo(
    () =>
      [...value.sections]
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          section,
          fields: [...(fieldsBySection[section.id] ?? [])].sort((a, b) => a.order - b.order),
          blocks: blocksBySection[section.id] ?? [],
        })),
    [blocksBySection, fieldsBySection, value.sections],
  );
  const [selectedSectionId, setSelectedSectionId] = React.useState("");
  const selectedSectionItem =
    sectionItems.find((item) => item.section.id === selectedSectionId) ??
    sectionItems[0] ??
    null;

  React.useEffect(() => {
    setSelectedSectionId((prev) =>
      sectionItems.some((item) => item.section.id === prev)
        ? prev
        : sectionItems[0]?.section.id ?? "",
    );
  }, [sectionItems]);

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

      {selectedSectionItem && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: dense ? 1 : 1.5,
            minWidth: 0,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: dense ? 1 : 1.25,
              borderRadius: 1,
              bgcolor: "background.default",
            }}
          >
            <DynamicFormSectionSelect
              dense={dense}
              label="Phần"
              value={selectedSectionItem.section.id}
              items={sectionItems.map((item) => ({
                section: item.section,
                fieldCount: item.fields.length,
                blockCount: item.blocks.length,
              }))}
              onChange={(section) => setSelectedSectionId(section.id)}
            />
          </Paper>

          <SectionPreview
            section={selectedSectionItem.section}
            fields={selectedSectionItem.fields}
            blocks={selectedSectionItem.blocks}
            dense={dense}
          />
        </Box>
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
    <DynamicFormExcelBlockPreview
      blockJson={block.json}
      title={block.title}
      tableMode={block.tableMode}
    />
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
