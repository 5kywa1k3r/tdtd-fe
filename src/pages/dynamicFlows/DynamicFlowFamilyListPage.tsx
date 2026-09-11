import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import {
  useArchiveDynamicFlowTemplateFamilyMutation,
  useCloneDynamicFlowTemplateFamilyMutation,
  useCreateDynamicFlowTemplateFamilyMutation,
  useSearchDynamicFlowTemplateFamiliesMutation,
  type DynamicFlowTemplateFamilyDto,
  type DynamicFlowTemplateSortField,
  type DynamicFlowTemplateStatus,
  type FlowDefinitionPayloadV2,
} from "../../api/dynamicFlowTemplateApi";
import { useGetMeQuery } from "../../api/base/meApi";
import { dynamicFlowVersionPath } from "../../routes/dynamicFlowRoutes";
import { normalizeApiError } from "../../utils/apiError";
import {
  canCreateDynamicFlowDefinition,
  createDynamicFlowWorkspaceCommandId,
} from "./dynamicFlowWorkspaceModel";

type ListState = {
  rows: DynamicFlowTemplateFamilyDto[];
  totalRows: number;
  loaded: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STATUS_OPTIONS: Array<{ value: "" | DynamicFlowTemplateStatus; label: string }> = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

function nonNegativeInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function pageSizeFromUrl(value: string | null) {
  const parsed = nonNegativeInteger(value, 20);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : 20;
}

function sortFromUrl(value: string | null): DynamicFlowTemplateSortField {
  return value === "createdAtUtc" ||
    value === "code" ||
    value === "name" ||
    value === "status"
    ? value
    : "updatedAtUtc";
}

function createInitialPayload(rootDynamicFormTemplateId: string, archetypeId: string): FlowDefinitionPayloadV2 {
  const formNodeId = "form-node-root";
  const entryStepId = "step-root";
  const entryNode: FlowDefinitionPayloadV2["nodes"][number] = {
    nodeId: entryStepId,
    nodeCode: "ROOT",
    nodeKind: "FORM_STEP",
    name: "Bước biểu mẫu gốc",
    formNodeId,
    declaredRoles: ["ASSIGNEE"],
    gateway: null,
  };
  const finalizeGatewayId = "epoch-gate";
  const finalNodeId = "final";
  const isFinalizeArchetype = archetypeId.trim().toUpperCase() === "FLOW-T12";
  const nodes: FlowDefinitionPayloadV2["nodes"] = isFinalizeArchetype
    ? [
        entryNode,
        {
          nodeId: finalizeGatewayId,
          nodeCode: "EPOCH_GATE",
          nodeKind: "GATEWAY",
          name: "Cổng hoàn tất execution epoch",
          formNodeId: null,
          declaredRoles: [],
          gateway: {
            kind: "ROLLBACK_FINALIZE",
            expectedIncomingNodeIds: [],
            requiredIncomingCount: null,
            reviewRole: null,
            subflowFamilyId: null,
            subflowVersionId: null,
            scheduleKey: null,
            rollbackTargetNodeId: entryStepId,
          },
        },
        {
          nodeId: finalNodeId,
          nodeCode: "FINAL",
          nodeKind: "FINAL",
          name: "Hoàn tất",
          formNodeId: null,
          declaredRoles: [],
          gateway: null,
        },
      ]
    : [entryNode];
  const edges: FlowDefinitionPayloadV2["edges"] = isFinalizeArchetype
    ? [
        { transitionId: "tr-entry-epoch", fromNodeId: entryStepId, toNodeId: finalizeGatewayId },
        { transitionId: "tr-epoch-final", fromNodeId: finalizeGatewayId, toNodeId: finalNodeId },
      ]
    : [];
  return {
    schemaVersion: 2,
    archetypeId,
    entryStepId,
    rootDynamicFormTemplateId,
    formNodes: [
      { formNodeId, role: "ROOT", dynamicFormTemplateId: rootDynamicFormTemplateId },
    ],
    nodes,
    edges,
    actorPolicies: [
      {
        policyId: "actor-policy-root-assignee",
        stepId: entryStepId,
        stepCode: "*",
        actorRole: "ASSIGNEE",
        allowSubFlow: false,
        allowForward: true,
        canFinalize: false,
      },
    ],
    fieldPolicies: [],
    tableColumnPolicies: [],
    mappingRules: [],
    resultOwnerStepId: entryStepId,
    resultOwnerFormNodeId: formNodeId,
    statisticsOwnerStepId: null,
    statisticsOwnerFormNodeId: null,
    rollbackPolicy: {},
    finalResultPolicy: {},
    statisticProfile: {},
  };
}

function preferredVersionId(family: DynamicFlowTemplateFamilyDto): string | null {
  return family.draftVersion?.id ??
    family.currentVersionId ??
    family.versions.find((version) => version.canRead)?.id ??
    family.versions[0]?.id ??
    null;
}

function preferredCloneSource(family: DynamicFlowTemplateFamilyDto) {
  return family.draftVersion ??
    family.currentVersion ??
    family.versions.find((version) => version.canRead) ??
    family.versions[0] ??
    null;
}

export default function DynamicFlowFamilyListPage() {
  const navigate = useNavigate();
  const meQuery = useGetMeQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const statusParam = searchParams.get("status");
  const status = STATUS_OPTIONS.some((item) => item.value === statusParam)
    ? (statusParam as DynamicFlowTemplateStatus | "")
    : "";
  const sortBy = sortFromUrl(searchParams.get("sort"));
  const sortDirection = searchParams.get("direction") === "ASC" ? "ASC" : "DESC";
  const page = nonNegativeInteger(searchParams.get("page"), 0);
  const pageSize = pageSizeFromUrl(searchParams.get("pageSize"));
  const [searchText, setSearchText] = useState(query);
  const [list, setList] = useState<ListState>({ rows: [], totalRows: 0, loaded: false });
  const [listError, setListError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [rootFormId, setRootFormId] = useState("");
  const [archetypeId, setArchetypeId] = useState("FLOW-T01");
  const [createError, setCreateError] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<DynamicFlowTemplateFamilyDto | null>(null);
  const [cloneCode, setCloneCode] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DynamicFlowTemplateFamilyDto | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [searchFamilies, searchState] = useSearchDynamicFlowTemplateFamiliesMutation();
  const [createFamily, createState] = useCreateDynamicFlowTemplateFamilyMutation();
  const [cloneFamily, cloneState] = useCloneDynamicFlowTemplateFamilyMutation();
  const [archiveFamily, archiveState] = useArchiveDynamicFlowTemplateFamilyMutation();
  const canCreateFamily = canCreateDynamicFlowDefinition(
    meQuery.data?.roles,
    meQuery.data?.unitId,
  );

  const patchSearchParams = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  };

  const reload = async () => {
    const requestId = ++requestSequence.current;
    setListError(null);
    try {
      const result = await searchFamilies({
        query: query || null,
        status: status || null,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }).unwrap();
      if (requestId !== requestSequence.current) return;
      setList({ rows: result.rows ?? [], totalRows: result.totalRows ?? 0, loaded: true });
    } catch (caught) {
      if (requestId !== requestSequence.current) return;
      setListError(normalizeApiError(caught).message);
      setList((current) => ({ ...current, loaded: true }));
    }
  };

  useEffect(() => {
    setSearchText(query);
    void reload();
  }, [page, pageSize, query, sortBy, sortDirection, status]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    patchSearchParams({ q: searchText.trim() || null, page: 0 });
  };

  const openFamily = (family: DynamicFlowTemplateFamilyDto) => {
    const targetVersionId = preferredVersionId(family);
    if (!targetVersionId) return;
    navigate(dynamicFlowVersionPath(family.familyId, targetVersionId, "overview"));
  };

  const submitCreate = async () => {
    const code = createCode.trim().toUpperCase();
    const name = createName.trim();
    const root = rootFormId.trim();
    if (!code || !name || !root || !archetypeId.trim()) {
      setCreateError("Mã, tên, archetype và ID phiên bản biểu mẫu gốc là bắt buộc.");
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9_.-]*$/.test(code)) {
      setCreateError("Mã family chỉ gồm chữ in hoa, số, dấu chấm, gạch ngang hoặc gạch dưới.");
      return;
    }
    setCreateError(null);
    try {
      const created = await createFamily({
        commandId: createDynamicFlowWorkspaceCommandId("create"),
        code,
        name,
        description: createDescription.trim() || null,
        rootDynamicFormTemplateId: root,
        dynamicFormTemplateId: root,
        payload: createInitialPayload(root, archetypeId.trim()),
      }).unwrap();
      const targetVersionId = preferredVersionId(created);
      if (targetVersionId) {
        navigate(dynamicFlowVersionPath(created.familyId, targetVersionId, "overview"));
      } else {
        setCreateOpen(false);
        await reload();
      }
    } catch (caught) {
      setCreateError(normalizeApiError(caught).message);
    }
  };

  const openClone = (family: DynamicFlowTemplateFamilyDto) => {
    if (!canCreateFamily || !family.canManage) return;
    setCloneTarget(family);
    setCloneCode(`${family.code}_COPY`);
    setCloneName(`${family.name} (bản sao)`);
    setCloneError(null);
  };

  const submitClone = async () => {
    if (!cloneTarget || !canCreateFamily || !cloneTarget.canManage) return;
    const source = preferredCloneSource(cloneTarget);
    if (!source) {
      setCloneError("Không tìm thấy phiên bản nguồn để sao chép.");
      return;
    }
    const code = cloneCode.trim().toUpperCase();
    const name = cloneName.trim();
    if (!code || !name) {
      setCloneError("Mã và tên family bản sao là bắt buộc.");
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9_.-]*$/.test(code)) {
      setCloneError("Mã family chỉ gồm chữ in hoa, số, dấu chấm, gạch ngang hoặc gạch dưới.");
      return;
    }
    setCloneError(null);
    try {
      const cloned = await cloneFamily({
        familyId: cloneTarget.familyId,
        body: {
          commandId: createDynamicFlowWorkspaceCommandId("clone"),
          expectedFamilyRevision: cloneTarget.familyRevision,
          sourceVersionId: source.id,
          sourceDraftRevision: source.draftRevision,
          sourcePayloadHash: source.payloadHash,
          code,
          name,
        },
      }).unwrap();
      setCloneTarget(null);
      const targetVersionId = preferredVersionId(cloned);
      if (targetVersionId) {
        navigate(dynamicFlowVersionPath(cloned.familyId, targetVersionId, "overview"));
      } else {
        await reload();
      }
    } catch (caught) {
      setCloneError(normalizeApiError(caught).message);
    }
  };

  const submitArchive = async () => {
    if (!archiveTarget) return;
    setArchiveError(null);
    try {
      await archiveFamily({
        familyId: archiveTarget.familyId,
        body: {
          commandId: createDynamicFlowWorkspaceCommandId("archive"),
          expectedFamilyRevision: archiveTarget.familyRevision,
        },
      }).unwrap();
      setArchiveTarget(null);
      await reload();
    } catch (caught) {
      setArchiveError(normalizeApiError(caught).message);
    }
  };

  return (
    <Stack spacing={2} sx={{ p: { xs: 1.25, md: 2.5 }, minWidth: 0 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={1.5}>
        <Box>
          <Stack direction="row" gap={1} alignItems="center">
            <AccountTreeOutlinedIcon color="primary" />
            <Typography variant="h5" fontWeight={900}>Thiết kế quy trình</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Danh sách họ và phiên bản quy trình. Mỗi trang được tải trực tiếp từ máy chủ, không giới hạn danh sách ở client.
          </Typography>
        </Box>
        {canCreateFamily ? (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
            Tạo family
          </Button>
        ) : null}
      </Stack>

      <Paper component="form" variant="outlined" sx={{ p: 2 }} onSubmit={submitSearch}>
        <Stack direction={{ xs: "column", lg: "row" }} gap={1.5} alignItems={{ lg: "center" }}>
          <TextField
            size="small"
            label="Tìm theo mã hoặc tên"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            sx={{ flex: 1, minWidth: { lg: 280 } }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="flow-status-filter-label">Trạng thái</InputLabel>
            <Select
              labelId="flow-status-filter-label"
              label="Trạng thái"
              value={status}
              onChange={(event) => patchSearchParams({ status: event.target.value || null, page: 0 })}
            >
              {STATUS_OPTIONS.map((item) => <MenuItem key={item.value || "all"} value={item.value}>{item.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 175 }}>
            <InputLabel id="flow-sort-label">Sắp xếp</InputLabel>
            <Select
              labelId="flow-sort-label"
              label="Sắp xếp"
              value={sortBy}
              onChange={(event) => patchSearchParams({ sort: event.target.value, page: 0 })}
            >
              <MenuItem value="updatedAtUtc">Cập nhật</MenuItem>
              <MenuItem value="createdAtUtc">Ngày tạo</MenuItem>
              <MenuItem value="code">Mã</MenuItem>
              <MenuItem value="name">Tên</MenuItem>
              <MenuItem value="status">Trạng thái</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="flow-direction-label">Thứ tự</InputLabel>
            <Select
              labelId="flow-direction-label"
              label="Thứ tự"
              value={sortDirection}
              onChange={(event) => patchSearchParams({ direction: event.target.value, page: 0 })}
            >
              <MenuItem value="DESC">Giảm dần</MenuItem>
              <MenuItem value="ASC">Tăng dần</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="outlined" startIcon={<SearchRoundedIcon />}>Tìm</Button>
        </Stack>
      </Paper>

      {listError ? (
        <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>Thử lại</Button>}>
          {listError}
        </Alert>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Danh sách family quy trình">
          <TableHead>
            <TableRow>
              <TableCell>Mã / tên</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Phiên bản</TableCell>
              <TableCell>Quyền hiện tại</TableCell>
              <TableCell>Cập nhật</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchState.isLoading && !list.loaded
              ? Array.from({ length: Math.min(pageSize, 8) }, (_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={6}><Skeleton height={42} /></TableCell>
                  </TableRow>
                ))
              : list.rows.map((family) => {
                  const versionId = preferredVersionId(family);
                  return (
                    <TableRow key={family.familyId} hover>
                      <TableCell>
                        <Typography fontWeight={800}>{family.code}</Typography>
                        <Typography variant="body2">{family.name}</Typography>
                      </TableCell>
                      <TableCell><Chip size="small" label={family.status} color={family.status === "ARCHIVED" ? "default" : family.status === "ACTIVE" ? "success" : "warning"} /></TableCell>
                      <TableCell>
                        {family.draftVersion ? `Draft v${family.draftVersion.versionNo}` : family.currentVersionNo ? `Locked v${family.currentVersionNo}` : "Chưa có"}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          <Chip size="small" variant="outlined" label={family.canManage ? "Quản lý" : "Chỉ đọc"} />
                          <Chip size="small" variant="outlined" color="warning" label={`Execute: ${family.canExecute ? "yes" : "blocked"}`} />
                        </Stack>
                      </TableCell>
                      <TableCell>{new Date(family.updatedAtUtc).toLocaleString("vi-VN")}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" gap={0.5} justifyContent="flex-end" flexWrap="wrap">
                          {family.canManage && canCreateFamily ? (
                            <Button
                              size="small"
                              startIcon={<ContentCopyRoundedIcon />}
                              onClick={() => openClone(family)}
                            >
                              Sao chép
                            </Button>
                          ) : null}
                          {family.canManage && family.status !== "ARCHIVED" ? (
                            <Button
                              size="small"
                              color="warning"
                              startIcon={<ArchiveOutlinedIcon />}
                              onClick={() => {
                                setArchiveTarget(family);
                                setArchiveError(null);
                              }}
                            >
                              Lưu trữ
                            </Button>
                          ) : null}
                          <Button
                            size="small"
                            endIcon={<OpenInNewRoundedIcon />}
                            disabled={!family.canRead || !versionId}
                            onClick={() => openFamily(family)}
                          >
                            Mở version
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!searchState.isLoading && !listError && list.loaded && list.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Stack alignItems="center" spacing={0.5} sx={{ py: 5 }}>
                    <Typography fontWeight={800}>Không có family phù hợp</Typography>
                    <Typography variant="body2" color="text.secondary">Đổi bộ lọc hoặc tạo một family mới.</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={list.totalRows}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          onPageChange={(_event, nextPage) => patchSearchParams({ page: nextPage })}
          onRowsPerPageChange={(event) => patchSearchParams({ pageSize: event.target.value, page: 0 })}
          labelRowsPerPage="Số dòng mỗi trang"
        />
      </TableContainer>

      <Dialog open={createOpen} onClose={createState.isLoading ? undefined : () => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 850 }}>Tạo họ quy trình</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {createError ? <Alert severity="error">{createError}</Alert> : null}
            <TextField label="Mã family" value={createCode} onChange={(event) => setCreateCode(event.target.value.toUpperCase())} inputProps={{ maxLength: 80 }} required />
            <TextField label="Tên family" value={createName} onChange={(event) => setCreateName(event.target.value)} required />
            <TextField label="Mô tả" value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} multiline minRows={2} />
            <TextField
              label="ID phiên bản biểu mẫu gốc đã phát hành"
              value={rootFormId}
              onChange={(event) => setRootFormId(event.target.value)}
              helperText="Nhập ID chính xác; backend kiểm tra quyền và trạng thái phát hành. Không tải trước danh sách form bị cắt ngọn."
              required
            />
            <TextField label="Archetype catalog" value={archetypeId} onChange={(event) => setArchetypeId(event.target.value)} helperText="Ví dụ FLOW-T01..T12 trong catalog 1.3 hiện hành." required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={createState.isLoading} onClick={() => setCreateOpen(false)}>Hủy</Button>
          <Button variant="contained" disabled={createState.isLoading} onClick={() => void submitCreate()}>
            {createState.isLoading ? "Đang tạo…" : "Tạo và mở draft"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(cloneTarget)} onClose={cloneState.isLoading ? undefined : () => setCloneTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 850 }}>Sao chép flow family</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Tạo family draft mới từ snapshot của {cloneTarget?.code}. Family nguồn không bị thay đổi.
            </Typography>
            {cloneError ? <Alert severity="error">{cloneError}</Alert> : null}
            <TextField label="Mã family bản sao" value={cloneCode} onChange={(event) => setCloneCode(event.target.value.toUpperCase())} required />
            <TextField label="Tên family bản sao" value={cloneName} onChange={(event) => setCloneName(event.target.value)} required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={cloneState.isLoading} onClick={() => setCloneTarget(null)}>Hủy</Button>
          <Button variant="contained" disabled={cloneState.isLoading} onClick={() => void submitClone()}>
            {cloneState.isLoading ? "Đang sao chép…" : "Tạo bản sao và mở draft"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(archiveTarget)} onClose={archiveState.isLoading ? undefined : () => setArchiveTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 850 }}>Lưu trữ flow family</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography>
              Lưu trữ <strong>{archiveTarget?.code}</strong>? Snapshot đã khóa vẫn được giữ để đọc lịch sử, nhưng family sẽ chuyển sang chỉ đọc.
            </Typography>
            {archiveError ? <Alert severity="error">{archiveError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={archiveState.isLoading} onClick={() => setArchiveTarget(null)}>Hủy</Button>
          <Button color="warning" variant="contained" disabled={archiveState.isLoading} onClick={() => void submitArchive()}>
            {archiveState.isLoading ? "Đang lưu trữ…" : "Xác nhận lưu trữ"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
