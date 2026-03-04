// src/components/excel/fortune/ExcelDesigner.tsx
import { useMemo, useState, useEffect, useRef } from "react";
import { Box, Button, Card, CardContent } from "@mui/material";

import type { HeaderSpec } from "./types";
import { HeaderInput, type HeaderMeta } from "../HeaderInput";
import { SaveResultDialog } from "../SaveResultDialog";

import { Workbook } from "@fortune-sheet/react";

import { normalizeToSingleSheet } from "./normalizeWorkbook";
import { computeRegions, getTableRect, getAnchors, type Rect as RegionRect } from "./regions";

import { extractMasterCells, extractNumericValues1D } from "./fortuneAdapter";
import { validateHeader, validateNoMergeInDataRange, validateSpecLimits } from "./validate";

import {
  MARK_COLORS,
  markRect,
  unmarkRect,
  stripMarksForSave,
  type Rect as MarkRect,
  type Backup,
} from "./designerMarking";

export type ExcelDesignerMeta = HeaderMeta;

function rectRows(R: RegionRect) {
  return R.r1 - R.r0 + 1;
}
function rectCols(R: RegionRect) {
  return R.c1 - R.c0 + 1;
}

function createEmptyWorkbook(rows: number, cols: number) {
  return [
    {
      id: "sheet-1",
      name: "Sheet1",
      row: rows,
      column: cols,
      config: { merge: {} },
      data: Array.from({ length: rows }, () => Array.from({ length: cols }, () => null)),
      celldata: [],
    },
  ];
}

const DEFAULT_SPEC: HeaderSpec = { kind: "TOP", topRows: 3, topCols: 6, dataRows: 10 };

export type ExcelDesignerMode = "create" | "view" | "edit";

type ExcelDesignerProps = {
  mode?: ExcelDesignerMode;

  /** NEW: meta từ page truyền xuống (code preview / detail) */
  meta?: ExcelDesignerMeta;
  onMetaChange?: (meta: ExcelDesignerMeta) => void;

  initialSpec?: HeaderSpec;
  initialWorkbookData?: any[];

  readOnly?: boolean;
  onBack?: () => void;

  onSaved?: (payload: {
    /** NEW: trả meta lên page để save */
    code: string;
    name: string;
    spec: HeaderSpec;
    rawWorkbookData: any[];
    dataRect: { r0: number; c0: number; r1: number; c1: number };
    W: number;
    H: number;
    values1D: (number | null)[];
    masterCells: any[];
  }) => void;
};

/** Template rule: cấm có data trong dataRect (create + edit đều chặn) */
function hasMeaningfulCellValue(cell: any): boolean {
  if (!cell || typeof cell !== "object") return false;

  const v = cell.v;
  const m = cell.m;
  const f = cell.f;

  if (typeof v === "number" && Number.isFinite(v)) return true;
  if (typeof v === "string" && v.trim().length > 0) return true;

  if (typeof m === "string" && m.trim().length > 0) return true;
  if (typeof f === "string" && f.trim().length > 0) return true;

  return false;
}

function buildCelldataMap(sheet: any) {
  const map = new Map<string, any>();
  const cd = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (const it of cd) {
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    if (it?.v && typeof it.v === "object") map.set(`${r},${c}`, it.v);
  }
  return map;
}

function getCellAny(sheet: any, r: number, c: number, cdMap: Map<string, any>) {
  const row = Array.isArray(sheet?.data) ? sheet.data[r] : null;
  const d = Array.isArray(row) ? row[c] : null;
  if (d && typeof d === "object") return d;
  return cdMap.get(`${r},${c}`) ?? null;
}

function validateNoDataInRect(sheet: any, rect: { r0: number; c0: number; r1: number; c1: number }) {
  const cdMap = buildCelldataMap(sheet);

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      const cell = getCellAny(sheet, r, c, cdMap);
      if (hasMeaningfulCellValue(cell)) {
        return [
          {
            code: "DATA_TRONG_VUNG_DU_LIEU",
            message: `Template không được có dữ liệu trong vùng dữ liệu (phát hiện tại hàng ${r + 1}, cột ${c + 1}).`,
            at: { r, c },
          },
        ];
      }
    }
  }
  return [];
}

function toMarkRect(r: { r0: number; c0: number; r1: number; c1: number }): MarkRect {
  return { r0: r.r0, c0: r.c0, r1: r.r1, c1: r.c1 };
}

export default function ExcelDesigner(props: ExcelDesignerProps) {
  const {
    mode = "create",
    initialSpec,
    initialWorkbookData,
    readOnly,
    onBack,
    onSaved,
  } = props;

  // ===== quyền =====
  const isView = mode === "view";
  const canEdit = !(readOnly ?? false) && !isView; // view không edit
  const canMark = !(readOnly ?? false);            // view vẫn mark được nếu readOnly không ép true

  // ===== SPEC =====
  const [spec, setSpec] = useState<HeaderSpec>(() => initialSpec ?? DEFAULT_SPEC);

  // ===== META (controlled -> local state) =====
  // ✅ Đây là chỗ trước bệ hạ thiếu nên "name không sửa được"
  const [meta, setMeta] = useState<ExcelDesignerMeta>(() => {
    const m = props.meta;
    return {
      code: m?.code ?? "",
      name: m?.name ?? "",
    };
  });

  // sync khi page đổi template / đổi id / load detail
  useEffect(() => {
    const m = props.meta;
    setMeta({
      code: m?.code ?? "",
      name: m?.name ?? "",
    });
  }, [props.meta?.code, props.meta?.name]);

  const handleMetaChange = (next: ExcelDesignerMeta) => {
    setMeta(next);
    props.onMetaChange?.(next);
  };

  // ===== WORKBOOK =====
  const [workbookData, setWorkbookData] = useState<any[]>(() => {
    const s = initialSpec ?? DEFAULT_SPEC;
    const table = getTableRect(s);
    const rows = rectRows(table);
    const cols = rectCols(table);

    if (initialWorkbookData?.length) {
      return normalizeToSingleSheet(initialWorkbookData, rows, cols);
    }
    return createEmptyWorkbook(rows, cols);
  });

  // ref giữ dữ liệu mới nhất khi user edit
  const workbookRef = useRef<any[]>(workbookData);
  useEffect(() => {
    workbookRef.current = workbookData;
  }, [workbookData]);

  const [workbookKey, setWorkbookKey] = useState(0);

  // ===== mark toggle (1 nút) =====
  const [markHeader, setMarkHeader] = useState(false);
  const markBackupRef = useRef<Map<string, Backup>>(new Map());

  // ===== validate dialog =====
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgOk, setDlgOk] = useState(false);
  const [dlgIssues, setDlgIssues] = useState<any[]>([]);

  // đổi item/mode -> reset data + remount workbook
  useEffect(() => {
    const nextSpec = initialSpec ?? DEFAULT_SPEC;
    setSpec(nextSpec);

    const table = getTableRect(nextSpec);
    const rows = rectRows(table);
    const cols = rectCols(table);

    const next = initialWorkbookData?.length
      ? normalizeToSingleSheet(initialWorkbookData, rows, cols)
      : createEmptyWorkbook(rows, cols);

    setWorkbookData(next);
    workbookRef.current = next;
    setWorkbookKey((k) => k + 1);

    // reset mark/backups
    setMarkHeader(false);
    markBackupRef.current.clear();
  }, [initialSpec, initialWorkbookData, mode]);

  // Workbook settings: onChange chỉ update ref, không setState
  const settings = useMemo(() => {
    return {
      data: workbookData,
      onChange: (data: any) => {
        if (!canEdit) return;
        if (Array.isArray(data)) workbookRef.current = data;
      },
    };
  }, [workbookData, canEdit]);

  // helper: lấy workbook latest + normalize theo spec hiện tại (rows/cols là COUNT)
  const getNormalizedLatest = (s: HeaderSpec) => {
    const table = getTableRect(s);
    const rows = rectRows(table);
    const cols = rectCols(table);

    const raw = workbookRef.current?.length ? workbookRef.current : workbookData;
    const normalized = normalizeToSingleSheet(raw, rows, cols);
    const sheet = normalized[0];
    return { table, rows, cols, normalized, sheet };
  };

  const resetMarks = () => {
    setMarkHeader(false);
    markBackupRef.current.clear();
  };

  const refresh = () => {
    if (!canEdit) return;

    const table = getTableRect(spec);
    const rows = rectRows(table);
    const cols = rectCols(table);

    const next = createEmptyWorkbook(rows, cols);

    setWorkbookData(next);
    workbookRef.current = next;
    setWorkbookKey((k) => k + 1);

    resetMarks();
  };

  /**
   * ✅ 1 nút: tô luôn header + data, gỡ cũng gỡ luôn cả 2.
   * ✅ giữ kiểu remount mà bệ hạ đang dùng.
   */
  const toggleMarkHeader = () => {
    if (!canMark) return;

    const { table, normalized, sheet } = getNormalizedLatest(spec);
    if (!sheet) return;

    const regions = computeRegions(spec, table);
    const headerRects = (regions as any).headerRects?.length
      ? (regions as any).headerRects
      : [regions.headerRect];
    const dataRect = (regions as any).dataRect;

    const backup = markBackupRef.current;

    if (!markHeader) {
      for (const r of headerRects) markRect(sheet, toMarkRect(r), MARK_COLORS.HEADER_BG, backup);
      if (dataRect) markRect(sheet, toMarkRect(dataRect), MARK_COLORS.DATA_BG, backup);
    } else {
      for (const r of headerRects) unmarkRect(sheet, toMarkRect(r), MARK_COLORS.HEADER_BG, backup);
      if (dataRect) unmarkRect(sheet, toMarkRect(dataRect), MARK_COLORS.DATA_BG, backup);
      backup.clear();
    }

    // force new refs + remount (để FortuneSheet repaint chắc)
    const next = [...normalized];
    next[0] = { ...next[0] };

    setWorkbookData(next);
    workbookRef.current = next;
    setWorkbookKey((k) => k + 1);

    setMarkHeader((v) => !v);
  };

  const onSpecChange = (nextSpec: HeaderSpec) => {
    if (!canEdit) return;

    const v = validateSpecLimits(nextSpec);
    if (!v.ok) {
      setDlgOk(false);
      setDlgIssues(v.issues);
      setDlgOpen(true);
      return;
    }

    setSpec(nextSpec);

    const rows = rectRows(v.table);
    const cols = rectCols(v.table);

    const raw = workbookRef.current?.length ? workbookRef.current : workbookData;
    const normalized = normalizeToSingleSheet(raw, rows, cols);

    setWorkbookData(normalized);
    workbookRef.current = normalized;
    setWorkbookKey((k) => k + 1);

    resetMarks();
  };

  const save = () => {
    if (!canEdit) return;

    const name = (meta.name ?? "").trim();
    if (!name) {
      setDlgOk(false);
      setDlgIssues([{ code: "EMPTY_NAME", message: "Tên bảng không được trống." }]);
      setDlgOpen(true);
      return;
    }

    const vlim = validateSpecLimits(spec);
    if (!vlim.ok) {
      setDlgOk(false);
      setDlgIssues(vlim.issues);
      setDlgOpen(true);
      return;
    }

    const table = vlim.table;
    const rows = rectRows(table);
    const cols = rectCols(table);

    const { normalized } = getNormalizedLatest(spec);

    // clone để save + strip màu đánh dấu (không ảnh hưởng UI)
    const normalizedForSave = normalizeToSingleSheet(normalized, rows, cols);
    const sheetForSave = normalizedForSave[0];

    if (!sheetForSave) {
      setDlgOk(false);
      setDlgIssues([{ code: "NO_SHEET", message: "Không lấy được Sheet1." }]);
      setDlgOpen(true);
      return;
    }

    // strip highlight marks khỏi payload save
    const marked = new Set<any>([MARK_COLORS.HEADER_BG, MARK_COLORS.DATA_BG]);
    if (markHeader) stripMarksForSave(sheetForSave, markBackupRef.current, marked);

    const { topAnchor, leftAnchor } = getAnchors(spec);
    const masterCells = extractMasterCells(sheetForSave);

    const vres = validateHeader({
      spec,
      topAnchor,
      leftAnchor,
      sheetRows: rows,
      sheetCols: cols,
      masterCells,
    });

    if (!vres.ok) {
      setDlgOk(false);
      setDlgIssues(vres.issues);
      setDlgOpen(true);
      return;
    }

    const dataRect = vlim.dataRect;

    // RULE: template luôn cấm dữ liệu trong dataRect
    const dataIssues = validateNoDataInRect(sheetForSave, dataRect);
    if (dataIssues.length) {
      setDlgOk(false);
      setDlgIssues(dataIssues);
      setDlgOpen(true);
      return;
    }

    // Rule: cấm merge trong data range
    const merge = sheetForSave?.config?.merge ?? {};
    const mergeIssues = validateNoMergeInDataRange(merge, dataRect);
    if (mergeIssues.length) {
      setDlgOk(false);
      setDlgIssues(mergeIssues);
      setDlgOpen(true);
      return;
    }

    const values1D = extractNumericValues1D(sheetForSave, dataRect);

    setDlgOk(true);
    setDlgIssues([]);
    setDlgOpen(true);

    onSaved?.({
      code: meta.code,
      name,
      spec,
      rawWorkbookData: normalizedForSave,
      dataRect,
      W: dataRect.c1 - dataRect.c0 + 1,
      H: dataRect.r1 - dataRect.r0 + 1,
      values1D,
      masterCells,
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      <HeaderInput
        value={spec}
        onChange={onSpecChange}
        meta={meta}
        onMetaChange={handleMetaChange}
        codeReadOnly
        // ✅ view: khóa meta; create/edit: cho sửa meta
        metaDisabled={isView || (readOnly ?? false)}
        // ✅ view: khóa spec; create/edit: cho sửa spec (trừ khi readOnly)
        specDisabled={!canEdit}
      />

      <Card variant="outlined" sx={{ flex: 1, minHeight: 620, display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
          <Box
            className="tdtdSheet"
            sx={{
              flex: 1,
              minHeight: 0,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 2,
              overflow: "hidden",
              "& .luckysheet-bottom-controll-row": { display: "none !important" },
              "& .fortune-sheettab-button": { display: "none !important" },
              "& .fortune-sheettab-container-c": { display: "none !important" },
            }}
          >
            <Workbook key={workbookKey} {...settings} />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Button variant="outlined" onClick={onBack}>
              Quay lại
            </Button>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant={markHeader ? "contained" : "outlined"}
                onClick={toggleMarkHeader}
                disabled={!canMark}
              >
                Đánh dấu cột tiêu đề
              </Button>

              <Button variant="outlined" onClick={refresh} disabled={!canEdit}>
                Tạo / Làm mới bảng
              </Button>

              <Button variant="contained" onClick={save} disabled={!canEdit}>
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