import React from "react";
import { Box, Typography } from "@mui/material";
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
};

const AggregateWorkbookPreview: React.FC<AggregateWorkbookPreviewProps> = ({
  title = "Biểu mẫu tổng hợp",
  workbook,
  previewRect,
  spec,
  previewHighlights,
}) => {
  if (!workbook.length) return null;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
        {title}
      </Typography>
      <WorkbookDataGrid
        initialSpec={spec ?? {}}
        initialWorkbookData={workbook}
        dataRect={previewRect}
        previewHighlights={previewHighlights}
        mode="view"
        readOnly
        showActions={false}
      />
    </Box>
  );
};

export default AggregateWorkbookPreview;
