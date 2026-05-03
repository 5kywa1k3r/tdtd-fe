// src/pages/works/report/WorkReportEditorPage.tsx
import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";

import WorkbookDataGrid from "../../../components/excel/fortune/WorkbookDataGrid";
import ReportStatusChip from "../../../components/reports/ReportStatusChip";
import ReportPeriodStatusChip from "../../../components/reports/ReportPeriodStatusChip";

import {
  useGetWorkAssignmentReportLogsQuery,
  useGetWorkAssignmentReportQuery,
  useSaveWorkAssignmentReportDraftMutation,
  useSubmitWorkAssignmentReportMutation,
  useWithdrawSubmittedReportMutation,
} from "../../../api/reportApi";
import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";

import { WorkAssignmentReportStatus } from "../../../types/reportStatus";
import type { WorkAssignmentReportLogRow } from "../../../types/report";
import { parseReportDetail } from "../../../types/report.parses";
import type { ReportCellValue } from "../../../types/report.helper";
import {
  buildEditorValue,
  normalizeLabelCodes,
  normalizeTableMode,
} from "../../../features/dynamicForms/dynamicFormSchema";
import type {
  DynamicFormField,
  DynamicFormTableIndexMapItem,
  DynamicFormTableMode,
} from "../../../features/dynamicForms/dynamicForm.types";
import DynamicFormRuntimeFields, {
  type DynamicFormRuntimeValue,
  type DynamicFormRuntimeValues,
} from "../../../features/dynamicForms/runtime/DynamicFormRuntimeFields";

export interface WorkReportEditorPageProps {
  workId: string;
  reportId: string;
  workReportPeriodId?: string;
  onBack?: () => void;
  onSaved?: () => void;
  onSubmitted?: () => void;
}

type WorkbookSavePayload = {
  values1D: ReportCellValue[];
};

type ParsedReportDetail = ReturnType<typeof parseReportDetail>;
type DynamicFormRuntimeSchema = ReturnType<typeof buildEditorValue>;

function isEditableReportStatus(status?: number | null) {
  return Number(status) === WorkAssignmentReportStatus.Draft;
}

function isOverdue(dueAtUtc?: string | null) {
  if (!dueAtUtc) return false;
  return new Date(dueAtUtc).getTime() < Date.now();
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return withTime ? d.toLocaleString("vi-VN") : d.toLocaleDateString("vi-VN");
}

function parseDynamicFieldValues(input?: string | null): DynamicFormRuntimeValues {
  if (!input?.trim()) return {};

  try {
    const parsed = JSON.parse(input);
    const rawValues =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      parsed.values &&
      typeof parsed.values === "object" &&
      !Array.isArray(parsed.values)
        ? parsed.values
        : parsed;

    if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(rawValues).filter(([, value]) => {
        if (value == null) return true;
        if (typeof value === "string") return true;
        if (typeof value === "number") return Number.isFinite(value);
        if (typeof value === "boolean") return true;
        return Array.isArray(value) && value.every((item) => typeof item === "string");
      }),
    ) as DynamicFormRuntimeValues;
  } catch {
    return {};
  }
}

function normalizeDynamicValue(
  field: DynamicFormField,
  value: DynamicFormRuntimeValue | undefined,
): DynamicFormRuntimeValue {
  if (field.type === "boolean") {
    return typeof value === "boolean" ? value : null;
  }

  if (field.type === "number") {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  if (field.type === "multiSelect") {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  if (value == null) return null;
  const text = String(value);
  return text === "" ? null : text;
}

function sanitizeDynamicFieldValues(
  fields: DynamicFormField[],
  values: DynamicFormRuntimeValues,
): DynamicFormRuntimeValues {
  return Object.fromEntries(
    fields.map((field) => [field.id, normalizeDynamicValue(field, values[field.id])]),
  );
}

function buildDynamicFieldValuesJson(
  detail: ParsedReportDetail,
  form: DynamicFormRuntimeSchema | null,
  values: DynamicFormRuntimeValues,
) {
  if (!detail.dynamicFormTemplateId) return detail.fieldValuesJson ?? null;
  if (!form) return detail.fieldValuesJson ?? null;

  const normalizedValues = sanitizeDynamicFieldValues(form.fields, values);

  return JSON.stringify({
    dynamicFormTemplateId: detail.dynamicFormTemplateId,
    dynamicFormTemplateCode: detail.dynamicFormTemplateCode ?? null,
    dynamicFormTemplateName: detail.dynamicFormTemplateName ?? null,
    schemaVersion: form?.schemaVersion ?? null,
    values: normalizedValues,
    updatedAtUtc: new Date().toISOString(),
  });
}

type ExcelBlockLabelColumn = {
  columnIndex?: number;
};

type ExcelBlockDataRect = {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
};

type ExcelBlockRowLabelDefault = {
  sheetId?: string;
  rowKey?: string;
  rowIndex?: number;
  labelCodes?: string[];
  locked?: boolean;
  source?: string;
};

function parseObjectJson(input?: string | null): Record<string, unknown> | null {
  if (!input?.trim()) return null;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getExcelBlockLabelColumns(excelBlockJson?: string | null): number[] {
  const obj = parseObjectJson(excelBlockJson);
  const columns = Array.isArray(obj?.labelColumns) ? obj.labelColumns : [];
  return Array.from(
    new Set(
      columns
        .map((item) =>
          item && typeof item === "object"
            ? Number((item as ExcelBlockLabelColumn).columnIndex)
            : NaN,
        )
        .filter((value) => Number.isInteger(value) && value >= 0),
    ),
  );
}

function buildTableValuesJson(
  detail: ParsedReportDetail,
  form: DynamicFormRuntimeSchema | null,
  values1D?: ReportCellValue[],
) {
  if (!detail.dynamicFormTemplateId) return detail.tableValuesJson ?? null;
  if (!form?.excelBlockJson) return detail.tableValuesJson ?? null;

  const excelBlock = parseObjectJson(form.excelBlockJson);
  if (!excelBlock) return detail.tableValuesJson ?? null;
  const tableMode = normalizeTableMode(excelBlock.tableMode);
  const blockId = String(excelBlock.blockId ?? excelBlock.id ?? "excel_block");
  const indexMap = getExcelBlockIndexMap(excelBlock, blockId, tableMode);
  const dataRect = getExcelBlockDataRect(excelBlock);
  const tableValues = Array.isArray(values1D) ? values1D : detail.values1D ?? [];

  const defaults = Array.isArray(excelBlock.rowLabelDefaults)
    ? (excelBlock.rowLabelDefaults.filter(
        (item) => item && typeof item === "object",
      ) as ExcelBlockRowLabelDefault[])
    : [];

  const rowLabels = defaults
    .map((row) => ({
      sheetId: row.sheetId ?? "sheet_1",
      rowKey: row.rowKey ?? buildReportRowKey(row.rowIndex),
      rowIndex: normalizeRowIndex(row.rowIndex, row.rowKey),
      labelCodes: normalizeLabelCodes(row.labelCodes),
      locked: Boolean(row.locked),
      source: "TEMPLATE_DEFAULT",
    }))
    .filter((row) => Number.isInteger(row.rowIndex) && row.rowIndex >= 0 && row.labelCodes.length > 0)
    .sort((a, b) => a.rowIndex - b.rowIndex);
  const appendRows = buildAppendRowsTableRecords(tableMode, blockId, dataRect, tableValues, rowLabels);
  const appendColumns = buildAppendColumnsTableRecords(tableMode, blockId, dataRect, tableValues);
  const matrixCells = buildMatrixTableCellRecords(tableMode, blockId, dataRect, tableValues, indexMap);

  if (
    rowLabels.length === 0 &&
    tableValues.length === 0 &&
    indexMap.length === 0 &&
    appendRows.length === 0 &&
    appendColumns.length === 0 &&
    matrixCells.length === 0
  ) {
    return null;
  }

  return JSON.stringify({
    dynamicFormTemplateId: detail.dynamicFormTemplateId,
    dynamicFormTemplateCode: detail.dynamicFormTemplateCode ?? null,
    dynamicFormTemplateName: detail.dynamicFormTemplateName ?? null,
    updatedAtUtc: new Date().toISOString(),
    blocks: [
      {
        blockId,
        dynamicExcelTemplateId:
          String(excelBlock.dynamicExcelTemplateId ?? detail.dynamicExcelTemplateId ?? "") || null,
        tableMode,
        w: getPositiveInt(excelBlock.w ?? excelBlock.W) || null,
        h: getPositiveInt(excelBlock.h ?? excelBlock.H) || null,
        dataRect,
        values1D: tableValues,
        indexMap,
        rowLabels,
        rows: appendRows,
        columns: appendColumns,
        cells: matrixCells,
      },
    ],
  });
}

function buildAppendRowsTableRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
  rowLabels: Array<{ rowIndex: number; labelCodes: string[] }>,
) {
  if (tableMode !== "APPEND_ROWS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: height }, (_, rowOffset) => {
    const absoluteRow = dataRect.r0 + rowOffset;
    const cells = Object.fromEntries(
      Array.from({ length: width }, (_, colOffset) => {
        const value = tableValues[rowOffset * width + colOffset];
        const numericValue = typeof value === "number" && Number.isFinite(value) ? value : null;
        return [`col_${colOffset + 1}`, numericValue] as const;
      }).filter(([, value]) => value !== null),
    );

    const rowLabelCodes =
      rowLabels.find((row) => row.rowIndex === absoluteRow)?.labelCodes ?? [];

    return {
      rowInstanceId: `${normalizeMetricPart(blockId, "excel_block")}:row:${absoluteRow + 1}`,
      rowOrder: rowOffset + 1,
      rowKey: `sheet_1:R${absoluteRow + 1}`,
      rowLabelCodes,
      cells,
    };
  }).filter((row) => Object.keys(row.cells).length > 0 || row.rowLabelCodes.length > 0);
}

function buildAppendColumnsTableRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
) {
  if (tableMode !== "APPEND_COLUMNS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: width }, (_, colOffset) => {
    const absoluteColumn = dataRect.c0 + colOffset;
    const cells = Object.fromEntries(
      Array.from({ length: height }, (_, rowOffset) => {
        const value = tableValues[rowOffset * width + colOffset];
        const numericValue = typeof value === "number" && Number.isFinite(value) ? value : null;
        return [`row_${rowOffset + 1}`, numericValue] as const;
      }).filter(([, value]) => value !== null),
    );

    return {
      columnInstanceId: `${normalizeMetricPart(blockId, "excel_block")}:column:${absoluteColumn + 1}`,
      columnOrder: colOffset + 1,
      columnKey: `sheet_1:C${absoluteColumn + 1}`,
      columnLabelCodes: [],
      cells,
    };
  }).filter((column) => Object.keys(column.cells).length > 0);
}

function buildMatrixTableCellRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
  indexMap: DynamicFormTableIndexMapItem[],
) {
  if (tableMode !== "MATRIX" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  const metricByIndex = new Map(indexMap.map((item) => [item.index, item]));

  return Array.from({ length: width * height }, (_, index) => {
    const rowOffset = Math.floor(index / width);
    const colOffset = index % width;
    const value = tableValues[index];
    if (typeof value !== "number" || !Number.isFinite(value)) return null;

    const metric =
      metricByIndex.get(index) ?? {
        index,
        rowKey: `row_${rowOffset + 1}`,
        columnKey: `col_${colOffset + 1}`,
        metricKey: buildMetricKey(blockId, `row_${rowOffset + 1}`, `col_${colOffset + 1}`),
      };

    return {
      rowAxisKey: "row",
      rowKey: metric.rowKey,
      columnAxisKey: "column",
      columnKey: metric.columnKey,
      metricKey: metric.metricKey,
      value,
    };
  }).filter((cell): cell is NonNullable<typeof cell> => Boolean(cell));
}

function getExcelBlockIndexMap(
  excelBlock: Record<string, unknown>,
  blockId: string,
  tableMode: DynamicFormTableMode,
): DynamicFormTableIndexMapItem[] {
  if (tableMode !== "FIXED_GRID" && tableMode !== "MATRIX") return [];

  const raw = Array.isArray(excelBlock.indexMap) ? excelBlock.indexMap : [];
  const normalized = raw
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const rowKey = normalizeMetricPart(row.rowKey, `row_${index + 1}`);
      const columnKey = normalizeMetricPart(row.columnKey, "value");
      return {
        index: getNonNegativeInt(row.index, index),
        rowKey,
        columnKey,
        metricKey:
          typeof row.metricKey === "string" && row.metricKey.trim()
            ? row.metricKey.trim()
            : buildMetricKey(blockId, rowKey, columnKey),
      };
    })
    .filter((item): item is DynamicFormTableIndexMapItem => Boolean(item));

  if (normalized.length > 0) return normalized;

  const width = getPositiveInt(excelBlock.w ?? excelBlock.W);
  const height = getPositiveInt(excelBlock.h ?? excelBlock.H);
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: width * height }, (_, index) => {
    const rowKey = `row_${Math.floor(index / width) + 1}`;
    const columnKey = `col_${(index % width) + 1}`;
    return {
      index,
      rowKey,
      columnKey,
      metricKey: buildMetricKey(blockId, rowKey, columnKey),
    };
  });
}

function getExcelBlockDataRect(excelBlock: Record<string, unknown>): ExcelBlockDataRect | null {
  const raw = excelBlock.dataRect;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rect = raw as Record<string, unknown>;
  const r0 = Number(rect.r0 ?? rect.R0);
  const c0 = Number(rect.c0 ?? rect.C0);
  const r1 = Number(rect.r1 ?? rect.R1);
  const c1 = Number(rect.c1 ?? rect.C1);
  if (![r0, c0, r1, c1].every(Number.isFinite)) return null;
  return { r0, c0, r1, c1 };
}

function getPositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function getNonNegativeInt(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

function normalizeMetricPart(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function buildMetricKey(blockId: string, rowKey: string, columnKey: string) {
  return `table:${normalizeMetricPart(blockId, "excel_block")}.row:${rowKey}.column:${columnKey}`;
}

function normalizeRowIndex(rowIndex?: number, rowKey?: string) {
  const value = Number(rowIndex);
  if (Number.isInteger(value) && value >= 0) return value;

  const match = typeof rowKey === "string" ? rowKey.match(/R(\d+)$/i) : null;
  return match ? Number(match[1]) - 1 : Number.NaN;
}

function buildReportRowKey(rowIndex?: number) {
  const value = Number(rowIndex);
  return Number.isInteger(value) && value >= 0 ? `sheet_1:R${value + 1}` : null;
}

function hasRequiredDynamicValue(field: DynamicFormField, values: DynamicFormRuntimeValues) {
  const value = values[field.id];
  if (field.type === "boolean") return value === true || value === false;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "";
}

function getMissingRequiredFields(
  fields: DynamicFormField[],
  values: DynamicFormRuntimeValues,
) {
  return fields.filter((field) => field.required && !hasRequiredDynamicValue(field, values));
}

function getLogActionLabel(action?: string) {
  switch (action) {
    case "INIT_DRAFT":
      return "Khởi tạo nháp";
    case "SAVE_DRAFT":
      return "Lưu nháp";
    case "SUBMIT":
      return "Nộp báo cáo";
    case "APPROVE":
      return "Duyệt báo cáo";
    case "RETURN":
      return "Trả lại báo cáo";
    default:
      return action || "-";
  }
}

type HeaderSectionProps = {
  detail: ReturnType<typeof parseReportDetail>;
  overdue: boolean;
  canEdit: boolean;
  onBack?: () => void;
};

function ReportHeaderSection(props: HeaderSectionProps) {
  const { detail, overdue, canEdit, onBack } = props;
  if (!detail) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {detail.dynamicFormTemplateName ||
                  detail.dynamicExcelTemplateName ||
                  "Biểu mẫu báo cáo"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detail.dynamicFormTemplateCode || detail.dynamicExcelTemplateCode || "-"} • Kỳ{" "}
                {detail.periodKey}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <ReportStatusChip status={detail.status} />
              <ReportPeriodStatusChip status={detail.periodStatus} />
              {detail.dueAtUtc && (
                <Chip
                  size="small"
                  variant="outlined"
                  color={overdue ? "error" : "default"}
                  label={`Hạn: ${formatDate(detail.dueAtUtc)}`}
                />
              )}
            </Stack>
          </Stack>

          {detail.status === WorkAssignmentReportStatus.Submitted && (
            <Alert severity="info">
              Báo cáo đã nộp và đang chờ duyệt. Hiện chỉ có thể xem.
            </Alert>
          )}

          {detail.status === WorkAssignmentReportStatus.Approved && (
            <Alert severity="success">
              Báo cáo đã được duyệt. Hiện chỉ có thể xem.
            </Alert>
          )}

          {canEdit && (
            <Alert severity="info">
              Bấm <b>Lưu nháp</b> để ghi workbook mới nhất. Khi bấm <b>Nộp báo cáo</b>,
              hệ thống sẽ tự lưu dữ liệu trước rồi mới gửi báo cáo.
            </Alert>
          )}

          {overdue && (
            <Alert severity="warning">
              Báo cáo đã quá hạn. Khi nộp bắt buộc phải nhập <b>Lý do trễ hạn</b>.
            </Alert>
          )}

          {detail.returnReason && (
            <Alert severity="warning">
              <b>Lý do trả lại:</b> {detail.returnReason}
            </Alert>
          )}

          {detail.reviewerComment && (
            <Alert severity="info">
              <b>Nhận xét:</b> {detail.reviewerComment}
            </Alert>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" onClick={onBack}>
              Quay lại
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

type ActionBarProps = {
  canEdit: boolean;
  canWithdraw: boolean;
  busy: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onOpenWithdraw: () => void;
  onOpenLogs: () => void;
};

function ReportActionBar(props: ActionBarProps) {
  const { canEdit, canWithdraw, busy, onSubmit, onOpenWithdraw, onOpenLogs } = props;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Button
        variant="outlined"
        startIcon={<HistoryOutlinedIcon />}
        onClick={onOpenLogs}
        disabled={busy}
      >
        Xem log
      </Button>

      {canEdit && (
        <>
          <Button
            variant="contained"
            startIcon={<SendOutlinedIcon />}
            onClick={onSubmit}
            disabled={busy}
          >
            Nộp báo cáo
          </Button>
        </>
      )}

      {canWithdraw && (
        <Button
          variant="outlined"
          color="warning"
          startIcon={<UndoOutlinedIcon />}
          onClick={onOpenWithdraw}
          disabled={busy}
        >
          Thu hồi
        </Button>
      )}
    </Stack>
  );
}

type BusinessFormSectionProps = {
  canEdit: boolean;
  busy: boolean;
  overdue: boolean;
  currentProgressStatus: string;
  reportReason: string;
  difficulties: string;
  proposedSolution: string;
  lateReason: string;
  setCurrentProgressStatus: (v: string) => void;
  setReportReason: (v: string) => void;
  setDifficulties: (v: string) => void;
  setProposedSolution: (v: string) => void;
  setLateReason: (v: string) => void;
};

function ReportBusinessFormSection(props: BusinessFormSectionProps) {
  const {
    canEdit,
    busy,
    overdue,
    currentProgressStatus,
    reportReason,
    difficulties,
    proposedSolution,
    lateReason,
    setCurrentProgressStatus,
    setReportReason,
    setDifficulties,
    setProposedSolution,
    setLateReason,
  } = props;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Thông tin nghiệp vụ
          </Typography>

          <TextField
            size="small"
            label="Trạng thái hiện tại"
            value={currentProgressStatus}
            disabled={!canEdit || busy}
            onChange={(e) => setCurrentProgressStatus(e.target.value)}
            fullWidth
          />

          <TextField
            size="small"
            label="Lý do / nội dung báo cáo"
            value={reportReason}
            disabled={!canEdit || busy}
            onChange={(e) => setReportReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            size="small"
            label="Khó khăn, vướng mắc"
            value={difficulties}
            disabled={!canEdit || busy}
            onChange={(e) => setDifficulties(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            size="small"
            label="Phương án giải quyết / đề xuất"
            value={proposedSolution}
            disabled={!canEdit || busy}
            onChange={(e) => setProposedSolution(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            size="small"
            label="Lý do trễ hạn"
            value={lateReason}
            disabled={!canEdit || busy}
            onChange={(e) => setLateReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            required={overdue}
            helperText={
              overdue
                ? "Bắt buộc nhập khi báo cáo quá hạn."
                : "Chỉ cần nhập nếu nộp quá hạn."
            }
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

type LogsDialogProps = {
  open: boolean;
  onClose: () => void;
  logs?: WorkAssignmentReportLogRow[];
  isFetching: boolean;
  isError: boolean;
};

function ReportLogsDialog(props: LogsDialogProps) {
  const { open, onClose, logs, isFetching, isError } = props;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Lịch sử thao tác báo cáo</DialogTitle>
      <DialogContent dividers>
        {isFetching ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2">Đang tải log...</Typography>
          </Stack>
        ) : isError ? (
          <Alert severity="error">Không tải được log báo cáo.</Alert>
        ) : !logs || logs.length === 0 ? (
          <Alert severity="info">Chưa có log nào.</Alert>
        ) : (
          <Stack spacing={1.5}>
            {logs.map((x) => (
              <Card key={x.id} variant="outlined">
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {getLogActionLabel(x.action)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thời điểm: {formatDate(x.actionAtUtc, true)}
                    </Typography>
                    {x.reason && (
                      <Typography variant="body2">
                        <b>Lý do:</b> {x.reason}
                      </Typography>
                    )}
                    {x.comment && (
                      <Typography variant="body2">
                        <b>Nhận xét:</b> {x.comment}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function WorkReportEditorPage(
  props: WorkReportEditorPageProps
) {
  const { reportId, onBack, onSaved, onSubmitted } = props;

  const { data, isLoading, isError, refetch } = useGetWorkAssignmentReportQuery(
    reportId,
    { skip: !reportId }
  );

  const [saveDraft, saveDraftState] = useSaveWorkAssignmentReportDraftMutation();
  const [submitReport, submitState] = useSubmitWorkAssignmentReportMutation();
  const [withdrawSubmittedReport, withdrawState] = useWithdrawSubmittedReportMutation();

  const [logsOpen, setLogsOpen] = React.useState(false);
  const {
    data: logs,
    isFetching: isFetchingLogs,
    isError: isLogsError,
  } = useGetWorkAssignmentReportLogsQuery(
    { id: reportId },
    {
      skip: !logsOpen || !reportId,
    }
  );

  const detail = React.useMemo(
    () => (data ? parseReportDetail(data) : null),
    [data]
  );

  const dynamicFormTemplateId = detail?.dynamicFormTemplateId?.trim() ?? "";
  const {
    data: dynamicFormDetail,
    isFetching: isFetchingDynamicForm,
  } = useGetDynamicFormQuery(
    { id: dynamicFormTemplateId },
    { skip: !dynamicFormTemplateId },
  );
  const dynamicFormRuntime = React.useMemo(
    () => (dynamicFormDetail ? buildEditorValue(dynamicFormDetail) : null),
    [dynamicFormDetail],
  );
  const excludedDataColumns = React.useMemo(
    () => getExcelBlockLabelColumns(dynamicFormRuntime?.excelBlockJson),
    [dynamicFormRuntime?.excelBlockJson],
  );

  const canEdit = detail ? isEditableReportStatus(detail.status) : false;
  const canWithdraw = detail?.status === WorkAssignmentReportStatus.Submitted;
  const overdue = isOverdue(detail?.dueAtUtc);

  const [currentProgressStatus, setCurrentProgressStatus] = React.useState("");
  const [reportReason, setReportReason] = React.useState("");
  const [difficulties, setDifficulties] = React.useState("");
  const [proposedSolution, setProposedSolution] = React.useState("");
  const [lateReason, setLateReason] = React.useState("");
  const [fieldValues, setFieldValues] = React.useState<DynamicFormRuntimeValues>({});

  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [withdrawReason, setWithdrawReason] = React.useState("");

  const latestWorkbookPayloadRef = React.useRef<WorkbookSavePayload | null>(null);

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({
      open: true,
      message,
    });
  }, []);

  React.useEffect(() => {
    if (!detail) return;

    setCurrentProgressStatus(detail.currentProgressStatus ?? "");
    setReportReason(detail.reportReason ?? "");
    setDifficulties(detail.difficulties ?? "");
    setProposedSolution(detail.proposedSolution ?? "");
    setLateReason(detail.lateReason ?? "");
  }, [detail]);

  React.useEffect(() => {
    if (!detail) {
      setFieldValues({});
      return;
    }

    setFieldValues(parseDynamicFieldValues(detail.fieldValuesJson));
  }, [detail]);

  const handleDynamicFieldChange = React.useCallback(
    (fieldId: string, value: DynamicFormRuntimeValue) => {
      setFieldValues((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
    },
    [],
  );

  const handleSaveDraft = async (payload?: WorkbookSavePayload) => {
    if (!detail) return;

    const workbookPayload =
      payload ?? latestWorkbookPayloadRef.current ?? { values1D: detail.values1D ?? [] };
    const fieldValuesJson = buildDynamicFieldValuesJson(
      detail,
      dynamicFormRuntime,
      fieldValues,
    );
    const tableValuesJson = buildTableValuesJson(
      detail,
      dynamicFormRuntime,
      workbookPayload.values1D,
    );

    try {
      await saveDraft({
        id: detail.id,
        data: {
          values1D: workbookPayload.values1D,
          fieldValuesJson,
          tableValuesJson,
          currentProgressStatus: currentProgressStatus.trim() || null,
          reportReason: reportReason.trim() || null,
          difficulties: difficulties.trim() || null,
          proposedSolution: proposedSolution.trim() || null,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      await refetch();
      onSaved?.();
      showMessage("Đã lưu nháp.");
    } catch (error) {
      console.error(error);
      showMessage("Lưu nháp thất bại.");
    }
  };

  const handleSubmit = async () => {
    if (!detail) return;

    if (overdue && !lateReason.trim()) {
      showMessage("Bắt buộc nhập lý do trễ hạn trước khi nộp.");
      return;
    }

    if (dynamicFormTemplateId && !dynamicFormRuntime) {
      showMessage("Chưa tải xong trường bổ sung.");
      return;
    }

    const missingRequiredFields = dynamicFormRuntime
      ? getMissingRequiredFields(dynamicFormRuntime.fields, fieldValues)
      : [];
    if (missingRequiredFields.length > 0) {
      showMessage(
        `Thiếu trường bắt buộc: ${missingRequiredFields
          .slice(0, 3)
          .map((field) => field.label)
          .join(", ")}`,
      );
      return;
    }

    try {
      const workbookPayload =
        latestWorkbookPayloadRef.current ?? { values1D: detail.values1D ?? [] };
      const fieldValuesJson = buildDynamicFieldValuesJson(
        detail,
        dynamicFormRuntime,
        fieldValues,
      );
      const tableValuesJson = buildTableValuesJson(
        detail,
        dynamicFormRuntime,
        workbookPayload.values1D,
      );

      await saveDraft({
        id: detail.id,
        data: {
          values1D: workbookPayload.values1D,
          fieldValuesJson,
          tableValuesJson,
          currentProgressStatus: currentProgressStatus.trim() || null,
          reportReason: reportReason.trim() || null,
          difficulties: difficulties.trim() || null,
          proposedSolution: proposedSolution.trim() || null,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      await submitReport({
        id: detail.id,
        data: {
          fieldValuesJson,
          tableValuesJson,
          currentProgressStatus: currentProgressStatus.trim() || null,
          reportReason: reportReason.trim() || null,
          difficulties: difficulties.trim() || null,
          proposedSolution: proposedSolution.trim() || null,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      await refetch();
      onSubmitted?.();
      showMessage("Đã nộp báo cáo.");
    } catch (error) {
      console.error(error);
      showMessage("Nộp báo cáo thất bại.");
    }
  };

  const handleWithdraw = async () => {
    if (!detail) return;

    if (!withdrawReason.trim()) {
      showMessage("Bắt buộc nhập lý do thu hồi.");
      return;
    }

    try {
      await withdrawSubmittedReport({
        id: detail.id,
        data: {
            returnReason: withdrawReason.trim(),
            reviewerComment: null,
        },
      }).unwrap();

      setWithdrawOpen(false);
      await refetch();
      showMessage("Đã thu hồi báo cáo.");
    } catch (error) {
      console.error(error);
      showMessage("Trả lại báo cáo thất bại.");
    }
  };

  if (!reportId) {
    return <Alert severity="warning">Thiếu reportId.</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">Đang tải báo cáo...</Typography>
        </Stack>
      </Box>
    );
  }

  if (isError || !detail) {
    return (
      <Alert severity="error">
        Không tải được chi tiết báo cáo hoặc báo cáo không tồn tại.
      </Alert>
    );
  }

  const busy =
    saveDraftState.isLoading ||
    submitState.isLoading ||
    withdrawState.isLoading;

  return (
    <>
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <ReportHeaderSection
          detail={detail}
          overdue={overdue}
          canEdit={canEdit}
          onBack={onBack}
        />

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>
                  Dữ liệu báo cáo
                </Typography>

                <ReportActionBar
                  canEdit={canEdit}
                  canWithdraw={canWithdraw}
                  busy={busy}
                  onSaveDraft={() => void handleSaveDraft()}
                  onSubmit={() => void handleSubmit()}
                  onOpenWithdraw={() => {
                    setWithdrawReason("");
                    setWithdrawOpen(true);
                  }}
                  onOpenLogs={() => setLogsOpen(true)}
                />
              </Stack>

              <Box sx={{ height: 520, minHeight: 320 }}>
                <WorkbookDataGrid
                  initialSpec={detail.spec}
                  initialWorkbookData={detail.renderWorkbookData}
                  dataRect={detail.dataRect}
                  excludedDataColumns={excludedDataColumns}
                  mode={canEdit ? "edit" : "view"}
                  readOnly={!canEdit}
                  saving={busy}
                  showActions={canEdit}
                  saveLabel="Lưu nháp"
                  backLabel="Quay lại"
                  onBack={onBack}
                  onChangeRaw={() => {
                    latestWorkbookPayloadRef.current = {
                      values1D:
                        latestWorkbookPayloadRef.current?.values1D ?? detail.values1D ?? [],
                    };
                  }}
                  onSave={(payload) => {
                    latestWorkbookPayloadRef.current = {
                      values1D: payload.values1D,
                    };
                    void handleSaveDraft({
                      values1D: payload.values1D,
                    });
                  }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {isFetchingDynamicForm && (
          <Alert severity="info">Đang tải trường bổ sung...</Alert>
        )}

        {dynamicFormRuntime && dynamicFormRuntime.fields.length > 0 && (
          <DynamicFormRuntimeFields
            sections={dynamicFormRuntime.sections}
            fields={dynamicFormRuntime.fields}
            values={fieldValues}
            readOnly={!canEdit}
            disabled={busy}
            onChange={handleDynamicFieldChange}
          />
        )}

        <ReportBusinessFormSection
          canEdit={canEdit}
          busy={busy}
          overdue={overdue}
          currentProgressStatus={currentProgressStatus}
          reportReason={reportReason}
          difficulties={difficulties}
          proposedSolution={proposedSolution}
          lateReason={lateReason}
          setCurrentProgressStatus={setCurrentProgressStatus}
          setReportReason={setReportReason}
          setDifficulties={setDifficulties}
          setProposedSolution={setProposedSolution}
          setLateReason={setLateReason}
        />
      </Stack>

      <Dialog
        open={withdrawOpen}
        onClose={() => !busy && setWithdrawOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Thu hồi báo cáo đã nộp</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="warning">
              Báo cáo sẽ quay về trạng thái <b>Nháp</b>. Đã duyệt thì không được thu hồi.
            </Alert>

            <TextField
              size="small"
              label="Lý do thu hồi"
              value={withdrawReason}
              disabled={busy}
              onChange={(e) => setWithdrawReason(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawOpen(false)} disabled={busy}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleWithdraw()}
            disabled={busy}
          >
            Thu hồi
          </Button>
        </DialogActions>
      </Dialog>

      <ReportLogsDialog
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        logs={logs}
        isFetching={isFetchingLogs}
        isError={isLogsError}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </>
  );
}
