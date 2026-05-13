import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Stack } from "@mui/material";
import ExcelDesigner from "../../components/excel/fortune/ExcelDesigner";
import { useCreateDynamicExcelMutation, useNextDynamicExcelCodeQuery } from "../../api/dynamicExcelApi";
import RecordTableTemplateEditor from "../../components/excel/recordTable/RecordTableTemplateEditor";

export default function DynamicExcelCreatePage() {
  const navigate = useNavigate();
  const [create] = useCreateDynamicExcelMutation();
  const [tableKind, setTableKind] = useState<"NUMERIC_GRID" | "RECORD_TABLE">("NUMERIC_GRID");

  const year = new Date().getFullYear();
  const nextCodeQ = useNextDynamicExcelCodeQuery({ year });

  const code = nextCodeQ.data?.nextCode ?? "";

  if (tableKind === "RECORD_TABLE") {
    return (
      <RecordTableTemplateEditor
        mode="create"
        meta={{ code, name: "" }}
        onBack={() => navigate("/dynamic-excel")}
        onSaved={async (p) => {
          await create({
            code: code || null,
            name: p.name,
            labels: [],
            tableKind: "RECORD_TABLE",
            recordTableSpecJson: p.recordTableSpecJson,
            rawWorkbookDataJson: "[]",
            specJson: JSON.stringify({ kind: "RECORD_TABLE" }),
            dataRect: null,
            w: 0,
            h: 0,
          }).unwrap();

          navigate("/dynamic-excel");
        }}
      />
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ p: 2, pb: 0 }}>
        <Button variant="contained">Bảng số cố định</Button>
        <Button variant="outlined" onClick={() => setTableKind("RECORD_TABLE")}>
          Bảng dữ liệu phát sinh
        </Button>
      </Stack>
      <ExcelDesigner
        mode="create"
        meta={{ code: code, name: "" }}
        onBack={() => navigate("/dynamic-excel")}
        onSaved={async (p) => {
          await create({
            code: code || null,
            name: p.name,
            labels: [],
            tableKind: "NUMERIC_GRID",
            recordTableSpecJson: null,
            rawWorkbookDataJson: JSON.stringify(p.rawWorkbookData),
            specJson: JSON.stringify(p.spec),
            dataRect: { r0: p.dataRect.r0, c0: p.dataRect.c0, r1: p.dataRect.r1, c1: p.dataRect.c1 },
            w: p.W,
            h: p.H,
          }).unwrap();

          navigate("/dynamic-excel");
        }}
      />
    </Box>
  );
}
