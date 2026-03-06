import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import ExcelDesigner from "../../excel/fortune/ExcelDesigner";

type Props = {
  open: boolean;
  dynamicExcelId?: string | null;
  onClose: () => void;
};

export const DynamicExcelPreviewDialog: React.FC<Props> = ({
  open,
  dynamicExcelId,
  onClose,
}) => {
  const { data, isFetching, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId ?? "" },
    { skip: !open || !dynamicExcelId }
  );

  // ✅ chỉ mount ExcelDesigner sau khi dialog mở xong
  const [ready, setReady] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  const parsed = useMemo(() => {
    if (!data) {
      return {
        spec: undefined as any,
        workbook: undefined as any[] | undefined,
      };
    }

    let spec: any = undefined;
    let workbook: any[] | undefined = undefined;

    try {
      spec = JSON.parse(data.specJson);
    } catch {
      spec = undefined;
    }

    try {
      const raw = JSON.parse(data.rawWorkbookDataJson);
      workbook = Array.isArray(raw) ? raw : undefined;
    } catch {
      workbook = undefined;
    }

    return { spec, workbook };
  }, [data]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      keepMounted={false}
      TransitionProps={{
        onEntered: () => {
          // ✅ đợi dialog vào xong rồi mới mount spreadsheet
          setReady(true);
          setRenderKey((k) => k + 1);
        },
        onExit: () => {
          setReady(false);
        },
      }}
    >
      <DialogContent
        dividers
        sx={{
          height: "85vh",
          minHeight: 720,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          p: 2,
        }}
      >
        {isFetching ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : isError || !data ? (
          <Box sx={{ p: 2 }}>
            <Typography fontWeight={800}>Không tải được biểu mẫu</Typography>
            <Typography variant="body2" color="text.secondary">
              id: {dynamicExcelId}
            </Typography>
          </Box>
        ) : !ready ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <ExcelDesigner
              key={`${data.id}_${renderKey}`}
              mode="view"
              meta={{ code: data.code, name: data.name }}
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
};