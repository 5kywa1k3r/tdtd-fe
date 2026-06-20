import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import type { Sheet } from "@fortune-sheet/core";

import {
  extractTypedValues1D,
  type WorkbookCellValue,
  type WorkbookValueValidationIssue,
} from "./fortuneAdapter";
import {
  getCellDataType,
  getCellStringListOptions,
  getCellValueSource,
  isDynamicExcelEnumDataType,
  isSystemValueSource,
  normalizeSpecDataTypeMetadata,
  DATA_TYPE_COLORS,
} from "./dataTypes";
import { cloneDeepJson, ensureWorkbookShape, type ReportRect } from "./reportWorkbook";
import { computeRegions, getTableRect, type Rect as RegionRect } from "./regions";
import type {
  DynamicExcelDataType,
  DynamicExcelStringListOption,
  DynamicExcelValueSource,
  HeaderSpec,
} from "./types";
import {
  createInputDataCellChecker,
  getSpecialRanges,
  SPECIAL_RANGE_COLORS,
  type DynamicExcelInputCellRef,
} from "./specialRanges";
import { MARK_COLORS, markRect, stripMarksForSave, type Backup, type Rect as MarkRect } from "./designerMarking";
import LazyFortuneWorkbook from "./LazyFortuneWorkbook";
import { useFortuneWheelScrollFix } from "./wheelScroll";
import { GuideLegend, GuideLegendChip, GuideToggleButton } from "./PreviewGuideControls";
import { DESIGNER_LIMITS } from "./validate";
import {
  normalizeWorkbookNumberInputCells,
  recalculateSimpleNumericFormulas,
  stripEmptyNumberInputCellMetadata,
} from "./workbookRuntime";
import {
  useLazySearchPickerPositionsQuery,
  useLazySearchPickerLabelEnumOptionsQuery,
  useLazySearchPickerUnitTypesQuery,
  useLazySearchPickerUnitsByCodeQuery,
  useLazySearchPickerUsersQuery,
} from "../../../api/pickersApi";

export type WorkbookDataGridMode = "edit" | "view";
export type WorkbookDataGridChangeCommitMode = "immediate" | "manual";

export interface WorkbookDataGridSavePayload {
  rawWorkbookData: Sheet[];
  values1D: WorkbookCellValue[];
  valuesHash: string;
  cellRefs?: DynamicExcelInputCellRef[];
  validationIssues: WorkbookValueValidationIssue[];
}

export interface WorkbookDataGridHandle {
  commitChanges: () => WorkbookDataGridSavePayload | null;
}

export type WorkbookPreviewHighlight = {
  rect: ReportRect;
  color: string;
};

export interface WorkbookDataGridProps {
  initialSpec: any;
  initialWorkbookData: Sheet[];
  dataRect: ReportRect;
  previewHighlights?: WorkbookPreviewHighlight[];

  mode?: WorkbookDataGridMode;
  readOnly?: boolean;
  saving?: boolean;

  showActions?: boolean;
  showFullscreenActions?: boolean;
  embeddedFullscreen?: boolean;
  inlineReadOnly?: boolean;
  changeCommitMode?: WorkbookDataGridChangeCommitMode;
  saveLabel?: string;
  backLabel?: string;
  surfaceVariant?: "card" | "flat";
  excludedDataColumns?: number[];

  onBack?: () => void;
  onChangeRaw?: (workbookData: Sheet[], payload?: WorkbookDataGridSavePayload) => void;
  onDirty?: () => void;
  onSave?: (payload: WorkbookDataGridSavePayload) => void;
}

const EMPTY_PREVIEW_HIGHLIGHTS: WorkbookPreviewHighlight[] = [];
const LARGE_TABLE_STATISTIC_INPUT_CELL_LIMIT = DESIGNER_LIMITS.MAX_TABLE_STATISTIC_INPUT_CELLS;
const PREVIEW_SUMMARY_CELL_SCAN_LIMIT = DESIGNER_LIMITS.MAX_SHEET_CELLS;
const INLINE_WORKBOOK_ZOOM_RATIO = 0.5;
const FULLSCREEN_WORKBOOK_ZOOM_RATIO = 0.8;

type WorkbookPreviewSummary = {
  hasPreview: boolean;
  hasSemanticWarning: boolean;
  specialRanges: ReturnType<typeof getSpecialRanges>;
  ignoreCells: number;
  inputCells: number;
  statisticsDisabled: boolean;
  statisticsInputCellLimit: number;
};

const EMPTY_PREVIEW_BACKUP = new Map<string, Backup>();

function WorkbookDataGrid(
  props: WorkbookDataGridProps,
  ref: React.ForwardedRef<WorkbookDataGridHandle>,
) {
  const {
    initialSpec,
    initialWorkbookData,
    dataRect,
    previewHighlights = EMPTY_PREVIEW_HIGHLIGHTS,

    mode = "edit",
    readOnly = false,
    saving = false,

    showActions = true,
    showFullscreenActions = showActions,
    embeddedFullscreen = false,
    inlineReadOnly = false,
    changeCommitMode = "immediate",
    saveLabel = "Lưu draft",
    backLabel = "Quay lại",
    surfaceVariant = "card",

    excludedDataColumns = [],

    onBack,
    onChangeRaw,
    onDirty,
    onSave,
  } = props;

  const isView = mode === "view" || readOnly;
  const shouldUseRuntimeWorkbook = !isView;
  const previewSummary = React.useMemo(
    () => buildWorkbookPreviewSummary(initialSpec, dataRect, previewHighlights),
    [initialSpec, dataRect, previewHighlights],
  );
  const [previewOverlayEnabled, setPreviewOverlayEnabled] = React.useState(false);
  const effectivePreviewOverlayEnabled = previewOverlayEnabled && previewSummary.hasPreview;
  const togglePreviewOverlay = React.useCallback(() => {
    setPreviewOverlayEnabled((value) => !value);
  }, []);

  const workbookRef = React.useRef<Sheet[]>([]);
  const fortuneWorkbookRef = React.useRef<any>(null);
  const baselineWorkbookRef = React.useRef<Sheet[]>([]);
  const previewBackupRef = React.useRef<Map<string, Backup>>(EMPTY_PREVIEW_BACKUP);
  const [workbookData, setWorkbookData] = React.useState<Sheet[]>(() => {
    const raw = normalizeWorkbookForGridMode(initialWorkbookData, dataRect, initialSpec, shouldUseRuntimeWorkbook);
    workbookRef.current = raw;
    baselineWorkbookRef.current = shouldUseRuntimeWorkbook ? cloneDeepJson(raw) : [];
    const rendered = buildGridWorkbook(
      raw,
      dataRect,
      initialSpec,
      effectivePreviewOverlayEnabled,
      previewHighlights,
      { assumeNormalized: true, useRuntimeWorkbook: shouldUseRuntimeWorkbook },
    );
    previewBackupRef.current = rendered.previewBackup;
    return rendered.workbookData;
  });
  const [workbookKey, setWorkbookKey] = React.useState(0);
  const [shouldRenderWorkbook, setShouldRenderWorkbook] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = React.useState(false);
  const workbookZoomRatio = fullscreenOpen || embeddedFullscreen
    ? FULLSCREEN_WORKBOOK_ZOOM_RATIO
    : INLINE_WORKBOOK_ZOOM_RATIO;
  const sheetWheelRef = useFortuneWheelScrollFix<HTMLDivElement>();

  const renderWorkbookForState = React.useCallback(
    (rawWorkbookData: Sheet[]) => {
      const rendered = buildGridWorkbook(
        rawWorkbookData,
        dataRect,
        initialSpec,
        effectivePreviewOverlayEnabled,
        previewHighlights,
        { assumeNormalized: true, useRuntimeWorkbook: shouldUseRuntimeWorkbook },
      );
      previewBackupRef.current = rendered.previewBackup;
      return rendered.workbookData;
    },
    [dataRect, effectivePreviewOverlayEnabled, initialSpec, previewHighlights, shouldUseRuntimeWorkbook],
  );

  const getLiveWorkbookData = React.useCallback(() => {
    try {
      const live = fortuneWorkbookRef.current?.getAllSheets?.();
      if (Array.isArray(live) && live.length > 0) return cloneDeepJson(stripWorkbookZoom(live as Sheet[]));
    } catch {
      // Fortune may be between mounts while switching inline/fullscreen surfaces.
    }

    return Array.isArray(workbookRef.current) && workbookRef.current.length > 0
      ? workbookRef.current
      : workbookData;
  }, [workbookData]);

  const buildCurrentSavePayload = React.useCallback(() => {
    if (isView) return null;

    const latestRaw = getLiveWorkbookData();
    const sanitized = sanitizeRuntimeWorkbookData(
      latestRaw,
      baselineWorkbookRef.current,
      dataRect,
      excludedDataColumns,
      initialSpec,
      previewBackupRef.current,
      previewHighlights,
    );
    workbookRef.current = sanitized;
    return buildWorkbookSavePayload(sanitized, dataRect, excludedDataColumns, initialSpec);
  }, [dataRect, excludedDataColumns, getLiveWorkbookData, initialSpec, isView, previewHighlights]);

  const commitChanges = React.useCallback(() => {
    const payload = buildCurrentSavePayload();
    if (!payload) return null;
    return payload;
  }, [buildCurrentSavePayload]);

  React.useImperativeHandle(ref, () => ({ commitChanges }), [commitChanges]);

  React.useEffect(() => {
    const raw = normalizeWorkbookForGridMode(initialWorkbookData, dataRect, initialSpec, shouldUseRuntimeWorkbook);
    workbookRef.current = raw;
    baselineWorkbookRef.current = shouldUseRuntimeWorkbook ? cloneDeepJson(raw) : [];
    const rendered = buildGridWorkbook(
      raw,
      dataRect,
      initialSpec,
      effectivePreviewOverlayEnabled,
      previewHighlights,
      { assumeNormalized: true, useRuntimeWorkbook: shouldUseRuntimeWorkbook },
    );
    previewBackupRef.current = rendered.previewBackup;
    setWorkbookData(rendered.workbookData);
    setWorkbookKey((x) => x + 1);
    setError(null);
  }, [dataRect, initialSpec, initialWorkbookData, shouldUseRuntimeWorkbook]);

  React.useEffect(() => {
    setWorkbookData(renderWorkbookForState(workbookRef.current));
    setWorkbookKey((x) => x + 1);
  }, [effectivePreviewOverlayEnabled, previewHighlights]);

  React.useEffect(() => {
    if (!fullscreenOpen && !embeddedFullscreen) return undefined;

    const notifyResize = () => window.dispatchEvent(new Event("resize"));
    const frame = window.requestAnimationFrame(notifyResize);
    const timeout = window.setTimeout(notifyResize, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [embeddedFullscreen, fullscreenOpen]);

  React.useEffect(() => {
    setShouldRenderWorkbook(false);
    const id = window.requestAnimationFrame(() => {
      setShouldRenderWorkbook(true);
    });

    return () => window.cancelAnimationFrame(id);
  }, [workbookKey]);

  const settings = React.useMemo(() => {
    const normalizedSpec = isHeaderSpec(initialSpec) ? normalizeSpecDataTypeMetadata(initialSpec) : null;
    const excludedColumnSet = buildExcludedColumnSet(excludedDataColumns);
    const inputCellChecker = normalizedSpec
      ? createInputDataCellChecker(dataRect, normalizedSpec)
      : null;

    return {
      data: withWorkbookZoom(workbookData, workbookZoomRatio) as Sheet[],
      row: workbookData?.[0]?.row,
      column: workbookData?.[0]?.column,
      allowEdit: !isView && (!inlineReadOnly || fullscreenOpen || embeddedFullscreen),
      showSheetTabs: false,
      hooks: {
        beforeRenderCell: (cell: any, cellInfo: FortuneCellRenderInfo, renderCtx: CanvasRenderingContext2D) =>
          renderMultiSelectChipsCell(
            cell,
            cellInfo,
            renderCtx,
            dataRect,
            excludedColumnSet,
            normalizedSpec,
            inputCellChecker,
          ),
      },
      onChange: (data: any) => {
        if (isView) return;
        if (Array.isArray(data)) {
          if (changeCommitMode === "manual") {
            onDirty?.();
            return;
          }
          const baseWorkbookData = cloneDeepJson(stripWorkbookZoom(data as Sheet[]));
          const nextWorkbookData = sanitizeRuntimeWorkbookData(
            baseWorkbookData,
            baselineWorkbookRef.current,
            dataRect,
            excludedDataColumns,
            initialSpec,
            previewBackupRef.current,
            previewHighlights,
          );
          workbookRef.current = nextWorkbookData;
          setWorkbookData(renderWorkbookForState(nextWorkbookData));
          onChangeRaw?.(
            nextWorkbookData,
            buildWorkbookSavePayload(nextWorkbookData, dataRect, excludedDataColumns, initialSpec) ?? undefined,
          );
        }
      },
    };
  }, [
    changeCommitMode,
    embeddedFullscreen,
    fullscreenOpen,
    inlineReadOnly,
    workbookData,
    dataRect,
    excludedDataColumns,
    initialSpec,
    isView,
    onChangeRaw,
    onDirty,
    previewHighlights,
    renderWorkbookForState,
    workbookZoomRatio,
  ]);

  const enumCells = React.useMemo(
    () => (isView ? [] : buildEnumCellOptions(workbookData, dataRect, excludedDataColumns, initialSpec)),
    [workbookData, dataRect, excludedDataColumns, initialSpec, isView],
  );
  const valueSourceOptions = useWorkbookValueSourceOptions(enumCells);
  const enumEditorDisabled = isView || (inlineReadOnly && !fullscreenOpen && !embeddedFullscreen);

  const handleEnumCellChange = React.useCallback(
    (cell: EnumCellOption, nextValue: unknown) => {
      if (enumEditorDisabled) return;

      setError(null);
      setWorkbookData((prev) => {
        const baseWorkbook =
          Array.isArray(workbookRef.current) && workbookRef.current.length > 0
            ? workbookRef.current
            : prev;
        const edited = setWorkbookEnumCell(
          baseWorkbook,
          cell.r,
          cell.c,
          valueSourceOptions.getOptions(cell),
          cell.dataType,
          nextValue,
        );
        const next = sanitizeRuntimeWorkbookData(
          edited,
          baselineWorkbookRef.current,
          dataRect,
          excludedDataColumns,
          initialSpec,
          previewBackupRef.current,
          previewHighlights,
        );
        workbookRef.current = next;
        const payload = buildWorkbookSavePayload(next, dataRect, excludedDataColumns, initialSpec);
        if (changeCommitMode === "immediate") {
          onChangeRaw?.(next, payload ?? undefined);
        } else {
          onDirty?.();
        }
        return renderWorkbookForState(next);
      });
      setWorkbookKey((x) => x + 1);
    },
    [
      changeCommitMode,
      dataRect,
      enumEditorDisabled,
      excludedDataColumns,
      initialSpec,
      onChangeRaw,
      onDirty,
      previewHighlights,
      renderWorkbookForState,
      valueSourceOptions,
    ],
  );

  const handleSave = React.useCallback(() => {
    try {
      setError(null);

      const payload = buildCurrentSavePayload();
      if (!payload) {
        throw new Error("Không lấy được dữ liệu sheet để lưu.");
      }
      if (payload.validationIssues.length > 0) {
        throw new Error(payload.validationIssues[0].message);
      }

      workbookRef.current = payload.rawWorkbookData;
      setWorkbookData(renderWorkbookForState(payload.rawWorkbookData));
      setWorkbookKey((x) => x + 1);
      onSave?.(payload);
    } catch (e: any) {
      setError(e?.message || "Không thể chuẩn bị dữ liệu để lưu.");
    }
  }, [buildCurrentSavePayload, onSave, renderWorkbookForState]);

  const handleOpenFullscreen = React.useCallback(() => {
    if (isView) {
      setFullscreenOpen(true);
      return;
    }

    const latest = sanitizeRuntimeWorkbookData(
      getLiveWorkbookData(),
      baselineWorkbookRef.current,
      dataRect,
      excludedDataColumns,
      initialSpec,
      previewBackupRef.current,
      previewHighlights,
    );
    workbookRef.current = latest;
    setWorkbookData(renderWorkbookForState(latest));
    setFullscreenOpen(true);
    setWorkbookKey((x) => x + 1);
  }, [dataRect, excludedDataColumns, getLiveWorkbookData, initialSpec, isView, previewHighlights, renderWorkbookForState]);

  const handleCloseFullscreen = React.useCallback(() => {
    if (isView) {
      setFullscreenOpen(false);
      return;
    }

    const latest = sanitizeRuntimeWorkbookData(
      getLiveWorkbookData(),
      baselineWorkbookRef.current,
      dataRect,
      excludedDataColumns,
      initialSpec,
      previewBackupRef.current,
      previewHighlights,
    );
    workbookRef.current = latest;
    setWorkbookData(renderWorkbookForState(latest));
    setFullscreenOpen(false);
    setWorkbookKey((x) => x + 1);
  }, [dataRect, excludedDataColumns, getLiveWorkbookData, initialSpec, isView, previewHighlights, renderWorkbookForState]);

  const renderWorkbookSurface = React.useCallback((fullscreen = false) => {
    return (
      <Box
        data-testid={fullscreen || embeddedFullscreen ? "workbook-grid-surface-fullscreen" : "workbook-grid-surface-inline"}
        ref={sheetWheelRef}
        className="tdtdSheet"
        sx={{
          width: "100%",
          position: "relative",
          ...(embeddedFullscreen || fullscreen
            ? { flex: "1 1 auto", height: "100%", minHeight: 0 }
            : {
                height: 350,
                minHeight: 350,
              }),
          overflow: "hidden",
          border: fullscreen ? 0 : "1px solid rgba(255,255,255,0.12)",
          borderRadius: fullscreen || embeddedFullscreen ? 0 : 2,
          "& .fortune-sheettab-button": {
            display: "none !important",
          },
          "& .fortune-sheettab-container-c": {
            display: "none !important",
          },
          "& .fortune-zoom-container": {
            display: "none !important",
          },
          "& #luckysheet-bottom-add-row, & #luckysheet-bottom-add-row-input, & #luckysheet-bottom-return-top": {
            display: "none !important",
          },
        }}
      >
        {shouldRenderWorkbook ? (
          <LazyFortuneWorkbook
            ref={fortuneWorkbookRef}
            key={workbookKey}
            {...settings}
            fallback={(
              <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
                <CircularProgress size={24} />
              </Stack>
            )}
          />
        ) : (
          <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
            <CircularProgress size={24} />
          </Stack>
        )}
      </Box>
    );
  }, [embeddedFullscreen, settings, shouldRenderWorkbook, workbookKey]);

  return (
    <Stack
      data-testid="workbook-data-grid"
      data-mode={isView ? "view" : "edit"}
      spacing={embeddedFullscreen ? 1 : 2}
      sx={{ flex: 1, minHeight: 0, width: "100%", height: embeddedFullscreen ? "100%" : undefined }}
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Box
        component={embeddedFullscreen ? "div" : Card}
        {...(!embeddedFullscreen
          ? {
              variant: surfaceVariant === "flat" ? "elevation" : "outlined",
              elevation: surfaceVariant === "flat" ? 0 : undefined,
            }
          : {})}
        sx={{
          flex: 1,
          minHeight: embeddedFullscreen ? 0 : 350,
          height: embeddedFullscreen ? "100%" : undefined,
          display: "flex",
          flexDirection: "column",
          ...(embeddedFullscreen
            ? {
                bgcolor: "transparent",
                border: 0,
                borderRadius: 0,
                boxShadow: "none",
              }
            : surfaceVariant === "flat"
              ? {
                  bgcolor: "transparent",
                  boxShadow: "none",
                }
              : null),
        }}
      >
        <Box
          component={embeddedFullscreen ? "div" : CardContent}
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: embeddedFullscreen ? 0.75 : 1,
            minHeight: 0,
            height: "100%",
            ...(embeddedFullscreen || surfaceVariant === "flat"
              ? {
                  p: 0,
                  "&:last-child": { pb: 0 },
                }
              : null),
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
            <WorkbookPreviewLegend summary={previewSummary} visible={effectivePreviewOverlayEnabled} />
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: "auto" }}>
              <GuideToggleButton
                enabled={effectivePreviewOverlayEnabled}
                disabled={!previewSummary.hasPreview}
                onToggle={togglePreviewOverlay}
              />
              {!embeddedFullscreen && (
                <Tooltip title="Mở toàn màn hình">
                  <IconButton
                    data-testid="workbook-open-fullscreen"
                    size="small"
                    onClick={handleOpenFullscreen}
                    aria-label="Mở toàn màn hình"
                  >
                    <FullscreenOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          {previewSummary.hasSemanticWarning && (
            <Alert severity="info" sx={{ py: 0.75 }}>
              Lớp màu hướng dẫn không lưu vào dữ liệu. Vùng công thức, tiêu đề và bỏ trống không nhận dữ liệu nhập.
            </Alert>
          )}

          {previewSummary.statisticsDisabled && (
            <Alert severity="warning" sx={{ py: 0.75 }}>
              Bảng có {previewSummary.inputCells} ô nhập, vượt ngưỡng {previewSummary.statisticsInputCellLimit}. Hệ thống không ghi thống kê nền từng ô, nhưng vẫn có thể tổng hợp trực tiếp từ báo cáo đã duyệt nếu không vượt {DESIGNER_LIMITS.MAX_DIRECT_AGGREGATE_INPUT_CELLS} ô input.
            </Alert>
          )}

          {fullscreenOpen && !embeddedFullscreen ? (
            <Alert severity="info" sx={{ py: 0.75 }}>
              Bảng đang mở ở chế độ toàn màn hình.
            </Alert>
          ) : renderWorkbookSurface(embeddedFullscreen)}

          {showActions && (
            <Box sx={{ display: "flex", justifyContent: onBack ? "space-between" : "flex-end", gap: 1 }}>
              {onBack && (
                <Button variant="outlined" onClick={onBack}>
                  {backLabel}
                </Button>
              )}

              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isView || saving}
              >
                {saveLabel}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {!embeddedFullscreen && (
      <Dialog
        fullScreen
        open={fullscreenOpen}
        onClose={handleCloseFullscreen}
        PaperProps={{
          sx: {
            m: 0,
            width: "100vw",
            maxWidth: "100vw",
            height: "100dvh",
            maxHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            borderRadius: 0,
          },
        }}
      >
        <DialogTitle component="div" sx={{ py: 1, pr: 1.25, flex: "0 0 auto" }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                Bảng tính
              </Typography>
              <GuideToggleButton
                enabled={effectivePreviewOverlayEnabled}
                disabled={!previewSummary.hasPreview}
                onToggle={togglePreviewOverlay}
              />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {showFullscreenActions && !isView && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveOutlinedIcon fontSize="small" />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saveLabel}
                </Button>
              )}
              <Tooltip title="Đóng toàn màn hình">
                <IconButton
                  data-testid="workbook-close-fullscreen"
                  size="small"
                  onClick={handleCloseFullscreen}
                  aria-label="Đóng toàn màn hình"
                >
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {error && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}
          {fullscreenOpen ? renderWorkbookSurface(true) : null}
        </DialogContent>
      </Dialog>
      )}

      {enumCells.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={700}>Danh sách chọn trong bảng</Typography>
                <Chip size="small" variant="outlined" label={`${enumCells.length} ô`} />
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: 1,
                  maxHeight: 260,
                  overflow: "auto",
                }}
              >
                {enumCells.map((cell) => {
                  const isMulti = cell.dataType === "MULTI_SELECT";
                  const selectedCodes = Array.isArray(cell.value)
                    ? cell.value
                    : cell.value
                      ? [cell.value]
                      : [];
                  const options = valueSourceOptions.getOptions(cell);

                  return (
                    <TextField
                      key={`${cell.r}:${cell.c}`}
                      select
                      size="small"
                      label={cell.cellRef}
                      value={cell.value}
                      disabled={enumEditorDisabled || options.length === 0}
                      helperText={getEnumCellHelperText(cell, options.length)}
                      onChange={(event) => handleEnumCellChange(cell, event.target.value)}
                      SelectProps={{
                        multiple: isMulti,
                        renderValue: isMulti
                          ? (selected) => {
                              const values = Array.isArray(selected) ? selected.map(String) : [];
                              return (
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                  {values.map((code) => {
                                    const option = options.find((item) => item.code === code);
                                    return (
                                      <Chip
                                        key={code}
                                        size="small"
                                        label={option?.label || code}
                                      />
                                    );
                                  })}
                                </Box>
                              );
                            }
                          : undefined,
                      }}
                    >
                      {!isMulti && (
                        <MenuItem value="">
                          <em>Để trống</em>
                        </MenuItem>
                      )}
                      {options.map((option) => (
                        <MenuItem key={option.code} value={option.code}>
                          {isMulti && <Checkbox size="small" checked={selectedCodes.includes(option.code)} />}
                          {option.label || option.code}
                        </MenuItem>
                      ))}
                    </TextField>
                  );
                })}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

export default React.forwardRef<WorkbookDataGridHandle, WorkbookDataGridProps>(WorkbookDataGrid);

function WorkbookPreviewLegend({
  summary,
  visible,
}: {
  summary: WorkbookPreviewSummary;
  visible: boolean;
}) {
  const specialByRole = summary.specialRanges.reduce<Record<string, number>>((acc, range) => {
    acc[range.role] = (acc[range.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <GuideLegend visible={visible}>
      <GuideLegendChip label="Header" color={MARK_COLORS.HEADER_BG} />
      <GuideLegendChip label="Vùng dữ liệu" color={MARK_COLORS.DATA_BG} />
      {specialByRole.FORMULA ? (
        <GuideLegendChip label={`Công thức ${specialByRole.FORMULA}`} color={SPECIAL_RANGE_COLORS.FORMULA} />
      ) : null}
      {(specialByRole.TITLE || specialByRole.HEADER) ? (
        <GuideLegendChip
          label={`Tiêu đề ${(specialByRole.TITLE ?? 0) + (specialByRole.HEADER ?? 0)}`}
          color={SPECIAL_RANGE_COLORS.TITLE}
        />
      ) : null}
      {(specialByRole.BLANK || specialByRole.STYLE) ? (
        <GuideLegendChip
          label={`Bỏ trống ${(specialByRole.BLANK ?? 0) + (specialByRole.STYLE ?? 0)}`}
          color={SPECIAL_RANGE_COLORS.BLANK}
        />
      ) : null}
      {summary.ignoreCells > 0 ? (
        <GuideLegendChip label={`Bỏ qua nhập ${summary.ignoreCells}`} color={DATA_TYPE_COLORS.IGNORE} />
      ) : null}
    </GuideLegend>
  );
}

function buildWorkbookPreviewSummary(
  spec: HeaderSpec | null | undefined,
  dataRect: ReportRect,
  previewHighlights: WorkbookPreviewHighlight[],
): WorkbookPreviewSummary {
  if (!isHeaderSpec(spec)) {
    return {
      hasPreview: previewHighlights.length > 0,
      hasSemanticWarning: false,
      specialRanges: [],
      ignoreCells: 0,
      inputCells: 0,
      statisticsDisabled: false,
      statisticsInputCellLimit: LARGE_TABLE_STATISTIC_INPUT_CELL_LIMIT,
    };
  }

  const normalizedSpec = normalizeSpecDataTypeMetadata(spec);
  const specialRanges = getSpecialRanges(normalizedSpec);
  const totalCells = getRectCellCount(dataRect);
  if (totalCells > PREVIEW_SUMMARY_CELL_SCAN_LIMIT) {
    return {
      hasPreview: true,
      hasSemanticWarning: specialRanges.length > 0,
      specialRanges,
      ignoreCells: 0,
      inputCells: totalCells,
      statisticsDisabled: totalCells > LARGE_TABLE_STATISTIC_INPUT_CELL_LIMIT,
      statisticsInputCellLimit: LARGE_TABLE_STATISTIC_INPUT_CELL_LIMIT,
    };
  }

  const isInputCell = createInputDataCellChecker(dataRect, normalizedSpec);
  let ignoreCells = 0;
  let inputCells = 0;

  for (let r = dataRect.r0; r <= dataRect.r1; r += 1) {
    for (let c = dataRect.c0; c <= dataRect.c1; c += 1) {
      if (!isInputCell(r, c)) continue;
      inputCells += 1;
      if (getCellDataType(normalizedSpec, dataRect, r, c) === "IGNORE") {
        ignoreCells += 1;
      }
    }
  }

  return {
    hasPreview: true,
    hasSemanticWarning: specialRanges.length > 0 || ignoreCells > 0,
    specialRanges,
    ignoreCells,
    inputCells,
    statisticsDisabled: inputCells > LARGE_TABLE_STATISTIC_INPUT_CELL_LIMIT,
    statisticsInputCellLimit: LARGE_TABLE_STATISTIC_INPUT_CELL_LIMIT,
  };
}

function getRectCellCount(rect: ReportRect) {
  const rows = rect.r1 - rect.r0 + 1;
  const cols = rect.c1 - rect.c0 + 1;
  if (rows <= 0 || cols <= 0) return 0;
  return rows * cols;
}

type EnumCellOption = {
  r: number;
  c: number;
  cellRef: string;
  dataType: DynamicExcelDataType;
  value: string | string[];
  options: DynamicExcelStringListOption[];
  valueSource: DynamicExcelValueSource | null;
};

function useWorkbookValueSourceOptions(cells: EnumCellOption[]) {
  const [searchUnits] = useLazySearchPickerUnitsByCodeQuery();
  const [searchUsers] = useLazySearchPickerUsersQuery();
  const [searchPositions] = useLazySearchPickerPositionsQuery();
  const [searchUnitTypes] = useLazySearchPickerUnitTypesQuery();
  const [searchLabelEnumOptions] = useLazySearchPickerLabelEnumOptionsQuery();
  const [optionsBySource, setOptionsBySource] = React.useState<Record<string, DynamicExcelStringListOption[]>>({});

  const externalSources = React.useMemo(() => {
    const byKey = new Map<string, DynamicExcelValueSource>();
    for (const cell of cells) {
      const source = cell.valueSource;
      if (source && source.sourceType !== "FIXED_ENUM") {
        byKey.set(valueSourceOptionKey(source), source);
      }
    }
    return Array.from(byKey.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, source]) => source);
  }, [cells]);

  const loadSource = React.useCallback(
    async (source: DynamicExcelValueSource, query = "") => {
      const sourceType = source.sourceType;
      if (sourceType === "ENUM_CATALOG") {
        if (!source.catalogId) return [];
        const result = await searchLabelEnumOptions({
          catalogId: source.catalogId,
          q: query,
          page: 0,
          pageSize: 200,
        }).unwrap();
        return result.rows.map((row) => ({
          code: row.code,
          label: row.label || row.code,
        }));
      }
      if (sourceType === "SYSTEM_UNIT") {
        const result = await searchUnits({ code: query, page: 0, pageSize: 50 }).unwrap();
        return result.rows.map((row) => ({
          code: row.id,
          label: [row.fullName, row.code].filter(Boolean).join(" - "),
        }));
      }
      if (sourceType === "SYSTEM_USER") {
        const result = await searchUsers({ q: query, page: 0, pageSize: 50 }).unwrap();
        return result.rows.map((row) => ({
          code: row.id,
          label: [row.fullName, row.username].filter(Boolean).join(" - "),
        }));
      }
      if (sourceType === "SYSTEM_POSITION") {
        const result = await searchPositions({ q: query, page: 0, pageSize: 50 }).unwrap();
        return result.rows.map((row) => ({ code: row.code, label: row.name || row.code }));
      }
      if (sourceType === "SYSTEM_UNIT_TYPE") {
        const result = await searchUnitTypes({ q: query, page: 0, pageSize: 50 }).unwrap();
        return result.rows.map((row) => ({ code: row.code, label: row.name || row.code }));
      }
      return [];
    },
    [searchLabelEnumOptions, searchPositions, searchUnitTypes, searchUnits, searchUsers],
  );

  React.useEffect(() => {
    let cancelled = false;
    for (const source of externalSources) {
      const key = valueSourceOptionKey(source);
      if (optionsBySource[key]) continue;
      void loadSource(source)
        .then((options) => {
          if (cancelled) return;
          setOptionsBySource((current) => ({ ...current, [key]: options }));
        })
        .catch(() => {
          if (cancelled) return;
          setOptionsBySource((current) => ({ ...current, [key]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [externalSources, loadSource, optionsBySource]);

  const getOptions = React.useCallback(
    (cell: EnumCellOption) => {
      const source = cell.valueSource;
      const base = source && source.sourceType !== "FIXED_ENUM"
        ? optionsBySource[valueSourceOptionKey(source)] ?? []
        : cell.options;
      const selectedCodes = Array.isArray(cell.value)
        ? cell.value
        : cell.value
          ? [cell.value]
          : [];
      const seen = new Set<string>();
      const merged: DynamicExcelStringListOption[] = [];
      for (const option of base) {
        if (!option.code || seen.has(option.code)) continue;
        seen.add(option.code);
        merged.push(option);
      }
      for (const code of selectedCodes) {
        if (!code || seen.has(code)) continue;
        seen.add(code);
        merged.push({ code, label: code });
      }
      return merged;
    },
    [optionsBySource],
  );

  return { getOptions };
}

function valueSourceOptionKey(source: DynamicExcelValueSource) {
  return source.sourceType === "ENUM_CATALOG"
    ? `${source.sourceType}:${source.catalogId ?? ""}`
    : source.sourceType;
}

function getEnumCellHelperText(cell: EnumCellOption, optionCount: number) {
  if (optionCount === 0) {
    return isSystemValueSource(cell.valueSource)
      ? `Không tải được ${formatValueSourceLabel(cell.valueSource)} cho ô này.`
      : "Chưa cấu hình danh sách lựa chọn.";
  }
  if (isSystemValueSource(cell.valueSource)) {
    return `Chọn từ ${formatValueSourceLabel(cell.valueSource)}; hệ thống lưu mã để thống kê.`;
  }
  return cell.dataType === "MULTI_SELECT"
    ? "Chọn một hoặc nhiều giá trị từ danh sách đã cấu hình; hệ thống lưu mã để thống kê."
    : "Chọn một giá trị từ danh sách đã cấu hình; hệ thống lưu mã để thống kê.";
}

function formatValueSourceLabel(source?: DynamicExcelValueSource | null) {
  if (!source) return "danh sách";
  if (source.labelName) return source.labelName;
  if (source.sourceType === "ENUM_CATALOG") return source.catalogName || "danh mục cố định riêng";
  if (source.sourceType === "SYSTEM_UNIT") return "danh mục đơn vị";
  if (source.sourceType === "SYSTEM_USER") return "danh mục người dùng";
  if (source.sourceType === "SYSTEM_POSITION") return "danh mục chức vụ";
  if (source.sourceType === "SYSTEM_UNIT_TYPE") return "danh mục loại đơn vị";
  return "danh sách cố định";
}

type FortuneCellRenderInfo = {
  row: number;
  column: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

function buildEnumCellOptions(
  workbookData: Sheet[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
  spec: HeaderSpec | null | undefined,
): EnumCellOption[] {
  if (!isHeaderSpec(spec)) return [];

  const normalizedSpec = normalizeSpecDataTypeMetadata(spec);
  const isInputCell = createInputDataCellChecker(dataRect, normalizedSpec);
  const excluded = buildExcludedColumnSet(excludedDataColumns);
  const sheet = workbookData?.[0] as any;
  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : [];
  const cells: EnumCellOption[] = [];

  for (let r = dataRect.r0; r <= dataRect.r1; r += 1) {
    const row = grid[r] ?? [];
    for (let c = dataRect.c0; c <= dataRect.c1; c += 1) {
      if (excluded.has(c)) continue;
      if (!isInputCell(r, c)) continue;
      const dataType = getCellDataType(normalizedSpec, dataRect, r, c);
      if (!isDynamicExcelEnumDataType(dataType)) continue;

      const valueSource = getCellValueSource(normalizedSpec, dataRect, r, c);
      const configuredOptions = getCellStringListOptions(normalizedSpec, dataRect, r, c);
      const options = valueSource?.sourceType === "FIXED_ENUM" && valueSource.options?.length
        ? valueSource.options
        : configuredOptions;
      const raw = isSystemValueSource(valueSource)
        ? getWorkbookCellStoredValueText(row[c])
        : getWorkbookCellText(row[c]);
      const value = dataType === "MULTI_SELECT"
        ? isSystemValueSource(valueSource)
          ? splitEnumCellText(raw)
          : resolveStringListOptions(raw, options).map((option) => option.code)
        : isSystemValueSource(valueSource)
          ? raw
          : resolveStringListOption(raw, options)?.code ?? "";
      cells.push({
        r,
        c,
        cellRef: toExcelRef(r, c),
        dataType,
        value,
        options,
        valueSource,
      });
    }
  }

  return cells;
}

function setWorkbookEnumCell(
  workbookData: Sheet[],
  r: number,
  c: number,
  options: DynamicExcelStringListOption[],
  dataType: DynamicExcelDataType,
  value: unknown,
): Sheet[] {
  const next = cloneDeepJson(workbookData) as Sheet[];
  const sheet = next[0] as any;
  if (!sheet) return next;

  if (!Array.isArray(sheet.data)) sheet.data = [];
  if (!Array.isArray(sheet.data[r])) sheet.data[r] = [];

  const selected = resolveSelectedEnumOptions(options, dataType, value);
  const codeText = selected.map((option) => option.code).join("; ");
  const labelText = selected.map((option) => option.label || option.code).join("; ");
  const nextCell = selected.length > 0
    ? {
        ...(sheet.data[r][c] && typeof sheet.data[r][c] === "object" ? sheet.data[r][c] : {}),
        v: codeText,
        m: labelText,
      }
    : null;

  sheet.data[r][c] = nextCell;
  sheet.celldata = upsertCelldataCell(sheet.celldata, r, c, nextCell);
  return next;
}

function renderMultiSelectChipsCell(
  cell: any,
  cellInfo: FortuneCellRenderInfo,
  renderCtx: CanvasRenderingContext2D,
  dataRect: ReportRect,
  excludedColumns: ReadonlySet<number>,
  spec: HeaderSpec | null,
  isInputCell: ((r: number, c: number) => boolean) | null,
) {
  if (!spec || !isInputCell) return true;

  const r = Number(cellInfo.row);
  const c = Number(cellInfo.column);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return true;
  if (r < dataRect.r0 || r > dataRect.r1 || c < dataRect.c0 || c > dataRect.c1) return true;
  if (excludedColumns.has(c)) return true;

  if (!isInputCell(r, c)) return true;
  if (getCellDataType(spec, dataRect, r, c) !== "MULTI_SELECT") return true;

  const options = getCellStringListOptions(spec, dataRect, r, c);
  const selected = resolveStringListOptions(getWorkbookCellText(cell), options);
  if (selected.length === 0) return true;

  drawMultiSelectChips(renderCtx, cellInfo, cell, selected);
  return false;
}

function drawMultiSelectChips(
  ctx: CanvasRenderingContext2D,
  cellInfo: FortuneCellRenderInfo,
  cell: any,
  selected: DynamicExcelStringListOption[],
) {
  const x = Math.min(cellInfo.startX, cellInfo.endX);
  const y = Math.min(cellInfo.startY, cellInfo.endY);
  const width = Math.abs(cellInfo.endX - cellInfo.startX);
  const height = Math.abs(cellInfo.endY - cellInfo.startY);
  if (width <= 0 || height <= 0) return;

  const background = typeof cell?.bg === "string" && cell.bg.trim() ? cell.bg : "#fff";
  const contentX = x + 4;
  const contentY = y + 2;
  const contentRight = x + width - 4;
  const chipHeight = Math.max(14, Math.min(20, height - 5));
  const chipY = y + Math.max(2, (height - chipHeight) / 2);
  const fontSize = Math.max(10, Math.min(12, chipHeight - 7));
  const colors = ["#e3f2fd", "#e8f5e9", "#fff3e0", "#f3e5f5", "#e0f2f1"];

  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + width - 0.5, y);
  ctx.lineTo(x + width - 0.5, y + height);
  ctx.moveTo(x, y + height - 0.5);
  ctx.lineTo(x + width, y + height - 0.5);
  ctx.stroke();
  ctx.closePath();

  ctx.beginPath();
  ctx.rect(contentX, contentY, Math.max(0, contentRight - contentX), Math.max(0, height - 4));
  ctx.clip();
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = "middle";

  let cursorX = contentX;
  let hidden = 0;
  for (let index = 0; index < selected.length; index += 1) {
    const option = selected[index];
    const label = option.label || option.code;
    const textWidth = ctx.measureText(label).width;
    const chipWidth = Math.ceil(textWidth + 14);
    const remaining = contentRight - cursorX;

    if (remaining < 22) {
      hidden = selected.length - index;
      break;
    }

    if (chipWidth > remaining) {
      if (index === 0) {
        const fittedLabel = fitCanvasText(ctx, label, Math.max(8, remaining - 14));
        drawCanvasChip(ctx, cursorX, chipY, remaining, chipHeight, fittedLabel, colors[index % colors.length]);
        hidden = selected.length - 1;
      } else {
        hidden = selected.length - index;
      }
      break;
    }

    drawCanvasChip(ctx, cursorX, chipY, chipWidth, chipHeight, label, colors[index % colors.length]);
    cursorX += chipWidth + 4;
  }

  if (hidden > 0 && contentRight - cursorX >= 26) {
    const label = `+${hidden}`;
    const chipWidth = Math.min(contentRight - cursorX, Math.ceil(ctx.measureText(label).width + 14));
    drawCanvasChip(ctx, cursorX, chipY, chipWidth, chipHeight, label, "#eceff1");
  }

  ctx.restore();
}

function drawCanvasChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  fill: string,
) {
  const radius = Math.min(8, height / 2);
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.14)";
  ctx.lineWidth = 1;
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1f2933";
  ctx.fillText(label, x + 7, y + height / 2);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const suffix = "...";
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}${suffix}`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}${suffix}`;
}

function resolveSelectedEnumOptions(
  options: DynamicExcelStringListOption[],
  dataType: DynamicExcelDataType,
  value: unknown,
) {
  const rawCodes = dataType === "MULTI_SELECT"
    ? Array.isArray(value) ? value.map(String) : String(value ?? "").split(";")
    : [String(value ?? "")];
  const wanted = rawCodes.map((item) => item.trim()).filter(Boolean);
  const seen = new Set<string>();
  const selected: DynamicExcelStringListOption[] = [];

  for (const code of wanted) {
    const option = options.find((item) => item.code === code);
    if (!option) continue;

    const key = option.code.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(option);
  }

  return selected;
}

function upsertCelldataCell(celldata: unknown, r: number, c: number, cell: unknown) {
  const rows = Array.isArray(celldata) ? cloneDeepJson(celldata) as any[] : [];
  const index = rows.findIndex((item) => Number(item?.r) === r && Number(item?.c) === c);
  if (cell == null) {
    return index >= 0 ? rows.filter((_item, itemIndex) => itemIndex !== index) : rows;
  }

  const nextItem = { r, c, v: cell };
  if (index >= 0) rows[index] = nextItem;
  else rows.push(nextItem);
  return rows;
}

function resolveStringListOption(
  raw: string,
  options: DynamicExcelStringListOption[],
): DynamicExcelStringListOption | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  return options.find((option) =>
    option.code.trim().toLowerCase() === normalized ||
    option.label.trim().toLowerCase() === normalized
  ) ?? null;
}

function resolveStringListOptions(
  raw: string,
  options: DynamicExcelStringListOption[],
): DynamicExcelStringListOption[] {
  const seen = new Set<string>();
  const resolved: DynamicExcelStringListOption[] = [];
  for (const item of splitEnumCellText(raw)) {
    const option = resolveStringListOption(item, options);
    if (!option) continue;

    const key = option.code.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(option);
  }
  return resolved;
}

function splitEnumCellText(raw: string) {
  return raw
    .split(/[;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getWorkbookCellText(cell: any): string {
  const pick = (value: unknown) => (value == null ? "" : String(value));
  if (cell == null) return "";
  if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") {
    return pick(cell).trim();
  }
  if (cell.m != null) return pick(cell.m).trim();
  if (cell.v != null) return pick(cell.v).trim();
  if (cell.ct?.s != null) return pick(cell.ct.s).trim();
  return "";
}

function getWorkbookCellStoredValueText(cell: any): string {
  const pick = (value: unknown) => (value == null ? "" : String(value));
  if (cell == null) return "";
  if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") {
    return pick(cell).trim();
  }
  if (cell.v != null) return pick(cell.v).trim();
  if (cell.m != null) return pick(cell.m).trim();
  if (cell.ct?.s != null) return pick(cell.ct.s).trim();
  return "";
}

function toExcelRef(r: number, c: number) {
  return `${toExcelColumn(c)}${r + 1}`;
}

function toExcelColumn(c: number) {
  let text = "";
  let n = Math.max(0, Math.floor(c)) + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    text = String.fromCharCode(65 + mod) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text;
}

function buildWorkbookSavePayload(
  workbookData: Sheet[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
  spec: HeaderSpec | null | undefined,
): WorkbookDataGridSavePayload | null {
  const normalized = normalizeRuntimeWorkbookForGrid(workbookData, dataRect, spec);
  const sheet = normalized?.[0];
  if (!sheet) return null;
  const extracted = extractTypedValues1D(sheet, dataRect, spec, { excludedDataColumns });
  stripEmptyNumberInputCellMetadata(normalized, dataRect, spec);

  return {
    rawWorkbookData: normalized,
    values1D: extracted.values1D,
    valuesHash: extracted.valuesHash,
    cellRefs: extracted.cellRefs,
    validationIssues: extracted.issues,
  };
}

function sanitizeRuntimeWorkbookData(
  editedWorkbookData: Sheet[],
  baselineWorkbookData: Sheet[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
  spec: HeaderSpec | null | undefined,
  previewBackup: Map<string, Backup>,
  previewHighlights: WorkbookPreviewHighlight[],
) {
  const normalized = normalizeRuntimeWorkbookForGrid(editedWorkbookData, dataRect, spec);
  const sheet = normalized[0] as any;
  if (!sheet) return normalized;

  stripMarksForSave(sheet, previewBackup, buildPreviewMarkedBackgrounds(previewHighlights));
  return restoreNonInputCells(normalized, baselineWorkbookData, dataRect, excludedDataColumns, spec);
}

function restoreNonInputCells(
  editedWorkbookData: Sheet[],
  baselineWorkbookData: Sheet[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
  spec: HeaderSpec | null | undefined,
) {
  const edited = normalizeRuntimeWorkbookForGrid(editedWorkbookData, dataRect, spec);
  const baseline = normalizeRuntimeWorkbookForGrid(baselineWorkbookData, dataRect, spec);
  const editedSheet = edited[0] as any;
  const baselineSheet = baseline[0] as any;
  if (!editedSheet || !baselineSheet) return edited;

  const editedConfig = cloneDeepJson(editedSheet.config ?? {});
  const rows = Math.max(getWorkbookRowCount(edited), getWorkbookRowCount(baseline));
  const cols = Math.max(getWorkbookColumnCount(edited), getWorkbookColumnCount(baseline));
  const excluded = buildExcludedColumnSet(excludedDataColumns);
  const normalizedSpec = isHeaderSpec(spec) ? normalizeSpecDataTypeMetadata(spec) : null;
  const isInputCell = normalizedSpec ? createInputDataCellChecker(dataRect, normalizedSpec) : null;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const isEditableCell =
        r >= dataRect.r0 &&
        r <= dataRect.r1 &&
        c >= dataRect.c0 &&
        c <= dataRect.c1 &&
        !excluded.has(c) &&
        (!isInputCell || isInputCell(r, c));

      if (isEditableCell) continue;
      setWorkbookCell(
        editedSheet,
        r,
        c,
        restoreRuntimeNonInputCell(getWorkbookCell(baselineSheet, r, c), getWorkbookCell(editedSheet, r, c)),
      );
    }
  }

  editedSheet.config = restoreBaselineConfigWithRuntimeLayout(baselineSheet.config, editedConfig);
  editedSheet.row = baselineSheet.row ?? editedSheet.row;
  editedSheet.column = baselineSheet.column ?? editedSheet.column;
  editedSheet.name = baselineSheet.name ?? editedSheet.name;
  editedSheet.id = baselineSheet.id ?? editedSheet.id;
  editedSheet.index = baselineSheet.index ?? editedSheet.index;
  return edited;
}

function restoreBaselineConfigWithRuntimeLayout(baselineConfig: unknown, editedConfig: unknown) {
  const next = cloneDeepJson(isPlainRecord(baselineConfig) ? baselineConfig : {});
  if (!isPlainRecord(editedConfig)) return next;

  for (const key of ["rowlen", "columnlen", "customHeight", "customWidth"] as const) {
    const value = editedConfig[key];
    if (isPlainRecord(value)) next[key] = cloneDeepJson(value);
  }

  return next;
}

function isPlainRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function restoreRuntimeNonInputCell(baselineCell: unknown, editedCell: unknown) {
  if (
    isFormulaCell(baselineCell) &&
    isFormulaCell(editedCell) &&
    String(baselineCell.f) === String(editedCell.f)
  ) {
    const next = cloneDeepJson(baselineCell) as any;
    const edited = editedCell as any;
    if ("v" in edited) next.v = cloneDeepJson(edited.v);
    if ("m" in edited) next.m = cloneDeepJson(edited.m);
    if ("ct" in edited) next.ct = cloneDeepJson(edited.ct);
    return next;
  }

  return cloneDeepJson(baselineCell ?? null);
}

function isFormulaCell(cell: unknown): cell is { f: unknown; v?: unknown; m?: unknown; ct?: unknown } {
  return Boolean(cell && typeof cell === "object" && typeof (cell as any).f === "string" && (cell as any).f.trim());
}

function getWorkbookCell(sheet: any, r: number, c: number) {
  const row = Array.isArray(sheet?.data) ? sheet.data[r] : null;
  if (Array.isArray(row) && row[c] != null) return row[c];
  const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  return celldata.find((item: any) => Number(item?.r) === r && Number(item?.c) === c)?.v ?? null;
}

function setWorkbookCell(sheet: any, r: number, c: number, cell: unknown) {
  if (!Array.isArray(sheet.data)) sheet.data = [];
  if (!Array.isArray(sheet.data[r])) sheet.data[r] = [];
  sheet.data[r][c] = cell ?? null;
  sheet.celldata = upsertCelldataCell(sheet.celldata, r, c, cell ?? null);
}

function buildExcludedColumnSet(excludedDataColumns: number[]) {
  return new Set(
    excludedDataColumns
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0),
  );
}

function normalizeWorkbookForGrid(workbookData: Sheet[] | undefined | null, dataRect: ReportRect) {
  const rows = Math.max(
    1,
    getWorkbookRowCount(workbookData),
    Number(dataRect?.r1 ?? -1) + 1,
  );
  const cols = Math.max(
    1,
    getWorkbookColumnCount(workbookData),
    Number(dataRect?.c1 ?? -1) + 1,
  );

  return stripWorkbookZoom(cloneDeepJson(ensureWorkbookShape(workbookData ?? [], rows, cols)) as Sheet[]);
}

function normalizeRuntimeWorkbookForGrid(
  workbookData: Sheet[] | undefined | null,
  dataRect: ReportRect,
  spec: HeaderSpec | null | undefined,
) {
  const normalized = normalizeWorkbookForGrid(workbookData, dataRect);
  normalizeWorkbookNumberInputCells(normalized, dataRect, spec);
  recalculateSimpleNumericFormulas(normalized);
  return normalized as Sheet[];
}

function normalizeWorkbookForGridMode(
  workbookData: Sheet[] | undefined | null,
  dataRect: ReportRect,
  spec: HeaderSpec | null | undefined,
  useRuntimeWorkbook: boolean,
) {
  return useRuntimeWorkbook
    ? normalizeRuntimeWorkbookForGrid(workbookData, dataRect, spec)
    : normalizeWorkbookForGrid(workbookData, dataRect);
}

function withWorkbookZoom(workbookData: Sheet[], zoomRatio: number) {
  return workbookData.map((sheet) =>
    sheet && typeof sheet === "object"
      ? { ...sheet, zoomRatio }
      : sheet,
  );
}

function stripWorkbookZoom(workbookData: Sheet[]) {
  return workbookData.map((sheet) => {
    if (!sheet || typeof sheet !== "object") return sheet;
    const { zoomRatio: _zoomRatio, ...rest } = sheet as any;
    return rest as Sheet;
  });
}

function getWorkbookRowCount(workbookData: Sheet[] | undefined | null) {
  const sheet: any = Array.isArray(workbookData) ? workbookData[0] : null;
  const fromRow = typeof sheet?.row === "number" ? sheet.row : 0;
  const fromData = Array.isArray(sheet?.data) ? sheet.data.length : 0;
  const fromCelldata = Array.isArray(sheet?.celldata)
    ? Math.max(
        0,
        ...sheet.celldata.map((item: any) => (typeof item?.r === "number" ? item.r + 1 : 0)),
      )
    : 0;

  return Math.max(fromRow, fromData, fromCelldata, 0);
}

function getWorkbookColumnCount(workbookData: Sheet[] | undefined | null) {
  const sheet: any = Array.isArray(workbookData) ? workbookData[0] : null;
  const fromColumn = typeof sheet?.column === "number" ? sheet.column : 0;
  const fromData = Array.isArray(sheet?.data)
    ? Math.max(0, ...sheet.data.map((row: any) => (Array.isArray(row) ? row.length : 0)))
    : 0;
  const fromCelldata = Array.isArray(sheet?.celldata)
    ? Math.max(
        0,
        ...sheet.celldata.map((item: any) => (typeof item?.c === "number" ? item.c + 1 : 0)),
      )
    : 0;

  return Math.max(fromColumn, fromData, fromCelldata, 0);
}

function buildGridWorkbook(
  workbookData: Sheet[] | undefined | null,
  dataRect: ReportRect,
  spec: unknown,
  markPreview: boolean,
  previewHighlights: WorkbookPreviewHighlight[],
  options?: {
    assumeNormalized?: boolean;
    useRuntimeWorkbook?: boolean;
  },
) {
  const normalized =
    options?.assumeNormalized && Array.isArray(workbookData)
      ? workbookData
      : normalizeWorkbookForGridMode(
          workbookData,
          dataRect,
          isHeaderSpec(spec) ? spec : null,
          options?.useRuntimeWorkbook ?? true,
        );
  if (!markPreview) {
    return { workbookData: normalized, previewBackup: new Map<string, Backup>() };
  }
  return markPreviewRegions(normalized, spec, dataRect, previewHighlights);
}

function markPreviewRegions(
  workbookData: Sheet[],
  spec: unknown,
  dataRect: ReportRect,
  previewHighlights: WorkbookPreviewHighlight[],
) {
  const cloned = cloneDeepJson(workbookData) as Sheet[];
  const sheet = cloned[0] as any;
  const backup = new Map<string, Backup>();
  if (!sheet) return { workbookData: cloned, previewBackup: backup };

  const headerRects = getHeaderRects(spec);
  for (const rect of headerRects) {
    markRect(sheet, toMarkRect(rect), MARK_COLORS.HEADER_BG, backup);
  }
  markRect(sheet, toMarkRect(dataRect), MARK_COLORS.DATA_BG, backup);
  if (isHeaderSpec(spec)) {
    markIgnoredCells(sheet, spec, dataRect, backup);
    for (const range of getSpecialRanges(spec)) {
      markRect(sheet, toMarkRect(range), SPECIAL_RANGE_COLORS[range.role], backup);
    }
  }
  for (const highlight of previewHighlights) {
    markRect(sheet, toMarkRect(highlight.rect), highlight.color, backup);
  }

  return { workbookData: cloned, previewBackup: backup };
}

function markIgnoredCells(
  sheet: any,
  spec: HeaderSpec,
  dataRect: ReportRect,
  backup: Map<string, Backup>,
) {
  const normalizedSpec = normalizeSpecDataTypeMetadata(spec);
  const isInputCell = createInputDataCellChecker(dataRect, normalizedSpec);
  for (let r = dataRect.r0; r <= dataRect.r1; r += 1) {
    for (let c = dataRect.c0; c <= dataRect.c1; c += 1) {
      if (!isInputCell(r, c)) continue;
      if (getCellDataType(normalizedSpec, dataRect, r, c) !== "IGNORE") continue;
      markRect(sheet, { r0: r, c0: c, r1: r, c1: c }, DATA_TYPE_COLORS.IGNORE, backup);
    }
  }
}

function buildPreviewMarkedBackgrounds(previewHighlights: WorkbookPreviewHighlight[]) {
  return new Set<string>([
    MARK_COLORS.HEADER_BG,
    MARK_COLORS.DATA_BG,
    MARK_COLORS.ACTIVE_BG,
    MARK_COLORS.RANGE_BG,
    MARK_COLORS.LOCK_BG,
    ...Object.values(SPECIAL_RANGE_COLORS),
    ...Object.values(DATA_TYPE_COLORS),
    ...previewHighlights.map((highlight) => highlight.color),
  ]);
}

function getHeaderRects(spec: unknown): RegionRect[] {
  if (!isHeaderSpec(spec)) return [];
  try {
    const table = getTableRect(spec);
    const regions = computeRegions(spec, table);
    return (regions as any).headerRects?.length
      ? ((regions as any).headerRects as RegionRect[])
      : [regions.headerRect];
  } catch {
    return [];
  }
}

function isHeaderSpec(spec: unknown): spec is HeaderSpec {
  const kind = (spec as { kind?: unknown } | null)?.kind;
  return kind === "TOP" || kind === "LEFT" || kind === "MATRIX";
}

function toMarkRect(rect: ReportRect): MarkRect {
  return { r0: rect.r0, c0: rect.c0, r1: rect.r1, c1: rect.c1 };
}
