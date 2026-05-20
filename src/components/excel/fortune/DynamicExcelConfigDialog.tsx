import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import ExcelDesigner from "./ExcelDesigner";
import type { HeaderSpec } from "./types";

type Props = {
  open: boolean;
  dynamicExcelId?: string | null;
  onClose: () => void;
};

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function DynamicExcelConfigDialog({
  open,
  dynamicExcelId,
  onClose,
}: Props) {
  const { data, isLoading, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId ?? "" },
    { skip: !open || !dynamicExcelId },
  );

  const parsed = React.useMemo(() => {
    if (!data) return null;

    return {
      spec: safeParseJson<HeaderSpec | undefined>(data.specJson, undefined),
      workbook: safeParseJson<any[]>(data.rawWorkbookDataJson, []),
    };
  }, [data]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth keepMounted={false}>
      <DialogContent
        dividers
        sx={{
          p: 2,
          height: { xs: "calc(100dvh - 32px)", md: "calc(100dvh - 64px)" },
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap>
              Xem cấu hình bảng Excel động
            </Typography>
            {data && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {[data.code, data.name].filter(Boolean).join(" - ")}
              </Typography>
            )}
          </Box>
          <Tooltip title="Đóng">
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {isLoading ? (
          <Stack sx={{ flex: 1, minHeight: 360 }} alignItems="center" justifyContent="center">
            <CircularProgress size={28} />
          </Stack>
        ) : isError || !data || !parsed ? (
          <Alert severity="error">Không tải được cấu hình bảng Excel động.</Alert>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ExcelDesigner
              key={data.id}
              mode="view"
              meta={{ code: data.code, name: data.name }}
              initialTableMode={data.tableMode}
              initialSpec={parsed.spec}
              initialWorkbookData={parsed.workbook}
              onBack={onClose}
              onSaved={() => {}}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
