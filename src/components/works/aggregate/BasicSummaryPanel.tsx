import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import type { DynamicFormDetail } from "../../../api/dynamicFormApi";
import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import { AppTable, type AppTableColumn } from "../../common/AppTable";
import WorkbookDataGrid from "../../excel/fortune/WorkbookDataGrid";
import {
  applyValues1DToSheet,
  type WorkbookCellValue,
} from "../../excel/fortune/fortuneAdapter";
import { buildCellRefsForValues } from "../../excel/fortune/specialRanges";
import { getTableRect } from "../../excel/fortune/regions";
import type { ReportRect } from "../../excel/fortune/reportWorkbook";
import {
  buildEditorValue,
  getDynamicFormBlockJsonList,
  tableModeLabels,
} from "../../../features/dynamicForms/dynamicFormSchema";
import DynamicFormRuntimeFields, {
  type DynamicFormRuntimeValue,
  type DynamicFormRuntimeValues,
} from "../../../features/dynamicForms/runtime/DynamicFormRuntimeFields";
import type { DynamicFormField } from "../../../features/dynamicForms/dynamicForm.types";
import type {
  WorkAssignmentBasicSummaryDefaultMethodsDto,
  WorkAssignmentBasicSummaryItemDto,
  WorkAssignmentBasicSummaryResponse,
  WorkAssignmentBasicSummarySourceDto,
  WorkAssignmentBasicSummaryTableCellValueDto,
  WorkAssignmentBasicSummaryTableValuesDto,
  WorkAssignmentBasicSummaryValuesDto,
} from "../../../types/reportAggregate";

export type BasicSummaryMethod =
  | "SUM"
  | "COUNT"
  | "MEAN"
  | "MIN"
  | "MAX"
  | "MIN_DATE"
  | "MAX_DATE"
  | "TRUE_COUNT"
  | "FALSE_COUNT"
  | "BUCKET_COUNT"
  | "JOIN";

export type BasicSummaryMethodOption = {
  value: BasicSummaryMethod;
  label: string;
};

export type BasicSummaryFieldMethodRow = {
  id: string;
  label: string;
  dataTypeLabel: string;
  defaultMethod: BasicSummaryMethod;
  selectedMethod: BasicSummaryMethod;
  methodOptions: BasicSummaryMethodOption[];
};

export type BasicSummaryRangeMethodRow = {
  id: string;
  rectLabel: string;
  dataTypeLabel: string;
  cellCount: number;
  defaultMethod: BasicSummaryMethod;
  selectedMethod: BasicSummaryMethod;
  methodOptions: BasicSummaryMethodOption[];
};

export type BasicSummarySourceViewState = {
  q: string;
  periodKey: string;
  unitId: string;
  assigneeUserId: string;
  page: number;
  pageSize: number;
};

type Props = {
  assignmentType?: string | null;
  scopeAssignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormDetail?: DynamicFormDetail | null;
  result: WorkAssignmentBasicSummaryResponse | null;
  loading: boolean;
  configLoading?: boolean;
  configSaving?: boolean;
  defaultMethods: WorkAssignmentBasicSummaryDefaultMethodsDto;
  fieldMethodRows: BasicSummaryFieldMethodRow[];
  rangeMethodRows: BasicSummaryRangeMethodRow[];
  sourceView: BasicSummarySourceViewState;
  onDefaultMethodsChange: (methods: WorkAssignmentBasicSummaryDefaultMethodsDto) => void;
  onFieldMethodChange: (fieldId: string, method: BasicSummaryMethod) => void;
  onRangeMethodChange: (rowId: string, method: BasicSummaryMethod) => void;
  onSaveConfig: () => void;
  onLoad: (forceRefresh: boolean) => void;
  onSourceViewChange: (view: BasicSummarySourceViewState) => void;
  onApplySourceView: () => void;
  onSourcePageChange: (page: number, pageSize: number) => void;
  onPreviewReport: (reportId: string) => void;
};

const numberFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export const BASIC_SUMMARY_METHOD_LABELS: Record<BasicSummaryMethod, string> = {
  SUM: "Tổng",
  COUNT: "Đếm có dữ liệu",
  MEAN: "Trung bình",
  MIN: "Nhỏ nhất",
  MAX: "Lớn nhất",
  MIN_DATE: "Ngày sớm nhất",
  MAX_DATE: "Ngày mới nhất",
  TRUE_COUNT: "Đếm đúng",
  FALSE_COUNT: "Đếm sai",
  BUCKET_COUNT: "Nhóm giá trị",
  JOIN: "Ghép nội dung",
};

const METHOD_OPTIONS: BasicSummaryMethodOption[] = (
  [
    "SUM",
    "COUNT",
    "MEAN",
    "MIN",
    "MAX",
    "MIN_DATE",
    "MAX_DATE",
    "TRUE_COUNT",
    "FALSE_COUNT",
    "BUCKET_COUNT",
    "JOIN",
  ] as BasicSummaryMethod[]
).map((value) => ({ value, label: BASIC_SUMMARY_METHOD_LABELS[value] }));

const DEFAULT_METHODS: Required<WorkAssignmentBasicSummaryDefaultMethodsDto> = {
  number: "SUM",
  date: "MAX_DATE",
  boolean: "TRUE_COUNT",
  text: "JOIN",
  selection: "BUCKET_COUNT",
};

const SOURCE_VIEW_EMPTY: BasicSummarySourceViewState = {
  q: "",
  periodKey: "",
  unitId: "",
  assigneeUserId: "",
  page: 0,
  pageSize: 10,
};

const BasicSummaryPanel: React.FC<Props> = ({
  assignmentType,
  scopeAssignmentId,
  dynamicFormTemplateId,
  dynamicFormDetail,
  result,
  loading,
  configLoading = false,
  configSaving = false,
  defaultMethods,
  fieldMethodRows,
  rangeMethodRows,
  sourceView,
  onDefaultMethodsChange,
  onFieldMethodChange,
  onRangeMethodChange,
  onSaveConfig,
  onLoad,
  onSourceViewChange,
  onApplySourceView,
  onSourcePageChange,
  onPreviewReport,
}) => {
  const isOnce = assignmentType === "ONCE";
  const canLoad = Boolean(scopeAssignmentId && dynamicFormTemplateId && isOnce);
  const [configVisible, setConfigVisible] = React.useState(true);

  return (
    <Stack spacing={2}>
      {configVisible ? (
        <ConfigurationPanel
          loading={configLoading}
          saving={configSaving}
          defaultMethods={defaultMethods}
          fieldRows={fieldMethodRows}
          rangeRows={rangeMethodRows}
          onDefaultMethodsChange={onDefaultMethodsChange}
          onFieldMethodChange={onFieldMethodChange}
          onRangeMethodChange={onRangeMethodChange}
          onSaveConfig={onSaveConfig}
          onHide={() => setConfigVisible(false)}
        />
      ) : (
        <CollapsedConfigurationPanel
          defaultMethods={defaultMethods}
          onShow={() => setConfigVisible(true)}
        />
      )}

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <TextField
              size="small"
              fullWidth
              label="Phạm vi thống kê"
              value="Tất cả báo cáo đã duyệt cùng template"
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Button
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <CalculateOutlinedIcon fontSize="small" />
              )
            }
            onClick={() => onLoad(false)}
            disabled={!canLoad || loading}
          >
            Tải thống kê
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlinedIcon fontSize="small" />}
            onClick={() => onLoad(true)}
            disabled={!canLoad || loading}
          >
            Tính lại
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
            onClick={() => result && downloadBasicSummaryCsv(result)}
            disabled={!result || loading}
          >
            Xuất CSV
          </Button>
        </Stack>
      </Paper>

      {!isOnce && scopeAssignmentId && (
        <Alert severity="info">
          Thống kê cơ bản hiện chỉ áp dụng cho công việc giao một lần.
        </Alert>
      )}

      {!dynamicFormTemplateId && scopeAssignmentId && (
        <Alert severity="warning">
          Công việc này chưa có biểu mẫu động để tập hợp dữ liệu cơ bản.
        </Alert>
      )}

      {loading && !result && (
        <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      )}

      {result && (
        <>
          <SummaryMetaChips result={result} />

          {result.warnings.map((warning) => (
            <Alert key={warning} severity="warning">
              {warning}
            </Alert>
          ))}

          <DynamicFormSummaryPreview
            detail={dynamicFormDetail}
            values={result.summaryValues ?? null}
          />

          <SourceReportsTable
            result={result}
            sourceView={sourceView}
            loading={loading}
            onSourceViewChange={onSourceViewChange}
            onApplySourceView={onApplySourceView}
            onSourcePageChange={onSourcePageChange}
            onPreviewReport={onPreviewReport}
          />
        </>
      )}

      {!loading && !result && canLoad && (
        <Paper
          variant="outlined"
          sx={{ borderRadius: 1, p: 3, textAlign: "center" }}
        >
          <Typography variant="body2" color="text.secondary">
            Chưa tải snapshot thống kê cơ bản.
          </Typography>
        </Paper>
      )}
    </Stack>
  );
};

function ConfigurationPanel({
  loading,
  saving,
  defaultMethods,
  fieldRows,
  rangeRows,
  onDefaultMethodsChange,
  onFieldMethodChange,
  onRangeMethodChange,
  onSaveConfig,
  onHide,
}: {
  loading: boolean;
  saving: boolean;
  defaultMethods: WorkAssignmentBasicSummaryDefaultMethodsDto;
  fieldRows: BasicSummaryFieldMethodRow[];
  rangeRows: BasicSummaryRangeMethodRow[];
  onDefaultMethodsChange: (methods: WorkAssignmentBasicSummaryDefaultMethodsDto) => void;
  onFieldMethodChange: (fieldId: string, method: BasicSummaryMethod) => void;
  onRangeMethodChange: (rowId: string, method: BasicSummaryMethod) => void;
  onSaveConfig: () => void;
  onHide: () => void;
}) {
  const setMethod = (
    key: keyof WorkAssignmentBasicSummaryDefaultMethodsDto,
    value: BasicSummaryMethod,
  ) => onDefaultMethodsChange({ ...DEFAULT_METHODS, ...defaultMethods, [key]: value });

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={1}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Cấu hình thống kê
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đổi cấu hình sẽ làm hệ thống tính lại snapshot; nếu nhiều báo cáo, thao tác có thể lâu hơn.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={onHide} disabled={saving}>
            Ẩn cấu hình
          </Button>
          <Button
            variant="outlined"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon fontSize="small" />}
            onClick={onSaveConfig}
            disabled={loading || saving}
          >
            Lưu cấu hình
          </Button>
        </Stack>

        <Grid container spacing={1}>
          {DEFAULT_METHOD_GROUPS.map((group) => (
            <Grid key={group.key} size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label={group.label}
                value={(defaultMethods[group.key] as BasicSummaryMethod | undefined) ?? DEFAULT_METHODS[group.key]}
                onChange={(event) => setMethod(group.key, event.target.value as BasicSummaryMethod)}
                disabled={loading}
              >
                {group.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          ))}
        </Grid>

        <Accordion disableGutters variant="outlined" sx={{ borderRadius: 1, "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                Nâng cao theo field/range
              </Typography>
              <Chip size="small" variant="outlined" label={`${fieldRows.length} field`} />
              <Chip size="small" variant="outlined" label={`${rangeRows.length} range`} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <FieldMethodTable rows={fieldRows} loading={loading} onMethodChange={onFieldMethodChange} />
              <RangeMethodTable rows={rangeRows} loading={loading} onMethodChange={onRangeMethodChange} />
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Paper>
  );
}

function CollapsedConfigurationPanel({
  defaultMethods,
  onShow,
}: {
  defaultMethods: WorkAssignmentBasicSummaryDefaultMethodsDto;
  onShow: () => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Cấu hình thống kê
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.75 }}>
            {DEFAULT_METHOD_GROUPS.map((group) => {
              const method = (defaultMethods[group.key] ??
                DEFAULT_METHODS[group.key]) as BasicSummaryMethod;
              return (
                <Chip
                  key={group.key}
                  size="small"
                  variant="outlined"
                  label={`${group.label}: ${BASIC_SUMMARY_METHOD_LABELS[method]}`}
                />
              );
            })}
          </Stack>
        </Box>
        <Button variant="outlined" onClick={onShow}>
          Hiện cấu hình
        </Button>
      </Stack>
    </Paper>
  );
}

function FieldMethodTable({
  rows,
  loading,
  onMethodChange,
}: {
  rows: BasicSummaryFieldMethodRow[];
  loading: boolean;
  onMethodChange: (fieldId: string, method: BasicSummaryMethod) => void;
}) {
  const columns = React.useMemo<AppTableColumn<BasicSummaryFieldMethodRow>[]>(
    () => [
      { field: "label", header: "Field", sortable: true, render: (row) => <strong>{row.label}</strong> },
      { field: "dataTypeLabel", header: "Kiểu", sortable: true },
      {
        field: "selectedMethod",
        header: "Method",
        width: 220,
        render: (row) => (
          <TextField
            select
            size="small"
            fullWidth
            value={row.selectedMethod}
            onChange={(event) => onMethodChange(row.id, event.target.value as BasicSummaryMethod)}
            disabled={loading}
          >
            {row.methodOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        field: "defaultMethod",
        header: "Mặc định",
        render: (row) => BASIC_SUMMARY_METHOD_LABELS[row.defaultMethod],
      },
    ],
    [loading, onMethodChange],
  );

  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        Field dữ liệu
      </Typography>
      <AppTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        enablePagination
        initialPageSize={5}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Stack>
  );
}

function RangeMethodTable({
  rows,
  loading,
  onMethodChange,
}: {
  rows: BasicSummaryRangeMethodRow[];
  loading: boolean;
  onMethodChange: (rowId: string, method: BasicSummaryMethod) => void;
}) {
  const columns = React.useMemo<AppTableColumn<BasicSummaryRangeMethodRow>[]>(
    () => [
      { field: "rectLabel", header: "Range", sortable: true, render: (row) => <strong>{row.rectLabel}</strong> },
      { field: "dataTypeLabel", header: "Kiểu", sortable: true },
      { field: "cellCount", header: "Ô input", align: "right", sortable: true },
      {
        field: "selectedMethod",
        header: "Method",
        width: 220,
        render: (row) => (
          <TextField
            select
            size="small"
            fullWidth
            value={row.selectedMethod}
            onChange={(event) => onMethodChange(row.id, event.target.value as BasicSummaryMethod)}
            disabled={loading}
          >
            {row.methodOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        field: "defaultMethod",
        header: "Mặc định",
        render: (row) => BASIC_SUMMARY_METHOD_LABELS[row.defaultMethod],
      },
    ],
    [loading, onMethodChange],
  );

  if (!rows.length) {
    return (
      <Alert severity="info">
        Template hiện chưa có range ma trận đọc được để cấu hình riêng theo vùng.
      </Alert>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        Range trên sheet
      </Typography>
      <AppTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        enablePagination
        initialPageSize={5}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Stack>
  );
}

function SummaryMetaChips({ result }: { result: WorkAssignmentBasicSummaryResponse }) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      <Chip
        color={result.meta.fromSnapshot ? "default" : "primary"}
        variant="outlined"
        label={result.meta.fromSnapshot ? "Snapshot" : "Vừa tính"}
      />
      <Chip variant="outlined" label={`Công việc nguồn: ${result.meta.sourceAssignmentCount}`} />
      <Chip variant="outlined" label={`Báo cáo: ${result.meta.sourceReportCount}`} />
      <Chip variant="outlined" label={`Template: ${result.meta.dynamicFormTemplateCode || result.meta.dynamicFormTemplateId}`} />
      <Chip variant="outlined" label={`Cập nhật: ${formatDateTime(result.meta.snapshotRefreshedAtUtc)}`} />
    </Stack>
  );
}

function DynamicFormSummaryPreview({
  detail,
  values,
}: {
  detail?: DynamicFormDetail | null;
  values?: WorkAssignmentBasicSummaryValuesDto | null;
}) {
  const editorValue = React.useMemo(() => {
    if (!detail) return null;
    return buildEditorValue({
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
    });
  }, [detail]);

  const blocks = React.useMemo(() => {
    if (!editorValue) return [];
    return getDynamicFormBlockJsonList(editorValue.blocksJson, editorValue.excelBlockJson, editorValue.sections[0]?.id)
      .map((json, index) => toBlockPreview(json, index));
  }, [editorValue]);

  const sectionItems = React.useMemo(() => {
    if (!editorValue) return [];
    const blocksBySection = blocks.reduce<Record<string, BlockPreview[]>>((acc, block) => {
      const sectionId = block.sectionId || editorValue.sections[0]?.id || "";
      if (!sectionId) return acc;
      (acc[sectionId] ??= []).push(block);
      return acc;
    }, {});

    return [...editorValue.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        section,
        blocks: blocksBySection[section.id] ?? [],
      }));
  }, [blocks, editorValue]);

  const blocksBySection = React.useMemo(
    () =>
      sectionItems.reduce<Record<string, BlockPreview[]>>((acc, item) => {
        acc[item.section.id] = item.blocks;
        return acc;
      }, {}),
    [sectionItems],
  );

  const runtimeValues = React.useMemo(
    () => buildRuntimeValues(editorValue?.fields ?? [], values),
    [editorValue?.fields, values],
  );

  if (!detail || !editorValue) {
    return <Alert severity="info">Chưa tải được template để nhúng số liệu tổng hợp.</Alert>;
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
            {editorValue.name || "Biểu mẫu động"}
          </Typography>
          <Chip size="small" label={editorValue.code || detail.id} variant="outlined" />
          <Chip size="small" label="Đã nhúng số liệu tổng hợp" color="primary" variant="outlined" />
        </Stack>

        <DynamicFormRuntimeFields
          sections={editorValue.sections}
          fields={editorValue.fields}
          values={runtimeValues}
          readOnly
          disabled={false}
          onChange={() => undefined}
          title="Dữ liệu biểu mẫu"
          getSectionExtraCount={(section) => blocksBySection[section.id]?.length ?? 0}
          renderSectionExtra={(section) => (
            <SummarySectionTables
              blocks={blocksBySection[section.id] ?? []}
              values={values}
            />
          )}
        />
      </Stack>
    </Paper>
  );
}

function SummarySectionTables({
  blocks,
  values,
}: {
  blocks: BlockPreview[];
  values?: WorkAssignmentBasicSummaryValuesDto | null;
}) {
  if (!blocks.length) return null;

  return (
    <Box>
      <Stack spacing={1.25}>
        {blocks.map((block) => (
          <SummaryExcelBlock
            key={`${block.index}_${block.blockId || block.title}`}
            block={block}
            values={values}
          />
        ))}
      </Stack>
    </Box>
  );
}

function buildRuntimeValues(
  fields: DynamicFormField[],
  values?: WorkAssignmentBasicSummaryValuesDto | null,
): DynamicFormRuntimeValues {
  const rows: DynamicFormRuntimeValues = {};

  for (const field of fields) {
    const summary = values?.fields?.[field.id] ?? (field.key ? values?.fields?.[field.key] : undefined);
    if (!summary) continue;

    rows[field.id] = coerceRuntimeValue(field, summary.value, summary.displayValue);
  }

  return rows;
}

function coerceRuntimeValue(
  field: DynamicFormField,
  value: unknown,
  displayValue?: string | null,
): DynamicFormRuntimeValue {
  const display = displayValue ?? formatUnknownValue(value) ?? "";

  if (field.type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(display);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (field.type === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "có" || normalized === "co";
    }
    return false;
  }

  if (field.type === "multiSelect" || field.type === "stringList") {
    if (Array.isArray(value)) return value.map((item) => String(item));
    return display ? [display] : null;
  }

  return display || null;
}

function SummaryExcelBlock({
  block,
  values,
}: {
  block: BlockPreview;
  values?: WorkAssignmentBasicSummaryValuesDto | null;
}) {
  const dynamicExcelId = block.dynamicExcelTemplateId ?? "";
  const tableValues = React.useMemo(
    () => findTableValues(values, block.blockId),
    [block.blockId, values],
  );
  const { data, isLoading, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId },
    { skip: !dynamicExcelId },
  );

  const parsed = React.useMemo(() => {
    if (!data) return null;
    const spec = safeParseJson<any>(data.specJson, {}) ?? {};
    const dataRect = block.dataRectValue ?? normalizeDataRect((data as any).dataRect) ?? resolveSpecRect(spec);
    const workbook = safeParseJson<any[]>(data.rawWorkbookDataJson, []) ?? [];
    if (!dataRect || workbook.length === 0) return null;

    const hydratedWorkbook = cloneDeepJson(workbook);
    const sheet = hydratedWorkbook[0];
    const values1D = normalizeWorkbookValues(tableValues?.values1D ?? []);
    if (sheet && tableValues?.cells?.length) {
      applySummaryTableCellsToSheet(sheet, dataRect, tableValues.cells, spec);
    } else if (sheet && values1D.length > 0) {
      applyValues1DToSheet(sheet, dataRect, values1D, spec);
    }

    return { spec, dataRect, workbook: hydratedWorkbook };
  }, [block.dataRectValue, data, tableValues]);

  return (
    <Paper variant="outlined" sx={{ p: 1, borderRadius: 1, bgcolor: "background.default" }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {block.title}
          </Typography>
          {block.tableMode && <Chip size="small" label={tableModeLabels[block.tableMode]} variant="outlined" />}
          {tableValues && <Chip size="small" label={`${tableValues.cells.length} giá trị`} color="primary" variant="outlined" />}
        </Stack>

        {!dynamicExcelId && <Alert severity="warning">Bảng chưa có mã Excel động để xem trước.</Alert>}
        {isLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 180 }}>
            <CircularProgress size={24} />
          </Stack>
        )}
        {(isError || (dynamicExcelId && !isLoading && !parsed)) && (
          <Alert severity="error">Không tải được bảng Excel động để xem trước.</Alert>
        )}
        {parsed && (
          <WorkbookDataGrid
            initialSpec={parsed.spec}
            initialWorkbookData={parsed.workbook}
            dataRect={parsed.dataRect}
            mode="view"
            readOnly
            showActions={false}
          />
        )}
      </Stack>
    </Paper>
  );
}

function SourceReportsTable({
  result,
  sourceView,
  loading,
  onSourceViewChange,
  onApplySourceView,
  onSourcePageChange,
  onPreviewReport,
}: {
  result: WorkAssignmentBasicSummaryResponse;
  sourceView: BasicSummarySourceViewState;
  loading: boolean;
  onSourceViewChange: (view: BasicSummarySourceViewState) => void;
  onApplySourceView: () => void;
  onSourcePageChange: (page: number, pageSize: number) => void;
  onPreviewReport: (reportId: string) => void;
}) {
  const page = result.sourcesPage;
  const rows = page?.rows ?? result.sources ?? [];
  const pageIndex = page?.page ?? sourceView.page;
  const pageSize = page?.pageSize ?? sourceView.pageSize;
  const totalRows = page?.totalRows ?? rows.length;

  const columns = React.useMemo<AppTableColumn<WorkAssignmentBasicSummarySourceDto>[]>(
    () => [
      {
        field: "unitShortName",
        header: "Đơn vị",
        sortable: true,
        render: (row) => row.unitShortName || row.unitSymbol || row.unitName || row.unitId || "-",
      },
      {
        field: "assigneeFullName",
        header: "Người báo cáo",
        sortable: true,
        render: (row) => row.assigneeFullName || row.assigneeUsername || row.assigneeUserId || "-",
      },
      {
        field: "periodKey",
        header: "Kỳ",
        sortable: true,
        render: (row) => formatPeriod(row.periodKey, row.periodInstanceKey),
      },
      {
        field: "approvedAtUtc",
        header: "Duyệt",
        sortable: true,
        render: (row) => formatDateTime(row.approvedAtUtc),
      },
      {
        field: "payloadRevision",
        header: "Payload",
        align: "right",
        sortable: true,
      },
      {
        field: "action",
        header: "Xem",
        align: "right",
        render: (row) => (
          <Button
            size="small"
            variant="text"
            startIcon={<VisibilityOutlinedIcon fontSize="small" />}
            onClick={() => onPreviewReport(row.workAssignmentReportId)}
          >
            Mở
          </Button>
        ),
      },
    ],
    [onPreviewReport],
  );

  const updateView = (patch: Partial<BasicSummarySourceViewState>) =>
    onSourceViewChange({ ...sourceView, ...patch, page: 0 });

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Báo cáo đã duyệt
          </Typography>
          <Chip size="small" variant="outlined" label={`${totalRows} báo cáo`} />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            size="small"
            label="Từ khóa"
            value={sourceView.q}
            onChange={(event) => updateView({ q: event.target.value })}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <TextField
            size="small"
            label="Kỳ"
            value={sourceView.periodKey}
            onChange={(event) => updateView({ periodKey: event.target.value })}
            sx={{ width: { xs: "100%", md: 160 } }}
          />
          <TextField
            size="small"
            label="Unit ID"
            value={sourceView.unitId}
            onChange={(event) => updateView({ unitId: event.target.value })}
            sx={{ width: { xs: "100%", md: 180 } }}
          />
          <TextField
            size="small"
            label="User ID"
            value={sourceView.assigneeUserId}
            onChange={(event) => updateView({ assigneeUserId: event.target.value })}
            sx={{ width: { xs: "100%", md: 180 } }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FilterAltOutlinedIcon fontSize="small" />}
            onClick={onApplySourceView}
            disabled={loading}
          >
            Lọc
          </Button>
          <Button
            variant="outlined"
            onClick={() => onSourceViewChange(SOURCE_VIEW_EMPTY)}
            disabled={loading}
          >
            Xóa lọc
          </Button>
        </Stack>

        <AppTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.workAssignmentReportId}
          enablePagination
          paginationMode="server"
          page={pageIndex}
          pageSize={pageSize}
          totalRows={totalRows}
          onPageChange={(nextPage) => onSourcePageChange(nextPage, pageSize)}
          onPageSizeChange={(nextSize) => onSourcePageChange(0, nextSize)}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Stack>
    </Paper>
  );
}

const DEFAULT_METHOD_GROUPS: Array<{
  key: keyof Required<WorkAssignmentBasicSummaryDefaultMethodsDto>;
  label: string;
  options: BasicSummaryMethodOption[];
}> = [
  { key: "number", label: "Số", options: pickOptions(["SUM", "COUNT", "MEAN", "MIN", "MAX"]) },
  { key: "date", label: "Ngày", options: pickOptions(["MAX_DATE", "MIN_DATE", "COUNT"]) },
  { key: "boolean", label: "Có/không", options: pickOptions(["TRUE_COUNT", "FALSE_COUNT", "COUNT"]) },
  { key: "text", label: "Text", options: pickOptions(["JOIN", "COUNT", "BUCKET_COUNT"]) },
  { key: "selection", label: "Lựa chọn", options: pickOptions(["BUCKET_COUNT", "COUNT", "JOIN"]) },
];

type BlockPreview = {
  json: string;
  index: number;
  blockId: string | null;
  sectionId?: string | null;
  dynamicExcelTemplateId?: string | null;
  title: string;
  tableMode?: keyof typeof tableModeLabels | null;
  dataRectValue?: ReportRect | null;
};

function pickOptions(values: BasicSummaryMethod[]) {
  const allowed = new Set(values);
  return METHOD_OPTIONS.filter((option) => allowed.has(option.value));
}

function toBlockPreview(json: string, index: number): BlockPreview {
  const obj = parseObject(json);
  const blockId = readString(obj?.blockId ?? obj?.BlockId ?? obj?.id ?? obj?.Id);
  const dynamicExcelTemplateId = readString(
    obj?.dynamicExcelTemplateId ??
      obj?.DynamicExcelTemplateId ??
      obj?.excelBlockDynamicExcelTemplateId ??
      obj?.ExcelBlockDynamicExcelTemplateId,
  );
  const dynamicExcelCode = readString(obj?.dynamicExcelCode ?? obj?.DynamicExcelCode ?? obj?.code);
  const dynamicExcelName = readString(obj?.dynamicExcelName ?? obj?.DynamicExcelName ?? obj?.name);
  const tableMode = normalizeTableModeValue(obj?.tableMode ?? obj?.TableMode);
  const fallbackTitle = `Phần bảng ${index + 1}`;

  return {
    json,
    index,
    blockId,
    sectionId: readString(obj?.sectionId ?? obj?.SectionId),
    dynamicExcelTemplateId,
    title: [dynamicExcelCode, dynamicExcelName].filter(Boolean).join(" - ") || blockId || fallbackTitle,
    tableMode,
    dataRectValue: normalizeDataRect(obj?.dataRect ?? obj?.DataRect),
  };
}

function findTableValues(
  values: WorkAssignmentBasicSummaryValuesDto | null | undefined,
  blockId: string | null,
): WorkAssignmentBasicSummaryTableValuesDto | null {
  if (!blockId || !values?.tables?.length) return null;
  return values.tables.find((item) => item.blockId === blockId) ?? null;
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

function normalizeDataRect(value: unknown): ReportRect | null {
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

function resolveSpecRect(spec: unknown): ReportRect | null {
  if (!spec || typeof spec !== "object") return null;
  try {
    return getTableRect(spec as any);
  } catch {
    return null;
  }
}

function cloneDeepJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeWorkbookValues(values: unknown[]): WorkbookCellValue[] {
  return values.map((value) => {
    if (value == null) return null;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.map((item) => String(item));
    return String(value);
  });
}

function applySummaryTableCellsToSheet(
  sheet: any,
  dataRect: ReportRect,
  cells: WorkAssignmentBasicSummaryTableCellValueDto[],
  spec?: any,
) {
  const cellRefs = buildCellRefsForValues(dataRect, spec, null);
  if (!Array.isArray(cells) || cells.length === 0 || cellRefs.length === 0) return;

  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : (sheet.data = []);

  for (const cellValue of cells) {
    const index = typeof cellValue.index === "number" ? cellValue.index : -1;
    const ref = index >= 0 ? cellRefs[index] : null;
    const value = coerceSummaryWorkbookValue(cellValue);
    if (!ref || value == null) continue;

    grid[ref.r] = Array.isArray(grid[ref.r]) ? grid[ref.r] : (grid[ref.r] = []);
    const cell = grid[ref.r][ref.c];
    const displayValue = cellValue.displayValue ?? formatWorkbookDisplayValue(value);

    if (cell && typeof cell === "object") {
      grid[ref.r][ref.c] = { ...cell, v: displayValue, m: displayValue };
    } else {
      grid[ref.r][ref.c] = { v: displayValue, m: displayValue };
    }
  }
}

function coerceSummaryWorkbookValue(
  cell: WorkAssignmentBasicSummaryTableCellValueDto,
): WorkbookCellValue {
  const value = cell.value ?? cell.displayValue ?? null;
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => String(item));
  return String(value);
}

function formatWorkbookDisplayValue(value: WorkbookCellValue) {
  return Array.isArray(value) ? value.join("; ") : String(value);
}

function formatPeriod(periodKey?: string | null, periodInstanceKey?: string | null) {
  const key = periodKey || "-";
  if (!periodInstanceKey || periodInstanceKey === periodKey) return key;
  return `${key} / ${periodInstanceKey}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function formatUnknownValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return numberFormat.format(value);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return JSON.stringify(value);
}

function downloadBasicSummaryCsv(result: WorkAssignmentBasicSummaryResponse) {
  const headers = [
    "targetKind",
    "targetKey",
    "label",
    "dataType",
    "operation",
    "value",
    "valueCount",
    "reportCount",
    "sum",
    "min",
    "max",
    "mean",
    "trueCount",
    "falseCount",
    "minDateUtc",
    "maxDateUtc",
    "text",
    "buckets",
  ];
  const rows = [...result.fields, ...result.tables].map((item: WorkAssignmentBasicSummaryItemDto) => [
    item.targetKind,
    item.targetKey,
    item.label,
    item.dataType,
    item.operation,
    formatUnknownValue(item.value) ?? "",
    item.valueCount,
    item.reportCount,
    item.sum ?? "",
    item.min ?? "",
    item.max ?? "",
    item.mean ?? "",
    item.trueCount ?? "",
    item.falseCount ?? "",
    item.minDateUtc ?? "",
    item.maxDateUtc ?? "",
    item.text ?? "",
    item.buckets.map((bucket) => `${bucket.label}:${bucket.count}`).join(" | "),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell ?? ""))).join(","))
    .join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const templateCode = result.meta.dynamicFormTemplateCode || result.meta.dynamicFormTemplateId;
  a.href = url;
  a.download = `basic-summary-${templateCode}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default BasicSummaryPanel;
