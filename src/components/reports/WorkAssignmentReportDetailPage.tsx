// src/pages/works/report/WorkAssignmentReportDetailPage.tsx
import * as React from "react";
import { Alert, Stack, Typography } from "@mui/material";

import {
  useGetWorkAssignmentReportQuery,
  useSaveWorkAssignmentReportDraftMutation,
} from "../../api/reportApi";

import type { WorkAssignmentReportStatus } from "../../types/reportStatus";
import { getWorkAssignmentReportStatusLabel } from "../../types/reportStatus";
import { parseReportDetail } from "../../types/report.parses";

import ExcelReportEditor from "../../components/excel/fortune/ExcelReportEditor";

export interface WorkAssignmentReportDetailPageProps {
  reportId?: string;
  mode?: "edit" | "view";
  onBack?: () => void;
}

export default function WorkAssignmentReportDetailPage(
  props: WorkAssignmentReportDetailPageProps
) {
  const { reportId, mode = "edit", onBack } = props;

  const { data, isLoading, isFetching, error } = useGetWorkAssignmentReportQuery(
    reportId ?? "",
    { skip: !reportId }
  );

  const [saveDraft, saveState] = useSaveWorkAssignmentReportDraftMutation();

  const parsed = React.useMemo(() => {
    if (!data) return null;
    return parseReportDetail(data);
  }, [data]);

  const handleSave = async (payload: {
    rawWorkbookData: any[];
    values1D: Array<number | null>;
    note?: string;
  }) => {
    if (!reportId) return;

    await saveDraft({
      id: reportId,
      data: {
        rawWorkbookDataJson: JSON.stringify(payload.rawWorkbookData),
        values1D: payload.values1D,
        note: payload.note,
      },
    }).unwrap();
  };

  if (!reportId) {
    return <Alert severity="warning">Thiếu reportId để mở chi tiết báo cáo.</Alert>;
  }

  if (isLoading || isFetching) {
    return (
      <Typography variant="body2" color="text.secondary">
        Đang tải chi tiết báo cáo...
      </Typography>
    );
  }

  if (error || !parsed) {
    return <Alert severity="error">Không tải được chi tiết báo cáo.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {saveState.isError && (
        <Alert severity="error">Lưu draft thất bại.</Alert>
      )}

      {saveState.isSuccess && (
        <Alert severity="success">Đã lưu draft thành công.</Alert>
      )}

      <ExcelReportEditor
        mode={mode}
        templateName={parsed.dynamicExcelTemplateName}
        templateCode={parsed.dynamicExcelTemplateCode}
        periodKey={parsed.periodKey}
        statusLabel={getWorkAssignmentReportStatusLabel(parsed.status as WorkAssignmentReportStatus)}
        initialSpec={parsed.spec}
        initialWorkbookData={parsed.rawWorkbookData}
        dataRect={parsed.dataRect}
        note={parsed.note ?? ""}
        readOnly={mode === "view"}
        saving={saveState.isLoading}
        onBack={onBack}
        onSaved={handleSave}
      />
    </Stack>
  );
}