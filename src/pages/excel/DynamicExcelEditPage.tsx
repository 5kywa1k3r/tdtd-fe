import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";

import ExcelDesigner from "../../components/excel/ExcelDesigner";
import { MOCK_DYNAMIC_EXCEL_LIST } from "../../data/mockDataTable";

export default function DynamicExcelEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const item = useMemo(
    () => MOCK_DYNAMIC_EXCEL_LIST.find((x) => x.id === id) ?? null,
    [id]
  );

  if (!item) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>Không tìm thấy bảng biểu</Typography>
        <Typography variant="body2" color="text.secondary">id: {id}</Typography>
      </Box>
    );
  }

  return (
    <ExcelDesigner
      mode="edit"
      initialSpec={item.spec}
      initialWorkbookData={item.workbookData}
      onBack={() => navigate("/dynamic-excel")}
      onSaved={() => navigate("/dynamic-excel")}
    />
  );
}
