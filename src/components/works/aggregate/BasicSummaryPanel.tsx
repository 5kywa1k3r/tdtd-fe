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
  recalculateSimpleNumericFormulas,
  type RuntimeWorkbookCellValue,
} from "../../excel/fortune/workbookRuntime";
import { getCellDataType, normalizeSpecDataTypeMetadata } from "../../excel/fortune/dataTypes";
import { getTableRect } from "../../excel/fortune/regions";
import type { ReportRect } from "../../excel/fortune/reportWorkbook";
import { buildCellRefsForValues } from "../../excel/fortune/specialRanges";
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
  WorkAssignmentBasicSummaryTableValuesDto,
  WorkAssignmentBasicSummaryValuesDto,
} from "../../../types/reportAggregate";
import type { PeriodScopeMode } from "../../../types/aggregateTypes";
import AggregatePeriodPicker from "./AggregatePeriodPicker";
import { AggregateUnitSelector, type AggregateUnitOption } from "./AggregateDataControls";

export type BasicSummaryMethod =
  | "SUM"
  | "COUNT"
  | "MEAN"
  | "MIN"
  | "MAX"
  | "TRUE_COUNT"
  | "FALSE_COUNT"
  | "MIN_DATE"
  | "MAX_DATE"
  | "JOIN"
  | "BUCKET_COUNT";

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

export type BasicSummarySourceViewState = {
  q: string;
  periodKey: string;
  unitId: string;
  assigneeUserId: string;
  page: number;
  pageSize: number;
};

export type BasicSummarySourceScopeOption = {
  value: string;
  label: string;
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
  sourceView: BasicSummarySourceViewState;
  periodScopeLabel?: string | null;
  periodScopeMode: PeriodScopeMode;
  periodDate: string;
  periodDateFrom: string;
  periodDateTo: string;
  selectedUnitIds: string[];
  unitOptions: AggregateUnitOption[];
  sourceScopeMode: string;
  sourceScopeOptions: BasicSummarySourceScopeOption[];
  onDefaultMethodsChange: (methods: WorkAssignmentBasicSummaryDefaultMethodsDto) => void;
  onFieldMethodChange: (fieldId: string, method: BasicSummaryMethod) => void;
  onPeriodScopeModeChange: (value: PeriodScopeMode) => void;
  onPeriodDateChange: (value: string) => void;
  onPeriodDateFromChange: (value: string) => void;
  onPeriodDateToChange: (value: string) => void;
  onSelectedUnitIdsChange: (value: string[]) => void;
  onSourceScopeModeChange: (value: string) => void;
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
  TRUE_COUNT: "Đếm giá trị đúng",
  FALSE_COUNT: "Đếm giá trị sai",
  MIN_DATE: "Ngày sớm nhất",
  MAX_DATE: "Ngày mới nhất",
  JOIN: "Mẫu văn bản",
  BUCKET_COUNT: "Đếm theo lựa chọn",
};

const METHOD_OPTIONS: BasicSummaryMethodOption[] = (
  [
    "SUM",
    "COUNT",
    "MEAN",
    "MIN",
    "MAX",
    "TRUE_COUNT",
    "FALSE_COUNT",
    "MIN_DATE",
    "MAX_DATE",
    "JOIN",
    "BUCKET_COUNT",
  ] as BasicSummaryMethod[]
).map((value) => ({ value, label: BASIC_SUMMARY_METHOD_LABELS[value] }));

const DEFAULT_METHODS: Required<WorkAssignmentBasicSummaryDefaultMethodsDto> = {
  number: "SUM",
  date: "MAX_DATE",
  boolean: "TRUE_COUNT",
  text: "COUNT",
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
  sourceView,
  periodScopeLabel,
  periodScopeMode,
  periodDate,
  periodDateFrom,
  periodDateTo,
  selectedUnitIds,
  unitOptions,
  sourceScopeMode,
  sourceScopeOptions,
  onDefaultMethodsChange,
  onFieldMethodChange,
  onPeriodScopeModeChange,
  onPeriodDateChange,
  onPeriodDateFromChange,
  onPeriodDateToChange,
  onSelectedUnitIdsChange,
  onSourceScopeModeChange,
  onSaveConfig,
  onLoad,
  onSourceViewChange,
  onApplySourceView,
  onSourcePageChange,
  onPreviewReport,
}) => {
  const isOnce = assignmentType === "ONCE";
  const isPeriodic = assignmentType === "PERIODIC_REPORT";
  const isSupportedAssignmentType = isOnce || isPeriodic;
  const canLoad = Boolean(scopeAssignmentId && dynamicFormTemplateId && isSupportedAssignmentType);
  const [configVisible, setConfigVisible] = React.useState(true);

  return (
    <Stack spacing={2}>
      {configVisible ? (
        <ConfigurationPanel
          loading={configLoading}
          saving={configSaving}
          defaultMethods={defaultMethods}
          fieldRows={fieldMethodRows}
          onDefaultMethodsChange={onDefaultMethodsChange}
          onFieldMethodChange={onFieldMethodChange}
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
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Phạm vi thống kê
            </Typography>
            {periodScopeLabel && (
              <Chip size="small" variant="outlined" label={periodScopeLabel} />
            )}
            <Chip
              size="small"
              variant="outlined"
              label={`Đơn vị: ${selectedUnitIds.length ? `${selectedUnitIds.length} đã chọn` : "tất cả"}`}
            />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr 1fr" },
              gap: 1.5,
              alignItems: "start",
            }}
          >
            {isPeriodic ? (
              <AggregatePeriodPicker
                periodScopeMode={periodScopeMode}
                periodDate={periodDate}
                periodDateFrom={periodDateFrom}
                periodDateTo={periodDateTo}
                allowedModes={["SINGLE_PERIOD", "PERIOD_RANGE"]}
                disabled={!canLoad || loading}
                onPeriodScopeModeChange={onPeriodScopeModeChange}
                onPeriodDateChange={onPeriodDateChange}
                onPeriodDateFromChange={onPeriodDateFromChange}
                onPeriodDateToChange={onPeriodDateToChange}
              />
            ) : (
              <TextField
                size="small"
                fullWidth
                label="Kỳ thống kê"
                value={periodScopeLabel || "Tất cả báo cáo đã duyệt"}
                InputProps={{ readOnly: true }}
              />
            )}

            <TextField
              select
              size="small"
              fullWidth
              label="Nguồn dữ liệu"
              value={sourceScopeMode}
              onChange={(event) => onSourceScopeModeChange(event.target.value)}
              disabled={!canLoad || loading}
            >
              {sourceScopeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <AggregateUnitSelector
              selectedUnitIds={selectedUnitIds}
              onSelectedUnitIdsChange={onSelectedUnitIdsChange}
              unitOptions={unitOptions}
              disabled={!canLoad || loading}
              label="Đơn vị thống kê"
              helperText="Để trống để lấy tất cả đơn vị trong phạm vi."
              emptyHelperText="Chưa có đơn vị nguồn phù hợp."
            />
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Button
              data-testid="basic-summary-load-button"
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
              data-testid="basic-summary-refresh-button"
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
        </Stack>
      </Paper>

      {!isSupportedAssignmentType && scopeAssignmentId && (
        <Alert severity="info">
          Thống kê cơ bản hỗ trợ công việc giao một lần và báo cáo định kỳ.
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
          <BasicSummaryJobAlert result={result} />

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
  onDefaultMethodsChange,
  onFieldMethodChange,
  onSaveConfig,
  onHide,
}: {
  loading: boolean;
  saving: boolean;
  defaultMethods: WorkAssignmentBasicSummaryDefaultMethodsDto;
  fieldRows: BasicSummaryFieldMethodRow[];
  onDefaultMethodsChange: (methods: WorkAssignmentBasicSummaryDefaultMethodsDto) => void;
  onFieldMethodChange: (fieldId: string, method: BasicSummaryMethod) => void;
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
                Tùy chọn theo trường
              </Typography>
              <Chip size="small" variant="outlined" label={`${fieldRows.length} trường`} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <FieldMethodTable rows={fieldRows} loading={loading} onMethodChange={onFieldMethodChange} />
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

function SummaryMetaChips({ result }: { result: WorkAssignmentBasicSummaryResponse }) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      <Chip
        color={result.meta.fromSnapshot ? "default" : "primary"}
        variant="outlined"
        label={result.meta.fromSnapshot ? "Snapshot" : "Vừa tính"}
      />
      {isActiveBasicSummaryJob(result.meta.calculationStatus) && (
        <Chip color="warning" variant="outlined" label="Đang tính ngầm" />
      )}
      {normalizeBasicSummaryJobStatus(result.meta.calculationStatus) === "FAILED" && (
        <Chip color="error" variant="outlined" label="Lỗi job" />
      )}
      <Chip variant="outlined" label={result.meta.summaryType || "BASIC"} />
      {result.meta.contractVersion && (
        <Chip variant="outlined" label={result.meta.contractVersion} />
      )}
      <Chip variant="outlined" label={`Công việc nguồn: ${result.meta.sourceAssignmentCount}`} />
      <Chip variant="outlined" label={`Báo cáo: ${result.meta.sourceReportCount}`} />
      <Chip variant="outlined" label={`Template: ${result.meta.dynamicFormTemplateName || result.meta.dynamicFormTemplateId}`} />
      {result.meta.dynamicFormTemplateCode && (
        <Chip variant="outlined" label={result.meta.dynamicFormTemplateCode} />
      )}
      {result.meta.periodScopeMode && (
        <Chip variant="outlined" label={`Kỳ: ${formatSummaryPeriodScope(result)}`} />
      )}
      <Chip variant="outlined" label={`Cập nhật: ${formatDateTime(result.meta.snapshotRefreshedAtUtc)}`} />
    </Stack>
  );
}

function BasicSummaryJobAlert({ result }: { result: WorkAssignmentBasicSummaryResponse }) {
  const status = normalizeBasicSummaryJobStatus(result.meta.calculationStatus);
  const jobParts = [
    result.meta.calculationJobId ? `Mã job: ${result.meta.calculationJobId}` : "",
    result.meta.calculationCorrelationId ? `Correlation: ${result.meta.calculationCorrelationId}` : "",
  ].filter(Boolean);
  const jobSuffix = jobParts.length ? ` ${jobParts.join(". ")}.` : "";

  if (status === "FAILED") {
    const error = result.meta.calculationError?.trim();
    return (
      <Alert severity="error">
        Job tính snapshot thống kê cơ bản thất bại{error ? `: ${error}` : "."} Bấm Tính lại để enqueue lại.{jobSuffix}
      </Alert>
    );
  }

  if (result.meta.isCalculating || isActiveBasicSummaryJob(status)) {
    return (
      <Alert severity="info">
        Snapshot thống kê cơ bản đang được tính ngầm. Tải lại sau để xem kết quả mới.{jobSuffix}
      </Alert>
    );
  }

  if (result.meta.snapshotDirty) {
    return (
      <Alert severity="warning">
        Snapshot thống kê cơ bản đang cần tính lại. Bấm Tính lại để enqueue job mới.{jobSuffix}
      </Alert>
    );
  }

  return null;
}

function normalizeBasicSummaryJobStatus(status?: string | null) {
  return (status || "").trim().toUpperCase();
}

function isActiveBasicSummaryJob(status?: string | null) {
  const normalized = normalizeBasicSummaryJobStatus(status);
  return normalized === "QUEUED" || normalized === "RUNNING";
}

function formatSummaryPeriodScope(result: WorkAssignmentBasicSummaryResponse) {
  const { periodScopeMode, periodKey, periodKeyFrom, periodKeyTo } = result.meta;
  if (periodScopeMode === "SINGLE_PERIOD") return formatPeriod(periodKey || "", periodKey || "");
  if (periodScopeMode === "PERIOD_RANGE") {
    const from = periodKeyFrom ? formatPeriod(periodKeyFrom, periodKeyFrom) : "-";
    const to = periodKeyTo ? formatPeriod(periodKeyTo, periodKeyTo) : "-";
    return `${from} - ${to}`;
  }
  if (periodScopeMode === "ALL_PERIODS") return "Tất cả kỳ";
  return periodScopeMode || "-";
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
    <Stack spacing={1.25}>
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
          layout="workspace"
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
  const [previewRequested, setPreviewRequested] = React.useState(false);
  const tableValues = React.useMemo(
    () => findTableValues(values, block.blockId),
    [block.blockId, values],
  );

  React.useEffect(() => {
    setPreviewRequested(false);
  }, [block.blockId, dynamicExcelId]);

  const { data, isLoading, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId },
    { skip: !dynamicExcelId || !previewRequested },
  );

  const parsed = React.useMemo(() => {
    if (!data) return null;
    const spec = safeParseJson<any>(data.specJson, {}) ?? {};
    const dataRect = block.dataRectValue ?? normalizeDataRect((data as any).dataRect) ?? resolveSpecRect(spec);
    const workbook = safeParseJson<any[]>(data.rawWorkbookDataJson, []) ?? [];
    if (!dataRect || workbook.length === 0) return null;

    const values1D = buildTablePreviewValues(tableValues);
    const hydratedWorkbook = values1D.length > 0
      ? applySummaryPreviewValuesToWorkbook(cloneDeepJson(workbook), dataRect, values1D, spec)
      : cloneDeepJson(workbook);

    return { spec, dataRect, workbook: hydratedWorkbook };
  }, [block.dataRectValue, data, tableValues]);

  return (
    <Box
      data-testid="basic-summary-excel-block"
      data-dynamic-excel-id={dynamicExcelId || undefined}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{
          px: 1.25,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {block.title}
          </Typography>
          {block.tableMode && <Chip size="small" label={tableModeLabels[block.tableMode]} variant="outlined" />}
          {tableValues && <Chip size="small" label={`${tableValues.cells.length} giá trị`} color="primary" variant="outlined" />}
      </Stack>

      <Stack spacing={1} sx={{ p: 1.25 }}>
        {!dynamicExcelId && <Alert severity="warning">Bảng chưa có mã Excel động để xem trước.</Alert>}
        {dynamicExcelId && !previewRequested && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            sx={{
              minHeight: 88,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
              px: 1.25,
              py: 1.25,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Bảng tổng hợp chỉ tải workbook khi cần xem chi tiết.
            </Typography>
            <Button
              data-testid="basic-summary-table-load-button"
              size="small"
              variant="outlined"
              startIcon={<VisibilityOutlinedIcon fontSize="small" />}
              onClick={() => setPreviewRequested(true)}
              sx={{ alignSelf: { xs: "stretch", sm: "center" }, textTransform: "none" }}
            >
              Tải bảng
            </Button>
          </Stack>
        )}
        {isLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 180 }}>
            <CircularProgress size={24} />
          </Stack>
        )}
        {previewRequested && (isError || (dynamicExcelId && !isLoading && !parsed)) && (
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
            surfaceVariant="flat"
          />
        )}
      </Stack>
    </Box>
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
  { key: "boolean", label: "Đúng/sai", options: pickOptions(["TRUE_COUNT", "FALSE_COUNT", "COUNT"]) },
  { key: "text", label: "Văn bản", options: pickOptions(["COUNT", "JOIN"]) },
  { key: "selection", label: "Lựa chọn", options: pickOptions(["BUCKET_COUNT", "COUNT"]) },
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
    title: dynamicExcelName || blockId || dynamicExcelCode || fallbackTitle,
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

function buildTablePreviewValues(
  tableValues: WorkAssignmentBasicSummaryTableValuesDto | null | undefined,
): RuntimeWorkbookCellValue[] {
  const values = normalizeWorkbookValues(tableValues?.values1D ?? []);
  if (values.length > 0 || !tableValues?.cells?.length) return values;

  const maxIndex = tableValues.cells.reduce((max, cell) => {
    const index = typeof cell.index === "number" ? cell.index : -1;
    return index >= 0 ? Math.max(max, index) : max;
  }, -1);
  if (maxIndex < 0) return [];

  const fallback: RuntimeWorkbookCellValue[] = Array.from({ length: maxIndex + 1 }, () => null);
  for (const cell of tableValues.cells) {
    const index = typeof cell.index === "number" ? cell.index : -1;
    if (index < 0 || index >= fallback.length) continue;
    fallback[index] = normalizeWorkbookValues([cell.value ?? cell.displayValue ?? null])[0] ?? null;
  }
  return fallback;
}

function applySummaryPreviewValuesToWorkbook(
  workbook: any[],
  dataRect: ReportRect,
  values1D: RuntimeWorkbookCellValue[],
  spec: unknown,
): any[] {
  if (!Array.isArray(workbook) || workbook.length === 0 || !Array.isArray(values1D)) return workbook;
  if (dataRect.c1 < dataRect.c0 || dataRect.r1 < dataRect.r0) return workbook;

  const sheet = workbook[0];
  if (!sheet || typeof sheet !== "object") return workbook;

  const normalizedSpec = spec && typeof spec === "object"
    ? normalizeSpecDataTypeMetadata(spec as any)
    : null;
  const cellRefs = buildCellRefsForValues(dataRect, normalizedSpec, values1D.length);
  if (cellRefs.length !== values1D.length) return workbook;

  const rowCount = Math.max(Number(sheet.row) || 0, dataRect.r1 + 1, 1);
  const colCount = Math.max(Number(sheet.column) || 0, dataRect.c1 + 1, 1);
  const data = Array.isArray(sheet.data) ? sheet.data : [];
  while (data.length < rowCount) data.push([]);

  const celldata = Array.isArray(sheet.celldata) ? sheet.celldata.slice() : [];
  const celldataIndex = buildCelldataIndex(celldata);

  for (let index = 0; index < cellRefs.length; index += 1) {
    const raw = values1D[index];
    if (isBlankSummaryPreviewValue(raw)) continue;

    const { r, c } = cellRefs[index];
    if (r < 0 || c < 0) continue;
    data[r] = Array.isArray(data[r]) ? data[r] : [];

    const key = `${r}:${c}`;
    const existingCelldataIndex = celldataIndex.get(key);
    const existingCelldata = existingCelldataIndex == null ? null : celldata[existingCelldataIndex]?.v;
    const existing = data[r][c] ?? existingCelldata ?? null;
    const dataType = normalizedSpec ? getCellDataType(normalizedSpec, dataRect, r, c) : undefined;
    const nextCell = buildSummaryPreviewCell(existing, raw, dataType);

    data[r][c] = nextCell;
    upsertSummaryPreviewCelldata(celldata, celldataIndex, r, c, nextCell);
  }

  sheet.id = String(sheet.id ?? sheet.index ?? "sheet-1");
  sheet.index = sheet.index ?? sheet.id;
  sheet.name = sheet.name ?? "Sheet1";
  sheet.row = rowCount;
  sheet.column = colCount;
  sheet.data = data;
  sheet.celldata = celldata;

  recalculateSimpleNumericFormulas(workbook);
  return workbook;
}

function normalizeWorkbookValues(values: unknown[]): RuntimeWorkbookCellValue[] {
  return values.map((value) => {
    if (value == null) return null;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.map((item) => String(item));
    return String(value);
  });
}

function buildSummaryPreviewCell(existing: any, raw: RuntimeWorkbookCellValue, dataType?: string) {
  const displayValue = Array.isArray(raw) ? raw.join("; ") : String(raw);
  const base = existing && typeof existing === "object" && !Array.isArray(existing)
    ? { ...existing }
    : {};
  const numeric = dataType === "NUMBER" ? parseSummaryPreviewNumber(raw) : null;

  if (numeric != null) {
    return {
      ...base,
      v: numeric,
      m: String(numeric),
      ct: withSummaryPreviewNumberFormat(base.ct),
    };
  }

  return {
    ...base,
    v: displayValue,
    m: displayValue,
  };
}

function buildCelldataIndex(celldata: any[]) {
  const index = new Map<string, number>();
  for (let itemIndex = 0; itemIndex < celldata.length; itemIndex += 1) {
    const item = celldata[itemIndex];
    const r = Math.floor(Number(item?.r));
    const c = Math.floor(Number(item?.c));
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) continue;
    index.set(`${r}:${c}`, itemIndex);
  }
  return index;
}

function upsertSummaryPreviewCelldata(
  celldata: any[],
  celldataIndex: Map<string, number>,
  r: number,
  c: number,
  cell: any,
) {
  const key = `${r}:${c}`;
  const existingIndex = celldataIndex.get(key);
  const nextItem = { r, c, v: cell };

  if (existingIndex == null) {
    celldataIndex.set(key, celldata.length);
    celldata.push(nextItem);
    return;
  }

  celldata[existingIndex] = nextItem;
}

function isBlankSummaryPreviewValue(value: RuntimeWorkbookCellValue | undefined) {
  return value == null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
}

function parseSummaryPreviewNumber(value: RuntimeWorkbookCellValue) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text) return null;

  const normalized = text.replace(/\s/g, "").replace(/,/g, "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function withSummaryPreviewNumberFormat(value: any) {
  const ct = value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
  delete ct.s;
  if (String(ct.fa ?? "").trim() === "@") delete ct.fa;
  ct.t = "n";
  return ct;
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
