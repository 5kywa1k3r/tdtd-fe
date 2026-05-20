import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from "@mui/material";

import { useGetDynamicExcelQuery, useUpdateDynamicExcelMutation } from "../../api/dynamicExcelApi";
import ExcelDesigner from "../../components/excel/fortune/ExcelDesigner";
import { UITextKey, uiText } from "../../constants/uiText";

export default function DynamicExcelEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const q = useGetDynamicExcelQuery({ id: id ?? "" }, { skip: !id });
  const detail = q.data;
  const [update] = useUpdateDynamicExcelMutation();
  const [name, setName] = useState("");

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

  useEffect(() => {
    if (!detail) return;
    setName(detail.name ?? "");
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

  return (
    <Stack spacing={1.5} sx={{ height: "100%" }}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              label="Tên bảng"
              size="small"
              value={name}
              onChange={(event) => setName(event.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={async () => {
                await update({ id, body: { name } }).unwrap();
                navigate("/dynamic-excel");
              }}
              sx={{ minHeight: 40 }}
            >
              Lưu
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ExcelDesigner
          mode="view"
          readOnly
          meta={{ code: detail.code, name }}
          initialTableMode={detail.tableMode}
          initialSpec={parsed.spec}
          initialWorkbookData={parsed.workbook}
          onBack={() => navigate("/dynamic-excel")}
          onSaved={() => {}}
        />
      </Box>
    </Stack>
  );
}
