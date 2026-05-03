import React from "react";
import { Alert, Box, Button, Card, CardContent, Stack } from "@mui/material";
import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import type { Sheet } from "@fortune-sheet/core";

import { extractNumericValues1D } from "./fortuneAdapter";
import { cloneDeepJson, type ReportRect } from "./reportWorkbook";

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
  onChangeRaw?: (workbookData: Sheet[]) => void;
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
    () => cloneDeepJson(initialWorkbookData ?? []) as Sheet[]
  );

  const workbookRef = React.useRef<Sheet[]>(workbookData);
  const [workbookKey, setWorkbookKey] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const cloned = (cloneDeepJson(initialWorkbookData ?? []) as Sheet[]) || [];
    setWorkbookData(cloned);
    workbookRef.current = cloned;
    setWorkbookKey((x) => x + 1);
    setError(null);
  }, [initialWorkbookData]);

  const settings = React.useMemo(() => {
    return {
      data: workbookData as Sheet[],
      onChange: (data: any) => {
        if (isView) return;
        if (Array.isArray(data)) {
          workbookRef.current = data as Sheet[];
          setWorkbookData(data as Sheet[]);
          onChangeRaw?.(data as Sheet[]);
        }
      },
    };
  }, [workbookData, isView, onChangeRaw]);

  const handleSave = React.useCallback(() => {
    try {
      setError(null);

      const latestRaw =
        Array.isArray(workbookRef.current) && workbookRef.current.length > 0
          ? workbookRef.current
          : workbookData;

      const sheet = latestRaw?.[0];
      if (!sheet) {
        throw new Error("Không lấy được dữ liệu sheet để lưu.");
      }

      const values1D = applyExcludedDataColumns(
        extractNumericValues1D(sheet, dataRect),
        dataRect,
        excludedDataColumns,
      );

      onSave?.({
        rawWorkbookData: latestRaw,
        values1D,
      });
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
