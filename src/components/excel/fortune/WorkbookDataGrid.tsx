import React from "react";
import { Alert, Box, Button, Card, CardContent, Stack } from "@mui/material";
import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import type { Sheet } from "@fortune-sheet/core";

import { extractNumericValues1D } from "./fortuneAdapter";
import { cloneDeepJson, ensureWorkbookShape, type ReportRect } from "./reportWorkbook";

export type WorkbookDataGridMode = "edit" | "view";

export interface WorkbookDataGridSavePayload {
  rawWorkbookData: Sheet[];
  values1D: Array<number | null>;
}

export interface WorkbookDataGridProps {
  initialSpec: any;
  initialWorkbookData: Sheet[];
  dataRect: ReportRect;

  mode?: WorkbookDataGridMode;
  readOnly?: boolean;
  saving?: boolean;

  showActions?: boolean;
  saveLabel?: string;
  backLabel?: string;
  excludedDataColumns?: number[];

  onBack?: () => void;
  onChangeRaw?: (workbookData: Sheet[], payload?: WorkbookDataGridSavePayload) => void;
  onSave?: (payload: WorkbookDataGridSavePayload) => void;
}

export default function WorkbookDataGrid(props: WorkbookDataGridProps) {
  const {
    initialWorkbookData,
    dataRect,

    mode = "edit",
    readOnly = false,
    saving = false,

    showActions = true,
    saveLabel = "Lưu draft",
    backLabel = "Quay lại",

    excludedDataColumns = [],

    onBack,
    onChangeRaw,
    onSave,
  } = props;

  const isView = mode === "view" || readOnly;

  const [workbookData, setWorkbookData] = React.useState<Sheet[]>(
    () => normalizeWorkbookForGrid(initialWorkbookData, dataRect)
  );

  const workbookRef = React.useRef<Sheet[]>(workbookData);
  const [workbookKey, setWorkbookKey] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const cloned = normalizeWorkbookForGrid(initialWorkbookData, dataRect);
    setWorkbookData(cloned);
    workbookRef.current = cloned;
    setWorkbookKey((x) => x + 1);
    setError(null);
  }, [initialWorkbookData, dataRect]);

  const settings = React.useMemo(() => {
    return {
      data: workbookData as Sheet[],
      onChange: (data: any) => {
        if (isView) return;
        if (Array.isArray(data)) {
          const nextWorkbookData = data as Sheet[];
          workbookRef.current = nextWorkbookData;
          setWorkbookData(nextWorkbookData);
          onChangeRaw?.(
            nextWorkbookData,
            buildWorkbookSavePayload(nextWorkbookData, dataRect, excludedDataColumns) ?? undefined,
          );
        }
      },
    };
  }, [workbookData, dataRect, excludedDataColumns, isView, onChangeRaw]);

  const handleSave = React.useCallback(() => {
    try {
      setError(null);

      const latestRaw =
        Array.isArray(workbookRef.current) && workbookRef.current.length > 0
          ? workbookRef.current
          : workbookData;

      const payload = buildWorkbookSavePayload(latestRaw, dataRect, excludedDataColumns);
      if (!payload) {
        throw new Error("Không lấy được dữ liệu sheet để lưu.");
      }

      onSave?.(payload);
    } catch (e: any) {
      setError(e?.message || "Không thể chuẩn bị dữ liệu để lưu.");
    }
  }, [workbookData, dataRect, excludedDataColumns, onSave]);

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <Card
        variant="outlined"
        sx={{ flex: 1, minHeight: 350, display: "flex", flexDirection: "column" }}
      >
        <CardContent
          sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}
        >
          <Box
            className="tdtdSheet"
            sx={{
              width: "100%",
              height: 350,
              minHeight: 350,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 2,
              "& .luckysheet-bottom-controll-row": {
                display: "none !important",
              },
              "& .fortune-sheettab-button": {
                display: "none !important",
              },
            }}
          >
            <Workbook key={workbookKey} {...settings} />
          </Box>

          {showActions && (
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Button variant="outlined" onClick={onBack}>
                {backLabel}
              </Button>

              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isView || saving}
              >
                {saveLabel}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

function buildWorkbookSavePayload(
  workbookData: Sheet[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
): WorkbookDataGridSavePayload | null {
  const normalized = normalizeWorkbookForGrid(workbookData, dataRect);
  const sheet = normalized?.[0];
  if (!sheet) return null;

  return {
    rawWorkbookData: normalized,
    values1D: applyExcludedDataColumns(
      extractNumericValues1D(sheet, dataRect),
      dataRect,
      excludedDataColumns,
    ),
  };
}

function applyExcludedDataColumns(
  values1D: Array<number | null>,
  dataRect: ReportRect,
  excludedDataColumns: number[],
) {
  if (!excludedDataColumns.length || values1D.length === 0) return values1D;

  const excluded = new Set(
    excludedDataColumns
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0),
  );
  if (excluded.size === 0) return values1D;

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return values1D;

  const next = values1D.slice();
  for (let rr = 0; rr < height; rr++) {
    for (let cc = 0; cc < width; cc++) {
      const absoluteCol = dataRect.c0 + cc;
      if (excluded.has(absoluteCol)) {
        next[rr * width + cc] = null;
      }
    }
  }

  return next;
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

  return cloneDeepJson(ensureWorkbookShape(workbookData ?? [], rows, cols)) as Sheet[];
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
