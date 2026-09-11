import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import {
  useBuildNq57SavePayloadMutation,
  usePushNq57PayloadMutation,
  type Nq57BuildSavePayloadRequest,
  type Nq57JsonRow,
  type Nq57SectionAggregationDto,
} from "../../api/nq57Api";

const RichDocumentEditor = lazy(() => import("../../features/dynamicForms/runtime/LexicalRichDocumentEditor"));

type SectionNode = {
  key: string;
  idxId?: string | null;
  idxCode?: string | null;
  parentId?: string | null;
  title: string;
  depth: number;
  order: number;
  row: Nq57JsonRow;
  children: SectionNode[];
};

type UnitSectionValue = {
  html: string;
  text: string;
};

type UnitDraft = {
  unitId: string;
  unitName: string;
  values: Record<string, UnitSectionValue>;
};

type PushDraft = {
  url: string;
  method: "PUT" | "POST" | "PATCH";
  grantId: string;
  action: string;
  cookie: string;
  bearerToken: string;
};

const sampleRows: Nq57JsonRow[] = [
  {
    id: 1,
    idxId: 16514540,
    idxCode: "common.report.title.code",
    idxName: "BÁO CÁO TÌNH HÌNH THỰC HIỆN NGHỊ QUYẾT 57",
    parentId: null,
    idxOrder: 0,
    idxContent: "",
    idxContentRaw: "",
    idxContentKeyword: "",
  },
  {
    id: 2,
    idxId: 16514542,
    idxCode: "57bc7081-e810-440c-ae62-a3f4393d76ec",
    idxName: "PHẦN I. TÌNH HÌNH TRIỂN KHAI VÀ CÁC VẤN ĐỀ CẦN TẬP TRUNG CHỈ ĐẠO",
    parentId: null,
    idxOrder: 1,
    idxContent: "",
    idxContentRaw: "",
    idxContentKeyword: "",
  },
  {
    id: 3,
    idxId: 16514543,
    idxCode: "e155111f-2de3-47d7-bb90-830e8d03de89",
    idxName: "1. Kết quả nổi bật trong tuần",
    parentId: 16514542,
    idxOrder: 2,
    idxContent: "",
    idxContentRaw: "",
    idxContentKeyword: "",
  },
  {
    id: 4,
    idxId: 16514544,
    idxCode: "f7108615-289f-4d38-b8b0-376e98b863dd",
    idxName: "2. Khó khăn, vướng mắc",
    parentId: 16514542,
    idxOrder: 3,
    idxContent: "",
    idxContentRaw: "",
    idxContentKeyword: "",
  },
  {
    id: 5,
    idxId: 16514545,
    idxCode: "65ef4926-f9cc-4510-9158-1bce65ef293d",
    idxName: "3. Nhiệm vụ tuần tiếp theo",
    parentId: 16514542,
    idxOrder: 4,
    idxContent: "",
    idxContentRaw: "",
    idxContentKeyword: "",
  },
];

const sampleUnits: UnitDraft[] = [
  {
    unitId: "u-001",
    unitName: "Đơn vị mẫu 01",
    values: {
      "16514543": {
        html: "<p>Hoàn thành rà soát danh mục nhiệm vụ chuyển đổi số trọng tâm trong tuần.</p>",
        text: "Hoàn thành rà soát danh mục nhiệm vụ chuyển đổi số trọng tâm trong tuần.",
      },
    },
  },
  {
    unitId: "u-002",
    unitName: "Đơn vị mẫu 02",
    values: {
      "16514543": {
        html: "<p>Đã ban hành kế hoạch phối hợp dữ liệu, đang kiểm thử kết nối với hệ thống dùng chung.</p>",
        text: "Đã ban hành kế hoạch phối hợp dữ liệu, đang kiểm thử kết nối với hệ thống dùng chung.",
      },
      "16514544": {
        html: "<p>Vướng về chuẩn dữ liệu đầu vào và thời gian xác nhận liên thông.</p>",
        text: "Vướng về chuẩn dữ liệu đầu vào và thời gian xác nhận liên thông.",
      },
    },
  },
];

const defaultPushDraft: PushDraft = {
  url: "https://theodoinq.dcs.vn/report_api/api/rp_objidx_data",
  method: "PUT",
  grantId: "",
  action: "input",
  cookie: "",
  bearerToken: "",
};

export default function Nq57TextAggregationPage() {
  const [templateRows, setTemplateRows] = useState<Nq57JsonRow[]>(sampleRows);
  const [units, setUnits] = useState<UnitDraft[]>(sampleUnits);
  const [selectedSectionKey, setSelectedSectionKey] = useState(sectionKey(sampleRows[2]));
  const [selectedUnitId, setSelectedUnitId] = useState(sampleUnits[0].unitId);
  const [query, setQuery] = useState("");
  const [repairMojibake, setRepairMojibake] = useState(true);
  const [tab, setTab] = useState<"edit" | "preview" | "json">("edit");
  const [builtRows, setBuiltRows] = useState<Nq57JsonRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushDraft, setPushDraft] = useState<PushDraft>(defaultPushDraft);

  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const unitsInputRef = useRef<HTMLInputElement | null>(null);
  const wordInputRef = useRef<HTMLInputElement | null>(null);

  const [buildPayload, buildState] = useBuildNq57SavePayloadMutation();
  const [pushPayload, pushState] = usePushNq57PayloadMutation();

  const tree = useMemo(() => buildSectionTree(templateRows), [templateRows]);
  const flatSections = useMemo(() => flattenSections(tree), [tree]);
  const visibleSections = useMemo(() => filterSections(flatSections, query), [flatSections, query]);
  const sectionInputStats = useMemo(() => {
    const filled = flatSections.filter((section) =>
      units.some((unit) => {
        const value = unit.values[section.key];
        return Boolean(value?.html?.trim() || value?.text?.trim());
      }),
    ).length;
    return { filled, empty: Math.max(0, flatSections.length - filled) };
  }, [flatSections, units]);
  const selectedSection = flatSections.find((section) => section.key === selectedSectionKey) ?? flatSections[0];
  const selectedUnit = units.find((unit) => unit.unitId === selectedUnitId) ?? units[0];
  const currentValue = selectedUnit && selectedSection
    ? selectedUnit.values[selectedSection.key] ?? { html: "", text: "" }
    : { html: "", text: "" };
  const templateTitle = asString(templateRows[0]?.idxName) || "Tổng hợp NQ57";

  useEffect(() => {
    if (!selectedSectionKey && flatSections[0]) {
      setSelectedSectionKey(flatSections[0].key);
    }
  }, [flatSections, selectedSectionKey]);

  useEffect(() => {
    if (!units.some((unit) => unit.unitId === selectedUnitId) && units[0]) {
      setSelectedUnitId(units[0].unitId);
    }
  }, [selectedUnitId, units]);

  const updateSelectedValue = (html: string | null) => {
    if (!selectedSection || !selectedUnit) return;
    const nextHtml = html ?? "";
    const nextText = htmlToText(nextHtml);

    setUnits((prev) =>
      prev.map((unit) =>
        unit.unitId === selectedUnit.unitId
          ? {
              ...unit,
              values: {
                ...unit.values,
                [selectedSection.key]: { html: nextHtml, text: nextText },
              },
            }
          : unit,
      ),
    );
    setBuiltRows([]);
  };

  const handleTemplateFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = await readJsonFile(file);
      const rows = normalizeTemplateRows(repairMojibake ? deepRepairMojibake(parsed) : parsed);
      if (rows.length === 0) throw new Error("Không tìm thấy mảng mục lục NQ57.");
      setTemplateRows(rows);
      setSelectedSectionKey(sectionKey(rows[0]));
      setBuiltRows([]);
      setMessage(`Đã nạp ${rows.length} mục từ ${file.name}.`);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleUnitsFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = await readJsonFile(file);
      const nextUnits = normalizeImportedUnits(repairMojibake ? deepRepairMojibake(parsed) : parsed);
      if (nextUnits.length === 0) throw new Error("Không tìm thấy dữ liệu đơn vị.");
      setUnits(nextUnits);
      setSelectedUnitId(nextUnits[0].unitId);
      setBuiltRows([]);
      setMessage(`Đã nạp ${nextUnits.length} đơn vị từ ${file.name}.`);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleWordFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (/\.docx$/i.test(file.name)) {
      setError("DOCX cần bộ chuyển đổi riêng; hiện có thể nhập HTML, TXT hoặc DOC dạng HTML để tránh sai style NQ57.");
      return;
    }

    try {
      const text = await file.text();
      const html = /<\/?[a-z][\s\S]*>/i.test(text) ? text : plainTextToHtml(text);
      updateSelectedValue(html);
      setMessage(`Đã nhập nội dung từ ${file.name}.`);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const buildRequest = (): Nq57BuildSavePayloadRequest => ({
    templateRows,
    preserveTemplateWhenEmpty: true,
    generatedBy: "tdtd-nq57",
    sections: flatSections.map<Nq57SectionAggregationDto>((section) => ({
      idxId: section.idxId,
      idxCode: section.idxCode,
      units: units
        .map((unit) => ({
          unitId: unit.unitId,
          unitName: unit.unitName,
          html: unit.values[section.key]?.html ?? "",
          text: unit.values[section.key]?.text ?? htmlToText(unit.values[section.key]?.html ?? ""),
        }))
        .filter((unit) => (unit.html ?? "").trim() || (unit.text ?? "").trim()),
    })),
  });

  const handleBuildPayload = async () => {
    try {
      const result = await buildPayload(buildRequest()).unwrap();
      setBuiltRows(result.rows);
      setMessage(`Đã build ${result.rowCount} dòng JSON, map ${result.mappedSectionCount} mục từ ${result.unitCount} đơn vị.`);
      setError(null);
      return result.rows;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    }
  };

  const handleExportJson = async () => {
    const rows = builtRows.length > 0 ? builtRows : await handleBuildPayload();
    if (!rows) return;
    downloadText("nq57-save-payload.json", JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
  };

  const handleExportWord = () => {
    const html = buildWordHtml(templateTitle, flatSections, units);
    downloadText("nq57-tong-hop.doc", html, "application/msword;charset=utf-8");
  };

  const handlePush = async () => {
    const rows = builtRows.length > 0 ? builtRows : await handleBuildPayload();
    if (!rows) return;

    try {
      const result = await pushPayload({
        url: pushDraft.url,
        method: pushDraft.method,
        grantId: pushDraft.grantId ? Number(pushDraft.grantId) : null,
        action: pushDraft.action || "input",
        cookie: pushDraft.cookie || null,
        bearerToken: pushDraft.bearerToken || null,
        payload: rows,
      }).unwrap();
      setMessage(`Hệ 57 trả ${result.statusCode} trong ${result.elapsedMs}ms.`);
      setError(result.success ? null : result.bodyPreview || result.reasonPhrase || "Hệ 57 trả lỗi.");
      setPushOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const selectedAggregateHtml = selectedSection ? buildSectionAggregateHtml(selectedSection, units) : "";

  return (
    <Box sx={{ height: "calc(100vh - 96px)", display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Stack direction={{ xs: "column", xl: "row" }} alignItems={{ xs: "stretch", xl: "center" }} justifyContent="space-between" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <ArticleOutlinedIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={800}>{templateTitle}</Typography>
            <Typography variant="body2" color="text.secondary">Tổng hợp văn bản theo mục lục NQ57</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button startIcon={<UploadFileOutlinedIcon />} variant="outlined" onClick={() => templateInputRef.current?.click()}>
            Mẫu NQ57
          </Button>
          <Button startIcon={<DataObjectOutlinedIcon />} variant="outlined" onClick={() => unitsInputRef.current?.click()}>
            Dữ liệu đơn vị
          </Button>
          <Button startIcon={<CloudUploadOutlinedIcon />} variant="outlined" onClick={() => wordInputRef.current?.click()}>
            Word/HTML
          </Button>
          <Button startIcon={<DownloadOutlinedIcon />} variant="outlined" onClick={handleExportWord}>
            Xuất Word
          </Button>
          <Button startIcon={<DataObjectOutlinedIcon />} variant="contained" onClick={handleExportJson} disabled={buildState.isLoading}>
            Xuất JSON
          </Button>
          <Button startIcon={<SendOutlinedIcon />} color="secondary" variant="contained" onClick={() => setPushOpen(true)}>
            Lưu hệ 57
          </Button>
        </Stack>
      </Stack>

      {(message || error) && (
        <Stack spacing={1}>
          {message && <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert>}
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        </Stack>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "340px minmax(0, 1fr)" },
          gap: 1.5,
        }}
      >
        <Paper variant="outlined" sx={{ minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Stack spacing={1.25} sx={{ p: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800} textAlign="center">Mục lục</Typography>
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "success.main" }} />
                <Typography variant="caption">Đã nhập: <b>{sectionInputStats.filled}</b></Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "error.main" }} />
                <Typography variant="caption">Chưa nhập: <b>{sectionInputStats.empty}</b></Typography>
              </Stack>
            </Stack>
            <TextField
              size="small"
              placeholder="Nhập để tìm kiếm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Chip size="small" label={`${flatSections.length} mục`} />
              <FormControlLabel
                sx={{ mr: 0 }}
                control={<Switch size="small" checked={repairMojibake} onChange={(event) => setRepairMojibake(event.target.checked)} />}
                label={<Typography variant="caption">Sửa mojibake</Typography>}
              />
            </Stack>
          </Stack>
          <Divider />
          <Box sx={{ overflow: "auto", p: 1 }}>
            {visibleSections.map((section) => {
              const active = section.key === selectedSection?.key;
              const hasInput = units.some((unit) => {
                const value = unit.values[section.key];
                return Boolean(value?.html?.trim() || value?.text?.trim());
              });
              return (
                <Button
                  key={section.key}
                  fullWidth
                  onClick={() => setSelectedSectionKey(section.key)}
                  sx={{
                    minHeight: 36,
                    justifyContent: "flex-start",
                    textAlign: "left",
                    px: 1,
                    pl: 1 + section.depth * 2,
                    mb: 0.25,
                    borderRadius: 1,
                    color: active ? "primary.contrastText" : "text.primary",
                    bgcolor: active ? "primary.main" : "transparent",
                    "&:hover": { bgcolor: active ? "primary.dark" : "action.hover" },
                  }}
                >
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: hasInput ? "success.main" : "error.light", mr: 1, flex: "0 0 auto" }} />
                  <Typography variant="body2" noWrap>{section.title}</Typography>
                </Button>
              );
            })}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Stack direction={{ xs: "column", xl: "row" }} spacing={1} alignItems={{ xs: "stretch", xl: "center" }} justifyContent="space-between" sx={{ p: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>{selectedSection?.title ?? "Chọn mục"}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                idxId: {selectedSection?.idxId ?? "-"} · idxCode: {selectedSection?.idxCode ?? "-"}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                select
                label="Đơn vị"
                value={selectedUnit?.unitId ?? ""}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                sx={{ minWidth: { xs: 180, sm: 260 } }}
              >
                {units.map((unit) => (
                  <MenuItem key={unit.unitId} value={unit.unitId}>{unit.unitName}</MenuItem>
                ))}
              </TextField>
              <Tooltip title="Build payload theo style CKEditor 4">
                <span>
                  <IconButton color="primary" onClick={handleBuildPayload} disabled={buildState.isLoading}>
                    <DataObjectOutlinedIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
          <Divider />
          <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ px: 1.5, minHeight: 44 }}>
            <Tab value="edit" icon={<EditNoteOutlinedIcon />} iconPosition="start" label="Soạn" />
            <Tab value="preview" icon={<VisibilityOutlinedIcon />} iconPosition="start" label="Tổng hợp" />
            <Tab value="json" icon={<DataObjectOutlinedIcon />} iconPosition="start" label="JSON" />
          </Tabs>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 1.5, lg: 2 }, bgcolor: "#f7f7f8" }}>
            {tab === "edit" && (
              <Suspense fallback={<Skeleton variant="rounded" height={420} />}>
                <RichDocumentEditor
                  key={`${selectedUnit?.unitId ?? "unit"}-${selectedSection?.key ?? "section"}`}
                  label={selectedSection?.title ?? "Nội dung"}
                  value={currentValue.html}
                  required={false}
                  minHeight={460}
                  locked={!selectedUnit || !selectedSection}
                  onChange={updateSelectedValue}
                />
              </Suspense>
            )}
            {tab === "preview" && (
              <Box sx={wordPreviewSx}>
                <Typography variant="h6" fontWeight={800} textAlign="center" sx={{ mb: 2 }}>{selectedSection?.title}</Typography>
                <Box dangerouslySetInnerHTML={{ __html: selectedAggregateHtml }} />
              </Box>
            )}
            {tab === "json" && (
              <TextField
                value={builtRows.length > 0 ? JSON.stringify(builtRows, null, 2) : JSON.stringify(buildRequest(), null, 2)}
                multiline
                fullWidth
                minRows={22}
                InputProps={{ readOnly: true }}
                sx={{ bgcolor: "background.paper", "& textarea": { fontFamily: "Consolas, monospace", fontSize: 12 } }}
              />
            )}
          </Box>
        </Paper>
      </Box>

      <input ref={templateInputRef} hidden type="file" accept=".json,.txt" onChange={handleTemplateFile} />
      <input ref={unitsInputRef} hidden type="file" accept=".json,.txt" onChange={handleUnitsFile} />
      <input ref={wordInputRef} hidden type="file" accept=".html,.htm,.txt,.doc,.docx" onChange={handleWordFile} />

      <Dialog open={pushOpen} onClose={() => setPushOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Lưu sang hệ 57</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField label="URL" value={pushDraft.url} onChange={(event) => setPushDraft((prev) => ({ ...prev, url: event.target.value }))} fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField select label="Method" value={pushDraft.method} onChange={(event) => setPushDraft((prev) => ({ ...prev, method: event.target.value as PushDraft["method"] }))} sx={{ minWidth: 140 }}>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PATCH">PATCH</MenuItem>
              </TextField>
              <TextField label="grant_id" value={pushDraft.grantId} onChange={(event) => setPushDraft((prev) => ({ ...prev, grantId: event.target.value }))} fullWidth />
              <TextField label="action" value={pushDraft.action} onChange={(event) => setPushDraft((prev) => ({ ...prev, action: event.target.value }))} fullWidth />
            </Stack>
            <TextField
              label="Cookie"
              value={pushDraft.cookie}
              onChange={(event) => setPushDraft((prev) => ({ ...prev, cookie: event.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Bearer token"
              type="password"
              value={pushDraft.bearerToken}
              onChange={(event) => setPushDraft((prev) => ({ ...prev, bearerToken: event.target.value }))}
              fullWidth
            />
            <Alert severity="warning">Cookie/token chỉ gửi trong request này, không ghi vào mã nguồn hoặc local storage.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPushOpen(false)}>Đóng</Button>
          <Button variant="contained" onClick={handlePush} disabled={pushState.isLoading} startIcon={<SendOutlinedIcon />}>
            Gửi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const wordPreviewSx = {
  maxWidth: 920,
  mx: "auto",
  minHeight: 620,
  bgcolor: "background.paper",
  color: "text.primary",
  boxShadow: "0 12px 34px rgba(15, 23, 42, 0.12)",
  border: "1px solid",
  borderColor: "divider",
  p: { xs: 2, md: 5 },
  fontFamily: '"Times New Roman", serif',
  "& p": { my: 1, textAlign: "justify" },
};

function asString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function sectionKey(row: Nq57JsonRow | undefined) {
  if (!row) return "";
  return asString(row.idxId || row.idxCode || row.id);
}

function buildSectionTree(rows: Nq57JsonRow[]): SectionNode[] {
  const nodes = rows.map<SectionNode>((row, index) => ({
    key: sectionKey(row),
    idxId: asString(row.idxId) || null,
    idxCode: asString(row.idxCode) || null,
    parentId: asString(row.parentId) || null,
    title: asString(row.idxName) || asString(row.name) || `Mục ${index + 1}`,
    depth: 0,
    order: Number(row.idxOrder ?? row.idxIndex ?? index),
    row,
    children: [],
  }));
  const byKey = new Map<string, SectionNode>();
  nodes.forEach((node) => {
    byKey.set(node.key, node);
    if (node.idxId) byKey.set(node.idxId, node);
  });

  const roots: SectionNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentId ? byKey.get(node.parentId) : null;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortAndDepth = (items: SectionNode[], depth: number) => {
    items.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "vi"));
    items.forEach((item) => {
      item.depth = depth;
      sortAndDepth(item.children, depth + 1);
    });
  };
  sortAndDepth(roots, 0);
  return roots;
}

function flattenSections(nodes: SectionNode[]) {
  const result: SectionNode[] = [];
  const visit = (node: SectionNode) => {
    result.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

function filterSections(sections: SectionNode[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections.filter((section) => `${section.title} ${section.idxId ?? ""} ${section.idxCode ?? ""}`.toLowerCase().includes(q));
}

async function readJsonFile(file: File) {
  const text = await file.text();
  return JSON.parse(text) as unknown;
}

function normalizeTemplateRows(input: unknown): Nq57JsonRow[] {
  if (Array.isArray(input)) return input.filter(isRecord);
  if (isRecord(input)) {
    for (const key of ["rows", "data", "items", "result"]) {
      const value = input[key];
      if (Array.isArray(value)) return value.filter(isRecord);
    }
  }
  return [];
}

function normalizeImportedUnits(input: unknown): UnitDraft[] {
  const payload = isRecord(input) && Array.isArray(input.units) ? input.units : input;
  if (Array.isArray(payload) && payload.every(isRecord) && payload.some((row) => "idxId" in row && ("orgId" in row || "inputOrgId" in row))) {
    return normalizeNq57RowsAsUnits(payload);
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord).map((item, index) => normalizeUnitObject(item, index)).filter((unit): unit is UnitDraft => Boolean(unit));
  }
  if (isRecord(payload)) {
    return Object.entries(payload).map(([unitId, value], index) => normalizeUnitObject({ unitId, unitName: unitId, sections: value }, index)).filter((unit): unit is UnitDraft => Boolean(unit));
  }
  return [];
}

function normalizeNq57RowsAsUnits(rows: Nq57JsonRow[]): UnitDraft[] {
  const byUnit = new Map<string, UnitDraft>();
  rows.forEach((row) => {
    const unitId = asString(row.inputOrgId || row.orgId || row.unitId || row.updateUserOrgId);
    if (!unitId) return;
    const unitName = asString(row.orgName || row.updateUserOrgName || row.unitName || row.inputOrgName) || unitId;
    const key = sectionKey(row);
    if (!key) return;
    const html = asString(row.idxContent || row.html);
    const text = asString(row.idxContentRaw || row.text) || htmlToText(html);
    const current = byUnit.get(unitId) ?? { unitId, unitName, values: {} };
    current.values[key] = { html, text };
    byUnit.set(unitId, current);
  });
  return Array.from(byUnit.values());
}

function normalizeUnitObject(item: Nq57JsonRow, index: number): UnitDraft | null {
  const unitId = asString(item.unitId || item.id || item.orgId || item.inputOrgId) || `unit-${index + 1}`;
  const unitName = asString(item.unitName || item.name || item.orgName || item.inputOrgName) || unitId;
  const source = item.sections ?? item.values ?? item.data;
  if (!isRecord(source)) return { unitId, unitName, values: {} };

  const values: Record<string, UnitSectionValue> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (isRecord(value)) {
      const html = asString(value.html || value.idxContent || value.content);
      const text = asString(value.text || value.idxContentRaw) || htmlToText(html);
      values[key] = { html, text };
    } else {
      const text = asString(value);
      values[key] = { html: plainTextToHtml(text), text };
    }
  });
  return { unitId, unitName, values };
}

function isRecord(value: unknown): value is Nq57JsonRow {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function htmlToText(html: string) {
  if (!html.trim()) return "";
  const template = document.createElement("template");
  template.innerHTML = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  return (template.content.textContent ?? "").replace(/\u00a0/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

function plainTextToHtml(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function buildSectionAggregateHtml(section: SectionNode, units: UnitDraft[]) {
  return units
    .map((unit) => {
      const value = unit.values[section.key];
      if (!value?.html?.trim() && !value?.text?.trim()) return "";
      const html = value.html?.trim() || plainTextToHtml(value.text);
      return `<p><b>${escapeHtml(unit.unitName)}</b></p>${sanitizePreviewHtml(html)}`;
    })
    .filter(Boolean)
    .join("");
}

function buildWordHtml(title: string, sections: SectionNode[], units: UnitDraft[]) {
  const body = sections
    .map((section) => {
      const aggregate = buildSectionAggregateHtml(section, units);
      if (!aggregate.trim()) return "";
      return `<h2>${escapeHtml(section.title)}</h2>${aggregate}`;
    })
    .filter(Boolean)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:"Times New Roman",serif;font-size:14pt;line-height:1.35}p{text-align:justify;margin:8px 0}h1,h2{font-family:"Times New Roman",serif}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

function sanitizePreviewHtml(html: string) {
  return html
    .replace(/<\s*(script|style)\b[^>]*>.*?<\s*\/\s*\1\s*>/gis, "")
    .replace(/\s+on[a-z0-9_:-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function deepRepairMojibake(value: unknown): unknown {
  if (typeof value === "string") return repairMojibakeString(value);
  if (Array.isArray(value)) return value.map(deepRepairMojibake);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepRepairMojibake(item)]));
  }
  return value;
}

const cp1252Bytes: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function repairMojibakeString(value: string) {
  if (!/[ÃÄÂÆâ]/.test(value)) return value;

  const bytes: number[] = [];
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
    } else if (cp1252Bytes[char] !== undefined) {
      bytes.push(cp1252Bytes[char]);
    } else {
      return value;
    }
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return mojibakeScore(decoded) < mojibakeScore(value) ? decoded : value;
  } catch {
    return value;
  }
}

function mojibakeScore(value: string) {
  return (value.match(/[ÃÄÂÆâ]/g) ?? []).length;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (isRecord(error)) {
    const data = error.data;
    if (isRecord(data)) return asString(data.message || data.error || JSON.stringify(data));
    return asString(error.message || error.error || JSON.stringify(error));
  }
  return "Thao tác không thành công.";
}
