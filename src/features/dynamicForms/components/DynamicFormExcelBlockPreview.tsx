import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";

import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import WorkbookDataGrid from "../../../components/excel/fortune/WorkbookDataGrid";
import { getTableRect } from "../../../components/excel/fortune/regions";
import type { ReportRect } from "../../../components/excel/fortune/reportWorkbook";
import { tableModeLabels } from "../dynamicFormSchema";

type DynamicFormExcelBlockPreviewProps = {
  blockJson: string;
  title?: string;
  dense?: boolean;
  showHeader?: boolean;
  tableMode?: keyof typeof tableModeLabels | null;
  loadOnMount?: boolean;
};

type ExcelBlockSummary = {
  dynamicExcelId: string | null;
  title: string | null;
  dataRect: ReportRect | null;
};

export default function DynamicFormExcelBlockPreview({
  blockJson,
  title,
  dense = false,
  showHeader = true,
  tableMode,
  loadOnMount = false,
}: DynamicFormExcelBlockPreviewProps) {
  const summary = React.useMemo(() => readExcelBlockSummary(blockJson), [blockJson]);
  const dynamicExcelId = summary.dynamicExcelId ?? "";
  const [previewRequested, setPreviewRequested] = React.useState(loadOnMount);

  React.useEffect(() => {
    setPreviewRequested(loadOnMount);
  }, [dynamicExcelId, loadOnMount]);

  const { data, isLoading, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId },
    { skip: !dynamicExcelId || !previewRequested },
  );

  const parsed = React.useMemo(() => {
    if (!data) return null;
    const spec = safeParseJson<any>(data.specJson, null);
    const dataRect = summary.dataRect ?? normalizeDataRect((data as any).dataRect) ?? resolveSpecRect(spec);
    if (!dataRect) return null;

    return {
      spec,
      workbook: safeParseJson<any[]>(data.rawWorkbookDataJson, []) ?? [],
      dataRect,
    };
  }, [data, summary.dataRect]);

  const content = (() => {
    if (!dynamicExcelId) {
      return (
        <Alert severity="warning" sx={{ mt: showHeader ? 0.5 : 0 }}>
          Bảng chưa có mã Excel động để xem trước.
        </Alert>
      );
    }

    if (!previewRequested) {
      return (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{
            minHeight: dense ? 72 : 88,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 1,
            px: dense ? 1 : 1.25,
            py: dense ? 1 : 1.25,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Workbook chỉ tải khi mở xem trước bảng.
          </Typography>
          <Button
            data-testid="dynamic-form-excel-load-button"
            size="small"
            variant="outlined"
            startIcon={<PreviewOutlinedIcon fontSize="small" />}
            onClick={() => setPreviewRequested(true)}
            sx={{ alignSelf: { xs: "stretch", sm: "center" }, textTransform: "none" }}
          >
            Tải bảng
          </Button>
        </Stack>
      );
    }

    if (isLoading) {
      return (
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: dense ? 160 : 240 }}>
          <CircularProgress size={24} />
        </Stack>
      );
    }

    if (isError || !parsed) {
      return <Alert severity="error">Không tải được bảng Excel động để xem trước.</Alert>;
    }

    return (
      <Box data-testid="dynamic-form-excel-workbook" sx={{ minWidth: 0 }}>
        <WorkbookDataGrid
          initialSpec={parsed.spec}
          initialWorkbookData={parsed.workbook}
          dataRect={parsed.dataRect}
          mode="view"
          readOnly
          showActions={false}
        />
      </Box>
    );
  })();

  return (
    <Paper
      data-testid="dynamic-form-excel-preview"
      data-dynamic-excel-id={dynamicExcelId || undefined}
      variant="outlined"
      sx={{ p: dense ? 1 : 1.25, borderRadius: 1, bgcolor: "background.default" }}
    >
      <Stack spacing={1}>
        {showHeader && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {title || summary.title || "Bảng Excel động"}
            </Typography>
            {tableMode && <Chip size="small" label={tableModeLabels[tableMode]} variant="outlined" />}
          </Stack>
        )}
        {content}
      </Stack>
    </Paper>
  );
}

function readExcelBlockSummary(json: string | null | undefined): ExcelBlockSummary {
  const obj = parseObject(json);
  return {
    dynamicExcelId:
      readString(obj?.dynamicExcelTemplateId) ??
      readString(obj?.DynamicExcelTemplateId) ??
      readString(obj?.excelBlockDynamicExcelTemplateId) ??
      readString(obj?.ExcelBlockDynamicExcelTemplateId),
    title:
      readString(obj?.dynamicExcelName) ??
      readString(obj?.DynamicExcelName) ??
      readString(obj?.name) ??
      readString(obj?.blockId) ??
      readString(obj?.id),
    dataRect: normalizeDataRect(obj?.dataRect ?? obj?.DataRect),
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
