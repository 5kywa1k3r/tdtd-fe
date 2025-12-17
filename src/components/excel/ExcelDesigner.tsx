import { useMemo, useState, useEffect, useRef } from "react";
import { Box, Button, Card, CardContent, Typography, useTheme } from "@mui/material";

import type { HeaderSpec } from "../../features/excelDesigner/types";
import { HeaderInput } from "./HeaderInput";
import { SaveResultDialog } from "./SaveResultDialog";

import { extractMasterCells } from "../../features/excelDesigner/extractFromFortune";
import { validateHeader } from "../../features/excelDesigner/validate";
import { shadeHeaderArea } from "../../features/excelDesigner/shadeHeaderArea";
import { getAnchors } from "../../features/excelDesigner/getAnchors";
import { getTableRect } from "../../features/excelDesigner/getTableRect";
import { getHeaderBgHex } from "../../features/excelDesigner/themeTint";

import { Workbook } from "@fortune-sheet/react";

function createEmptyWorkbook(rows: number, cols: number) {
  return [
    {
      id: "sheet-1",
      name: "Sheet1",
      row: rows,
      column: cols,
      celldata: [],
      config: { merge: {} },
    },
  ];
}

const DEFAULT_SPEC: HeaderSpec = { kind: "TOP", topRows: 3, topCols: 6, dataRows: 10 };

export default function ExcelDesigner() {
  const theme = useTheme();

  const [spec, setSpec] = useState<HeaderSpec>(DEFAULT_SPEC);

  const [workbookData, setWorkbookData] = useState<any[]>(() => {
    const table = getTableRect(DEFAULT_SPEC);
    return createEmptyWorkbook(table.rows, table.cols);
  });

  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgOk, setDlgOk] = useState(false);
  const [dlgIssues, setDlgIssues] = useState<any[]>([]);

  const settings = useMemo(() => {
    return {
      data: workbookData,
      onChange: (data: any) => setWorkbookData(data),
    };
  }, [workbookData]);

  const specRef = useRef(spec);
  useEffect(() => { specRef.current = spec; }, [spec]);
  const [workbookKey, setWorkbookKey] = useState(0);

  const refresh = () => {
    const s = specRef.current;

    const table = getTableRect(s);
    const next = createEmptyWorkbook(table.rows, table.cols);
    const sheet = next[0];

    const { topAnchor, leftAnchor } = getAnchors(s); 
    const bgHex = getHeaderBgHex(theme.palette.primary.main);

    shadeHeaderArea({
      sheet,
      spec: s,
      topAnchor,
      leftAnchor,
      bg: bgHex,
    });

    setWorkbookData(next);

    // ✅ force remount Workbook để ăn size + reset UI
    setWorkbookKey((k) => k + 1);
  };

  const save = () => {
    const sheet = workbookData?.[0];
    if (!sheet) {
      setDlgOk(false);
      setDlgIssues([{ code: "OUTSIDE_HEADER", message: "Không lấy được sheet từ workbookData." }]);
      setDlgOpen(true);
      return;
    }

    const table = getTableRect(spec);
    const { topAnchor, leftAnchor } = getAnchors(spec);

    const masterCells = extractMasterCells(sheet);
    const res = validateHeader({
      spec,
      topAnchor,
      leftAnchor,
      sheetRows: table.rows,
      sheetCols: table.cols,
      masterCells,
    });

    setDlgOk(res.ok);
    setDlgIssues(res.issues);
    setDlgOpen(true);

    if (!res.ok) return;

    // ✅ pass => gọi BE/redux ở đây
    // await api.saveHeader({ spec, masterCells })
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      {/* (1) INPUT */}
      <HeaderInput value={spec} onChange={setSpec} />

      {/* (2) TABLE */}
      <Card variant="outlined" sx={{ flex: 1, minHeight: 420 }}>
        <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography fontWeight={900}> TABLE (FortuneSheet)</Typography>

          <Box sx={{ flex: 1, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 2, overflow: "hidden" }}>
            <Workbook key={workbookKey} {...settings} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" onClick={refresh}>
              Tạo / Làm mới bảng
            </Button>
            <Button variant="contained" onClick={save}>
              Lưu
            </Button>
          </Box>
        </CardContent>
      </Card>

      <SaveResultDialog open={dlgOpen} ok={dlgOk} issues={dlgIssues as any} onClose={() => setDlgOpen(false)} />
    </Box>
  );
}

