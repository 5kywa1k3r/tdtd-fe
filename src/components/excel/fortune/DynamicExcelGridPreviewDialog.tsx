import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { Sheet } from "@fortune-sheet/core";

import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import { getTableRect } from "./regions";
import { ensureWorkbookShape } from "./reportWorkbook";
import LazyFortuneWorkbook from "./LazyFortuneWorkbook";
import { useFortuneWheelScrollFix } from "./wheelScroll";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  open: boolean;
  dynamicExcelId?: string | null;
  onClose: () => void;
};

const PREVIEW_WORKBOOK_ZOOM_RATIO = 0.5;

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function DynamicExcelGridPreviewDialog({
  open,
  dynamicExcelId,
  onClose,
}: Props) {
  const sheetWheelRef = useFortuneWheelScrollFix<HTMLDivElement>();
  const { data, isLoading, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId ?? "" },
    { skip: !open || !dynamicExcelId }
  );

  const parsed = React.useMemo(() => {
    if (!data) return null;

    const spec = safeParseJson<any>(data.specJson, null);
    const workbook = safeParseJson<Sheet[]>(data.rawWorkbookDataJson, []);
    if (!spec) return null;

    const tableRect = getTableRect(spec);
    const totalRows = tableRect.r1 - tableRect.r0 + 1;
    const totalCols = tableRect.c1 - tableRect.c0 + 1;

    const normalized = ensureWorkbookShape(workbook, totalRows, totalCols) as Sheet[];

    return {
      spec,
      workbook: normalized,
      code: data.code,
      name: data.name,
    };
  }, [data]);

  const [renderKey, setRenderKey] = React.useState(0);
  const [shouldRenderWorkbook, setShouldRenderWorkbook] = React.useState(false);

  React.useEffect(() => {
    if (!open || !parsed) {
      setShouldRenderWorkbook(false);
      return;
    }

    const id = window.requestAnimationFrame(() => {
      setRenderKey((x) => x + 1);
      setShouldRenderWorkbook(true);
    });

    return () => window.cancelAnimationFrame(id);
  }, [open, parsed]);

  const settings = React.useMemo(() => {
    return {
      data: withWorkbookZoom((parsed?.workbook ?? []) as Sheet[], PREVIEW_WORKBOOK_ZOOM_RATIO),
      row: parsed?.workbook?.[0]?.row,
      column: parsed?.workbook?.[0]?.column,
      allowEdit: false,
      showSheetTabs: false,
      onChange: () => {},
    };
  }, [parsed]);

  const handleClose = React.useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") {
      active.blur();
    }

    setShouldRenderWorkbook(false);

    window.setTimeout(() => {
      onClose();
    }, 0);
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      keepMounted={false}
      disableRestoreFocus
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700}>
            Xem trước biểu mẫu
          </Typography>
          {parsed && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {parsed.code} — {parsed.name}
            </Typography>
          )}
        </Box>

        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Stack sx={{ height: 640 }} alignItems="center" justifyContent="center">
            <CircularProgress size={28} />
          </Stack>
        ) : isError || !parsed ? (
          <Alert severity="error">{uiText(UITextKey.TextKhongTaiDuocBieuMauDeXemTruoc)}</Alert>
        ) : !shouldRenderWorkbook ? (
          <Stack sx={{ height: 640 }} alignItems="center" justifyContent="center">
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Box
            ref={sheetWheelRef}
            className="tdtdSheet"
            sx={{
              height: 640,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 2,
              overflow: "hidden",
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
            <LazyFortuneWorkbook
              key={renderKey}
              {...settings}
              fallback={(
                <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
                  <CircularProgress size={28} />
                </Stack>
              )}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function withWorkbookZoom(workbookData: Sheet[], zoomRatio: number) {
  return workbookData.map((sheet) =>
    sheet && typeof sheet === "object"
      ? { ...sheet, zoomRatio }
      : sheet,
  );
}
