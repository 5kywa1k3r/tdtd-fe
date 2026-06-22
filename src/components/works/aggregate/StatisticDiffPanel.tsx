import React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import {
  useDeleteStatisticDiffConfigMutation,
  useListStatisticDiffConfigsQuery,
  useRunStatisticDiffMutation,
  useSaveStatisticDiffConfigMutation,
  type StatisticDiffOperator,
  type StatisticDiffPeriodCompareMode,
  type StatisticDiffRunResponse,
  type StatisticDiffSourceKind,
  type StatisticDiffTarget,
} from "../../../api/statisticDiffApi";
import { formatDayKeyLabel } from "./aggregateUtils";
import type { BasicSummarySourceScopeOption } from "./BasicSummaryPanel";

type Props = {
  workId?: string | null;
  assignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  periodKey?: string | null;
  selectedUnitIds: string[];
  sourceScopeOptions: BasicSummarySourceScopeOption[];
  defaultSourceScopeMode: string;
};

const SOURCE_KIND_OPTIONS: Array<{ value: StatisticDiffSourceKind; label: string }> = [
  { value: "FIELD", label: "Trường" },
  { value: "TABLE", label: "Bảng" },
];

const PERIOD_COMPARE_OPTIONS: Array<{ value: StatisticDiffPeriodCompareMode; label: string }> = [
  { value: "SAME_PERIOD", label: "Cùng kỳ" },
  { value: "PREVIOUS_PERIOD", label: "Kỳ trước" },
];

const OPERATOR_OPTIONS: Array<{ value: StatisticDiffOperator; label: string }> = [
  { value: "CHANGED", label: "Thay đổi" },
  { value: "DELTA", label: "Có chênh lệch" },
  { value: "GREATER_THAN", label: "Lớn hơn" },
  { value: "LESS_THAN", label: "Nhỏ hơn" },
  { value: "BUCKET_CHANGED", label: "Đổi nhóm" },
  { value: "MISSING", label: "Thiếu dữ liệu" },
];

const JOIN_KEY_OPTIONS = [
  { value: "PERIOD", label: "Theo kỳ" },
  { value: "ROW_KEY", label: "Theo dòng bảng" },
];

const DEFAULT_TARGET: StatisticDiffTarget = {
  sourceKind: "FIELD",
  dynamicFormTemplateId: null,
  fieldKey: "",
  conceptCode: "",
  sourceScopeMode: "DIRECT_CHILDREN_OR_SELF",
};

function cloneTarget(target: StatisticDiffTarget): StatisticDiffTarget {
  return { ...target };
}

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanTarget(
  target: StatisticDiffTarget,
  dynamicFormTemplateId?: string | null,
  defaultSourceScopeMode?: string | null,
): StatisticDiffTarget {
  const sourceKind = String(target.sourceKind || "FIELD").toUpperCase() as StatisticDiffSourceKind;
  return {
    sourceKind,
    dynamicFormTemplateId: normalizeText(target.dynamicFormTemplateId) ?? normalizeText(dynamicFormTemplateId),
    fieldId: normalizeText(target.fieldId),
    fieldKey: normalizeText(target.fieldKey),
    blockId: normalizeText(target.blockId),
    metricKey: normalizeText(target.metricKey),
    metricLabelCode: normalizeText(target.metricLabelCode),
    rowKey: normalizeText(target.rowKey),
    columnKey: normalizeText(target.columnKey),
    conceptCode: normalizeText(target.conceptCode)?.toUpperCase() ?? null,
    bucketKey: normalizeText(target.bucketKey),
    sourceScopeMode: normalizeText(target.sourceScopeMode) ?? defaultSourceScopeMode ?? "DIRECT_CHILDREN_OR_SELF",
    sourceFlowInstanceId: normalizeText(target.sourceFlowInstanceId),
    sourceFlowStepId: normalizeText(target.sourceFlowStepId),
    sourceFlowBranchId: normalizeText(target.sourceFlowBranchId),
    sourceFlowEffectiveStatus: normalizeText(target.sourceFlowEffectiveStatus),
  };
}

function targetHasSelector(target: StatisticDiffTarget) {
  if (target.sourceKind === "TABLE") {
    return Boolean(
      normalizeText(target.blockId) ||
      normalizeText(target.metricKey) ||
      normalizeText(target.metricLabelCode) ||
      normalizeText(target.rowKey) ||
      normalizeText(target.columnKey) ||
      normalizeText(target.conceptCode),
    );
  }

  return Boolean(
    normalizeText(target.fieldId) ||
    normalizeText(target.fieldKey) ||
    normalizeText(target.conceptCode),
  );
}

function formatValue(value?: StatisticDiffRunResponse["rows"][number]["current"]) {
  if (!value) return "-";
  if (typeof value.numericValue === "number") return formatNumber(value.numericValue);
  if (value.bucketLabel || value.bucketKey) return value.bucketLabel ?? value.bucketKey;
  return value.valueSignature ?? `${value.valueCount}`;
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);
}

function applyConfigToTarget(configTarget: StatisticDiffTarget): StatisticDiffTarget {
  return {
    ...DEFAULT_TARGET,
    ...configTarget,
    sourceKind: String(configTarget.sourceKind || "FIELD").toUpperCase(),
  };
}

const StatisticDiffPanel: React.FC<Props> = ({
  workId,
  assignmentId,
  dynamicFormTemplateId,
  periodKey,
  selectedUnitIds,
  sourceScopeOptions,
  defaultSourceScopeMode,
}) => {
  const [configName, setConfigName] = React.useState("So sánh thống kê");
  const [selectedConfigId, setSelectedConfigId] = React.useState("");
  const [current, setCurrent] = React.useState<StatisticDiffTarget>(() => cloneTarget(DEFAULT_TARGET));
  const [comparison, setComparison] = React.useState<StatisticDiffTarget>(() => cloneTarget(DEFAULT_TARGET));
  const [periodCompareMode, setPeriodCompareMode] =
    React.useState<StatisticDiffPeriodCompareMode>("SAME_PERIOD");
  const [operator, setOperator] = React.useState<StatisticDiffOperator>("CHANGED");
  const [joinKey, setJoinKey] = React.useState<"PERIOD" | "ROW_KEY">("PERIOD");
  const [requireSameConcept, setRequireSameConcept] = React.useState(true);
  const [result, setResult] = React.useState<StatisticDiffRunResponse | null>(null);
  const [message, setMessage] = React.useState("");

  const configsQuery = useListStatisticDiffConfigsQuery(
    {
      workId: workId ?? "",
      assignmentId,
      dynamicFormTemplateId,
    },
    { skip: !workId || !assignmentId },
  );
  const [runDiff, runState] = useRunStatisticDiffMutation();
  const [saveConfig, saveState] = useSaveStatisticDiffConfigMutation();
  const [deleteConfig, deleteState] = useDeleteStatisticDiffConfigMutation();

  React.useEffect(() => {
    setCurrent((prev) => ({
      ...prev,
      dynamicFormTemplateId: prev.dynamicFormTemplateId ?? dynamicFormTemplateId ?? null,
      sourceScopeMode: prev.sourceScopeMode ?? defaultSourceScopeMode,
    }));
    setComparison((prev) => ({
      ...prev,
      dynamicFormTemplateId: prev.dynamicFormTemplateId ?? dynamicFormTemplateId ?? null,
      sourceScopeMode: prev.sourceScopeMode ?? defaultSourceScopeMode,
    }));
  }, [defaultSourceScopeMode, dynamicFormTemplateId]);

  const canSubmit = Boolean(
    workId &&
    assignmentId &&
    dynamicFormTemplateId &&
    periodKey &&
    targetHasSelector(current) &&
    targetHasSelector(comparison),
  );

  const buildPayload = React.useCallback(() => {
    const cleanCurrent = cleanTarget(current, dynamicFormTemplateId, defaultSourceScopeMode);
    const cleanComparison = cleanTarget(comparison, dynamicFormTemplateId, defaultSourceScopeMode);
    return {
      workId,
      assignmentId,
      dynamicFormTemplateId,
      current: cleanCurrent,
      comparison: cleanComparison,
      periodCompareMode,
      operator,
      joinKey,
      requireSameConcept,
    };
  }, [
    assignmentId,
    comparison,
    current,
    defaultSourceScopeMode,
    dynamicFormTemplateId,
    joinKey,
    operator,
    periodCompareMode,
    requireSameConcept,
    workId,
  ]);

  const handleApplyConfig = React.useCallback(
    (configId: string) => {
      setSelectedConfigId(configId);
      const config = (configsQuery.data ?? []).find((item) => item.id === configId);
      if (!config) return;

      setConfigName(config.name || "So sánh thống kê");
      setCurrent(applyConfigToTarget(config.current));
      setComparison(applyConfigToTarget(config.comparison));
      setPeriodCompareMode(config.periodCompareMode === "PREVIOUS_PERIOD" ? "PREVIOUS_PERIOD" : "SAME_PERIOD");
      setOperator((OPERATOR_OPTIONS.some((item) => item.value === config.operator)
        ? config.operator
        : "CHANGED") as StatisticDiffOperator);
      setJoinKey(config.joinKey === "ROW_KEY" ? "ROW_KEY" : "PERIOD");
      setRequireSameConcept(config.requireSameConcept !== false);
      setResult(null);
      setMessage("");
    },
    [configsQuery.data],
  );

  const handleRun = React.useCallback(async () => {
    setMessage("");
    if (!canSubmit) {
      setMessage("Thiếu kỳ hoặc selector nguồn so sánh.");
      return;
    }

    const response = await runDiff({
      ...buildPayload(),
      configId: selectedConfigId || null,
      periodKey,
      selectedUnitIds,
      limit: 200,
    }).unwrap();
    setResult(response);
  }, [buildPayload, canSubmit, periodKey, runDiff, selectedConfigId, selectedUnitIds]);

  const handleSave = React.useCallback(async () => {
    setMessage("");
    if (!workId || !assignmentId || !dynamicFormTemplateId) {
      setMessage("Thiếu ngữ cảnh công việc để lưu cấu hình.");
      return;
    }
    if (!targetHasSelector(current) || !targetHasSelector(comparison)) {
      setMessage("Thiếu selector nguồn so sánh.");
      return;
    }

    const saved = await saveConfig({
      ...buildPayload(),
      id: selectedConfigId || null,
      name: configName,
      configJson: null,
    }).unwrap();
    setSelectedConfigId(saved.id);
    setConfigName(saved.name);
  }, [
    assignmentId,
    buildPayload,
    comparison,
    configName,
    current,
    dynamicFormTemplateId,
    saveConfig,
    selectedConfigId,
    workId,
  ]);

  const handleDelete = React.useCallback(async () => {
    if (!selectedConfigId) return;
    await deleteConfig(selectedConfigId).unwrap();
    setSelectedConfigId("");
    setConfigName("So sánh thống kê");
  }, [deleteConfig, selectedConfigId]);

  return (
    <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>
            So sánh thống kê
          </Typography>
          <Chip size="small" variant="outlined" label={formatDayKeyLabel(periodKey)} />
          {result?.truncated && <Chip size="small" color="warning" label="Giới hạn kết quả" />}
        </Stack>

        {message && <Alert severity="warning">{message}</Alert>}

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            select
            size="small"
            label="Cấu hình"
            value={selectedConfigId}
            onChange={(event) => handleApplyConfig(event.target.value)}
            sx={{ minWidth: { md: 260 } }}
          >
            <MenuItem value="">Tạo mới</MenuItem>
            {(configsQuery.data ?? []).map((config) => (
              <MenuItem key={config.id} value={config.id}>
                {config.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Tên"
            value={configName}
            onChange={(event) => setConfigName(event.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            size="small"
            label="Kỳ so sánh"
            value={periodCompareMode}
            onChange={(event) => setPeriodCompareMode(event.target.value as StatisticDiffPeriodCompareMode)}
            sx={{ minWidth: { md: 150 } }}
          >
            {PERIOD_COMPARE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Toán tử"
            value={operator}
            onChange={(event) => setOperator(event.target.value as StatisticDiffOperator)}
            sx={{ minWidth: { md: 160 } }}
          >
            {OPERATOR_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
          <DiffTargetEditor
            title="Nguồn hiện tại"
            value={current}
            dynamicFormTemplateId={dynamicFormTemplateId}
            sourceScopeOptions={sourceScopeOptions}
            defaultSourceScopeMode={defaultSourceScopeMode}
            onChange={setCurrent}
          />
          <DiffTargetEditor
            title="Nguồn đối chiếu"
            value={comparison}
            dynamicFormTemplateId={dynamicFormTemplateId}
            sourceScopeOptions={sourceScopeOptions}
            defaultSourceScopeMode={defaultSourceScopeMode}
            onChange={setComparison}
          />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
          <TextField
            select
            size="small"
            label="Ghép dòng"
            value={joinKey}
            onChange={(event) => setJoinKey(event.target.value as "PERIOD" | "ROW_KEY")}
            sx={{ minWidth: { md: 180 } }}
          >
            {JOIN_KEY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={requireSameConcept}
                onChange={(event) => setRequireSameConcept(event.target.checked)}
              />
            }
            label="Cùng concept"
          />
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineOutlinedIcon fontSize="small" />}
            onClick={() => void handleDelete()}
            disabled={!selectedConfigId || deleteState.isLoading}
          >
            Xóa
          </Button>
          <Button
            variant="outlined"
            startIcon={<SaveOutlinedIcon fontSize="small" />}
            onClick={() => void handleSave()}
            disabled={saveState.isLoading}
          >
            Lưu
          </Button>
          <Button
            variant="contained"
            startIcon={<CalculateOutlinedIcon fontSize="small" />}
            onClick={() => void handleRun()}
            disabled={runState.isLoading || !canSubmit}
          >
            Chạy
          </Button>
        </Stack>

        {result && (
          <Stack spacing={1}>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip label={`Dòng: ${result.comparedRowCount}`} variant="outlined" />
              <Chip label={`Khớp: ${result.matchedOperatorCount}`} color="primary" variant="outlined" />
              <Chip label={`Nguồn hiện tại: ${result.currentSourceAssignmentCount}`} variant="outlined" />
              <Chip label={`Nguồn đối chiếu: ${result.comparisonSourceAssignmentCount}`} variant="outlined" />
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Khóa</TableCell>
                    <TableCell>Kỳ</TableCell>
                    <TableCell>Concept</TableCell>
                    <TableCell>Loại</TableCell>
                    <TableCell align="right">Hiện tại</TableCell>
                    <TableCell align="right">Đối chiếu</TableCell>
                    <TableCell align="right">Delta</TableCell>
                    <TableCell>Kết quả</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.rows.map((row) => (
                    <TableRow key={row.key} hover>
                      <TableCell>{row.rowKey ?? row.key}</TableCell>
                      <TableCell>
                        {formatDayKeyLabel(row.currentPeriodKey)} / {formatDayKeyLabel(row.comparisonPeriodKey)}
                      </TableCell>
                      <TableCell>{row.conceptCode ?? "-"}</TableCell>
                      <TableCell>{row.dataCategory ?? "-"}</TableCell>
                      <TableCell align="right">{formatValue(row.current)}</TableCell>
                      <TableCell align="right">{formatValue(row.comparison)}</TableCell>
                      <TableCell align="right">{formatNumber(row.delta)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={row.matchesOperator ? "primary" : "default"}
                          variant={row.matchesOperator ? "filled" : "outlined"}
                          label={row.missingSide ? `Thiếu ${row.missingSide}` : row.changed ? "Khác" : "Giống"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {result.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Typography variant="body2" sx={{ opacity: 0.72 }}>
                          Chưa có dòng so sánh.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

type TargetEditorProps = {
  title: string;
  value: StatisticDiffTarget;
  dynamicFormTemplateId?: string | null;
  sourceScopeOptions: BasicSummarySourceScopeOption[];
  defaultSourceScopeMode: string;
  onChange: (value: StatisticDiffTarget) => void;
};

const DiffTargetEditor: React.FC<TargetEditorProps> = ({
  title,
  value,
  dynamicFormTemplateId,
  sourceScopeOptions,
  defaultSourceScopeMode,
  onChange,
}) => {
  const sourceKind = String(value.sourceKind || "FIELD").toUpperCase() as StatisticDiffSourceKind;

  const patch = (next: Partial<StatisticDiffTarget>) => {
    onChange({
      ...value,
      ...next,
      dynamicFormTemplateId: value.dynamicFormTemplateId ?? dynamicFormTemplateId ?? null,
    });
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            select
            size="small"
            label="Loại"
            value={sourceKind}
            onChange={(event) => patch({ sourceKind: event.target.value as StatisticDiffSourceKind })}
            sx={{ minWidth: { sm: 120 } }}
          >
            {SOURCE_KIND_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Nguồn dữ liệu"
            value={value.sourceScopeMode || defaultSourceScopeMode}
            onChange={(event) => patch({ sourceScopeMode: event.target.value })}
            sx={{ flex: 1 }}
          >
            {sourceScopeOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {sourceKind === "FIELD" ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Field key"
              value={value.fieldKey ?? ""}
              onChange={(event) => patch({ fieldKey: event.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Field id"
              value={value.fieldId ?? ""}
              onChange={(event) => patch({ fieldId: event.target.value })}
              sx={{ flex: 1 }}
            />
          </Stack>
        ) : (
          <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                label="Block"
                value={value.blockId ?? ""}
                onChange={(event) => patch({ blockId: event.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Metric"
                value={value.metricKey ?? ""}
                onChange={(event) => patch({ metricKey: event.target.value })}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                label="Row key"
                value={value.rowKey ?? ""}
                onChange={(event) => patch({ rowKey: event.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Column key"
                value={value.columnKey ?? ""}
                onChange={(event) => patch({ columnKey: event.target.value })}
                sx={{ flex: 1 }}
              />
            </Stack>
          </>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            size="small"
            label="Concept"
            value={value.conceptCode ?? ""}
            onChange={(event) => patch({ conceptCode: event.target.value })}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            label="Bucket"
            value={value.bucketKey ?? ""}
            onChange={(event) => patch({ bucketKey: event.target.value })}
            sx={{ flex: 1 }}
          />
        </Stack>
      </Stack>
    </Box>
  );
};

export default StatisticDiffPanel;
