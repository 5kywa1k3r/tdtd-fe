import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

import ExcelDesigner from "../../components/excel/fortune/ExcelDesigner";
import {
  useGetDynamicExcelQuery,
  useUpdateDynamicExcelMutation,
} from "../../api/dynamicExcelApi";

export default function DynamicExcelEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const q = useGetDynamicExcelQuery({ id: id ?? "" }, { skip: !id });
  const detail = q.data;

  const [update] = useUpdateDynamicExcelMutation();

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
        <Typography fontWeight={800}>Thiếu id</Typography>
      </Box>
    );
  }

  if (q.isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography>Đang tải bảng biểu...</Typography>
      </Box>
    );
  }

  if (q.isError || !detail) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>Không tải được bảng biểu</Typography>
        <Typography variant="body2" color="text.secondary">
          id: {id}
        </Typography>
      </Box>
    );
  }

  return (
    <ExcelDesigner
      mode="edit"
      meta={{ code: detail.code, name: detail.name}}
      initialSpec={parsed.spec}
      initialWorkbookData={parsed.workbook}
      onBack={() => navigate("/dynamic-excel")}
      onSaved={async (p) => {
        await update({
          id,
          body: {
            // tạm giữ nguyên name/labels hiện có (nếu muốn sửa name/labels thì làm UI ngoài)
            name: p.name,
            // labels: p.labels ?? [],

            rawWorkbookDataJson: JSON.stringify(p.rawWorkbookData),
            specJson: JSON.stringify(p.spec),
            dataRect: { r0: p.dataRect.r0, c0: p.dataRect.c0, r1: p.dataRect.r1, c1: p.dataRect.c1 },
            w: p.W,
            h: p.H,
          },
        }).unwrap();

        navigate("/dynamic-excel");
      }}
    />
  );
}