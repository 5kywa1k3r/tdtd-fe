import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

import ExcelDesigner from "../../components/excel/fortune/ExcelDesigner";
import { useGetDynamicExcelQuery } from "../../api/dynamicExcelApi";
import { UITextKey, uiText } from '../../constants/uiText';
import RecordTableTemplateEditor from "../../components/excel/recordTable/RecordTableTemplateEditor";

export default function DynamicExcelViewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const q = useGetDynamicExcelQuery({ id: id ?? "" }, { skip: !id });
  const detail = q.data;

  const parsed = useMemo(() => {
    if (!detail) return { spec: undefined as any, workbook: undefined as any[] | undefined };

    let spec: any = undefined;
    let workbook: any[] | undefined = undefined;

    try {
      spec = JSON.parse(detail.specJson);
    } catch {
      spec = undefined;
    }

    try {
      const raw = JSON.parse(detail.rawWorkbookDataJson);
      workbook = Array.isArray(raw) ? raw : undefined;
    } catch {
      workbook = undefined;
    }

    return { spec, workbook };
  }, [detail]);

  if (!id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>{uiText(UITextKey.TextThieuId)}</Typography>
      </Box>
    );
  }

  if (q.isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography>{uiText(UITextKey.TextDangTaiBangBieu)}</Typography>
      </Box>
    );
  }

  if (q.isError || !detail) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>{uiText(UITextKey.TextKhongTaiDuocBangBieu)}</Typography>
        <Typography variant="body2" color="text.secondary">
          id: {id}
        </Typography>
      </Box>
    );
  }

  if (detail.tableKind === "RECORD_TABLE") {
    return (
      <RecordTableTemplateEditor
        mode="view"
        meta={{ code: detail.code, name: detail.name }}
        initialSpecJson={detail.recordTableSpecJson}
        onBack={() => navigate("/dynamic-excel")}
        onSaved={() => {}}
      />
    );
  }

  return (
    <ExcelDesigner
      key={detail.id} 
      mode="view"
      meta={{ code: detail.code, name: detail.name }}
      initialSpec={parsed.spec}
      initialWorkbookData={parsed.workbook}
      onBack={() => navigate("/dynamic-excel")}
      onSaved={() => {}}
    />
  );
}
