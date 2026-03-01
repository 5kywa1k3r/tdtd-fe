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

export type ExcelDesignerMode = "create" | "view" | "edit";

type ExcelDesignerProps = {
  mode?: ExcelDesignerMode;

  initialSpec?: HeaderSpec;
  initialWorkbookData?: any[];

  readOnly?: boolean;   // override nếu muốn ép readonly
  onBack?: () => void;  // nút quay lại
  onSaved?: (payload: { spec: HeaderSpec; workbookData: any[]; masterCells: any[] }) => void; // callback sau save ok
};

export default function ExcelDesigner(props: ExcelDesignerProps) {
  const {
    mode = "create",
    initialSpec,
    initialWorkbookData,
    readOnly,
    onBack,
    onSaved,
  } = props;

  const theme = useTheme();
  const isView = mode === "view";
  const isReadOnly = readOnly ?? isView;

  // ====== SPEC ======
  const [spec, setSpec] = useState<HeaderSpec>(() => initialSpec ?? DEFAULT_SPEC);

  // ====== WORKBOOK ======
  const [workbookData, setWorkbookData] = useState<any[]>(() => {
    if (initialWorkbookData?.length) return initialWorkbookData;

    const table = getTableRect(initialSpec ?? DEFAULT_SPEC);
    return createEmptyWorkbook(table.rows, table.cols);
  });

  const [workbookKey, setWorkbookKey] = useState(0);

  // đổi item/mode -> reset data + remount workbook
  useEffect(() => {
    const nextSpec = initialSpec ?? DEFAULT_SPEC;
    setSpec(nextSpec);

    if (initialWorkbookData?.length) {
      setWorkbookData(initialWorkbookData);
    } else {
      const table = getTableRect(nextSpec);
      setWorkbookData(createEmptyWorkbook(table.rows, table.cols));
    }

    setWorkbookKey((k) => k + 1);
  }, [initialSpec, initialWorkbookData, mode]);

  // dialog validate
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgOk, setDlgOk] = useState(false);
  const [dlgIssues, setDlgIssues] = useState<any[]>([]);

  const settings = useMemo(() => {
    return {
      data: workbookData,
      onChange: (data: any) => {
        if (isReadOnly) return;
        setWorkbookData(data);
      },
    };
  }, [workbookData, isReadOnly]);

  // ===== refresh =====
  const specRef = useRef(spec);
  useEffect(() => {
    specRef.current = spec;
  }, [spec]);

  const refresh = () => {
    if (isReadOnly) return;

    const s = specRef.current;
    const table = getTableRect(s);
    const next = createEmptyWorkbook(table.rows, table.cols);
    const sheet = next[0];

    const { topAnchor, leftAnchor } = getAnchors(s);
    const bgHex = getHeaderBgHex(theme.palette.primary.main);

    // create/edit: bôi vùng header đúng như yêu cầu
    shadeHeaderArea({ sheet, spec: s, topAnchor, leftAnchor, bg: bgHex });

    setWorkbookData(next);
    setWorkbookKey((k) => k + 1);
  };

  const save = () => {
    if (isReadOnly) return;

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

    //  save ok: bắn payload ra ngoài để page tự navigate về list
    onSaved?.({ spec, workbookData, masterCells });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      {/* (1) INPUT */}
      <HeaderInput
        value={spec}
        onChange={isReadOnly ? () => {} : setSpec}
        disabled={isReadOnly}
      />

      {/* (2) TABLE */}
      <Card
        variant="outlined"
        sx={{ flex: 1, minHeight: 620, display: "flex", flexDirection: "column" }}
      >
        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
          <Typography fontWeight={900}>TABLE (FortuneSheet)</Typography>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Workbook key={workbookKey} {...settings} />
          </Box>

          {/* actions */}
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Button variant="outlined" onClick={onBack}>
              Quay lại
            </Button>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={refresh} disabled={isReadOnly}>
                Tạo / Làm mới bảng
              </Button>
              <Button variant="contained" onClick={save} disabled={isReadOnly}>
                Lưu
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <SaveResultDialog open={dlgOpen} ok={dlgOk} issues={dlgIssues as any} onClose={() => setDlgOpen(false)} />
    </Box>
  );
}
