// src/components/excel/fortune/ExcelReportEditor.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { Workbook } from "@fortune-sheet/react";

import { getTableRect } from "./regions";
import { extractNumericValues1D } from "./fortuneAdapter";
import {
  cloneDeepJson,
  ensureWorkbookShape,
  restoreOutsideDataRect,
  type ReportRect,
} from "./reportWorkbook";

type ExcelReportEditorMode = "edit" | "view";

export interface ExcelReportEditorProps {
  mode?: ExcelReportEditorMode;
  templateName?: string;
  templateCode?: string;
  periodKey?: string;
  statusLabel?: string;

  initialSpec: any;
  initialWorkbookData: any[];

  dataRect: ReportRect;

  note?: string;
  readOnly?: boolean;
  saving?: boolean;

  onBack?: () => void;
  onSaved?: (payload: {
    rawWorkbookData: any[];
    values1D: Array<number | null>;
    note?: string;
  }) => void;
}

export default function ExcelReportEditor(props: ExcelReportEditorProps) {
  const {
    mode = "edit",
    templateName,
    templateCode,
    periodKey,
    statusLabel,
    initialSpec,
    initialWorkbookData,
    dataRect,
    note,
    readOnly = false,
    saving = false,
    onBack,
    onSaved,
  } = props;

  const isView = mode === "view" || readOnly;

  const [localNote, setLocalNote] = useState(note ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

  const tableRect = useMemo(() => getTableRect(initialSpec), [initialSpec]);
  const totalRows = tableRect.r1 - tableRect.r0 + 1;
  const totalCols = tableRect.c1 - tableRect.c0 + 1;

  const [workbookData, setWorkbookData] = useState<any[]>(() =>
    ensureWorkbookShape(initialWorkbookData ?? [], totalRows, totalCols)
  );
  const workbookRef = useRef<any[]>(workbookData);
  const originalWorkbookRef = useRef<any[]>(
    ensureWorkbookShape(initialWorkbookData ?? [], totalRows, totalCols)
  );
  const [workbookKey, setWorkbookKey] = useState(0);

  useEffect(() => {
    const normalized = ensureWorkbookShape(initialWorkbookData ?? [], totalRows, totalCols);
    setWorkbookData(normalized);
    workbookRef.current = normalized;
    originalWorkbookRef.current = cloneDeepJson(normalized);
    setLocalNote(note ?? "");
    setWorkbookKey((x) => x + 1);
  }, [initialWorkbookData, totalRows, totalCols, note]);

  const settings = useMemo(() => {
    return {
      data: workbookData,
      onChange: (data: any) => {
        if (isView) return;
        if (Array.isArray(data)) {
          workbookRef.current = data;
        }
      },
    };
  }, [workbookData, isView]);

  const handleSave = () => {
    try {
      setSaveError(null);

      const latestRaw = workbookRef.current?.length
        ? workbookRef.current
        : workbookData;

      const normalizedLatest = ensureWorkbookShape(latestRaw, totalRows, totalCols);

      const safeWorkbook = restoreOutsideDataRect(
        normalizedLatest,
        originalWorkbookRef.current,
        totalRows,
        totalCols,
        dataRect
      );

      const sheet = safeWorkbook?.[0];
      if (!sheet) {
        setSaveError("Không lấy được dữ liệu sheet để lưu.");
        return;
      }

      const values1D = extractNumericValues1D(sheet, dataRect);

      onSaved?.({
        rawWorkbookData: safeWorkbook,
        values1D,
        note: localNote.trim() || undefined,
      });
    } catch (error: any) {
      setSaveError(error?.message || "Lỗi khi chuẩn bị dữ liệu lưu draft.");
    }
  };

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6">{templateName || "Biểu mẫu báo cáo"}</Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Mã biểu mẫu: {templateCode || "-"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kỳ báo cáo: {periodKey || "-"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Trạng thái: {statusLabel || "-"}
              </Typography>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Chỉ dữ liệu trong vùng nhập liệu mới được giữ khi lưu. Các vùng ngoài dataRect sẽ được khôi phục theo template snapshot.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {saveError && <Alert severity="error">{saveError}</Alert>}

      <Card
        variant="outlined"
        sx={{ flex: 1, minHeight: 620, display: "flex", flexDirection: "column" }}
      >
        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
          <Box
            className="tdtdSheet"
            sx={{
              flex: 1,
              minHeight: 0,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 2,
              overflow: "hidden",
              "& .luckysheet-bottom-controll-row": { display: "none !important" },
              "& .fortune-sheettab-button": { display: "none !important" },
              "& .fortune-sheettab-container-c": { display: "none !important" },
            }}
          >
            <Workbook key={workbookKey} {...settings} />
          </Box>

          <TextField
            label="Ghi chú"
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            disabled={isView}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Button variant="outlined" onClick={onBack}>
              Quay lại
            </Button>

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isView || saving}
            >
              Lưu draft
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}