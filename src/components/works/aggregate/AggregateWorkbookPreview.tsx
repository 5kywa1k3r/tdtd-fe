import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { Sheet } from "@fortune-sheet/core";
import WorkbookDataGrid, {
  type WorkbookPreviewHighlight,
} from "../../excel/fortune/WorkbookDataGrid";
import type { DynamicExcelSpecLike, ReportRect } from "../../../types/aggregateTypes";

export type AggregateWorkbookPreviewProps = {
  title?: string;
  workbook: Sheet[];
  previewRect: ReportRect;
  spec?: DynamicExcelSpecLike | null;
  previewHighlights?: WorkbookPreviewHighlight[];
  loadOnMount?: boolean;
};

const AggregateWorkbookPreview: React.FC<AggregateWorkbookPreviewProps> = ({
  title = "Biểu mẫu tổng hợp",
  workbook,
  previewRect,
  spec,
  previewHighlights,
  loadOnMount = false,
}) => {
  const [previewRequested, setPreviewRequested] = React.useState(loadOnMount);
  const workbookResetKey = React.useMemo(
    () => [
      title,
      workbook.length,
      workbook[0]?.name ?? "",
      previewRect.r0,
      previewRect.c0,
      previewRect.r1,
      previewRect.c1,
    ].join(":"),
    [previewRect.c0, previewRect.c1, previewRect.r0, previewRect.r1, title, workbook],
  );

  React.useEffect(() => {
    setPreviewRequested(loadOnMount);
  }, [loadOnMount, workbookResetKey]);

  if (!workbook.length) return null;

  return (
    <Box data-testid="aggregate-workbook-preview">
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
        {title}
      </Typography>
      {!previewRequested ? (
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
            Bản xem trước workbook chỉ dựng khi cần xem chi tiết.
          </Typography>
          <Button
            data-testid="aggregate-workbook-load-button"
            size="small"
            variant="outlined"
            onClick={() => setPreviewRequested(true)}
            sx={{ alignSelf: { xs: "stretch", sm: "center" }, textTransform: "none" }}
          >
            Tải bản xem trước
          </Button>
        </Stack>
      ) : (
        <WorkbookDataGrid
          initialSpec={spec ?? {}}
          initialWorkbookData={workbook}
          dataRect={previewRect}
          previewHighlights={previewHighlights}
          mode="view"
          readOnly
          showActions={false}
        />
      )}
    </Box>
  );
};

export default AggregateWorkbookPreview;
