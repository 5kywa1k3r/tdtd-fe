import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import {
  type WorkDocumentScope,
  type WorkDocumentRow,
  useCreateAssignmentDocumentUploadSessionMutation,
  useCreateWorkDocumentUploadSessionMutation,
  useDeleteWorkDocumentMutation,
  useGetWorkDocumentUploadOptionsQuery,
  useListWorkDocumentsQuery,
  useUpdateWorkDocumentMutation,
} from "../../../api/workDocumentsApi";
import { useLazyPresignDownloadQuery, useLazyVerifyUploadQuery } from "../../../api/uploadApi";
import { useTusUpload } from "../../../features/uploads/useTusUpload";

type UploadContext =
  | { scope: "WORK" }
  | { scope: "ASSIGNMENT_BRANCH"; assignmentId: string };

export type WorkDocumentLibraryProps = {
  workId: string;
};

const acceptedDocumentTypes = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.rar";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function prettyBytes(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

function assignmentLabel(row: WorkDocumentRow) {
  if (row.scope !== "ASSIGNMENT_BRANCH") return "";
  return row.assignmentCode || row.assignmentId || "Nhánh công việc";
}

function getErrorMessage(error: unknown, fallback: string) {
  const anyError = error as any;
  return anyError?.data?.message || anyError?.data?.title || anyError?.message || fallback;
}

export const WorkDocumentLibrary: React.FC<WorkDocumentLibraryProps> = ({ workId }) => {
  const [scope, setScope] = useState<"ALL" | "WORK" | "ASSIGNMENT_BRANCH">("ALL");
  const [keyword, setKeyword] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [editTarget, setEditTarget] = useState<WorkDocumentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editScope, setEditScope] = useState<WorkDocumentScope>("WORK");
  const [editAssignmentId, setEditAssignmentId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadContextRef = useRef<UploadContext | null>(null);
  const pendingRef = useRef<{ fileName: string } | null>(null);

  const tus = useTusUpload();
  const { data: uploadOptions, isLoading: loadingOptions } = useGetWorkDocumentUploadOptionsQuery(workId, {
    skip: !workId,
  });
  const {
    data: documents,
    isLoading: loadingDocuments,
    isFetching: fetchingDocuments,
    refetch: refetchDocuments,
  } = useListWorkDocumentsQuery(
    {
      workId,
      scope,
      keyword,
    },
    { skip: !workId }
  );

  const [createWorkSession, { isLoading: creatingWorkSession }] = useCreateWorkDocumentUploadSessionMutation();
  const [createAssignmentSession, { isLoading: creatingAssignmentSession }] =
    useCreateAssignmentDocumentUploadSessionMutation();
  const [deleteDocument, { isLoading: deletingDocument }] = useDeleteWorkDocumentMutation();
  const [updateDocument, { isLoading: updatingDocument }] = useUpdateWorkDocumentMutation();
  const [triggerVerify] = useLazyVerifyUploadQuery();
  const [triggerPresign] = useLazyPresignDownloadQuery();

  const assignmentTargets = uploadOptions?.assignmentTargets ?? [];
  const editAssignmentOptions = useMemo(() => {
    const options = [...assignmentTargets];
    if (
      editTarget?.scope === "ASSIGNMENT_BRANCH" &&
      editTarget.assignmentId &&
      !options.some((item) => item.assignmentId === editTarget.assignmentId)
    ) {
      options.unshift({
        assignmentId: editTarget.assignmentId,
        code: editTarget.assignmentCode || editTarget.assignmentId,
        path: editTarget.assignmentPath || "",
        label: assignmentLabel(editTarget),
      });
    }
    return options;
  }, [assignmentTargets, editTarget]);

  useEffect(() => {
    if (!selectedAssignmentId && assignmentTargets.length > 0) {
      setSelectedAssignmentId(assignmentTargets[0].assignmentId);
    }
  }, [assignmentTargets, selectedAssignmentId]);

  const busyUpload =
    tus.state.status === "uploading" ||
    creatingWorkSession ||
    creatingAssignmentSession;
  const openProgress = busyUpload || !!pendingRef.current;
  const canPickWork = Boolean(uploadOptions?.canUploadWork) && !busyUpload && !deletingDocument && !updatingDocument;
  const canPickAssignment =
    assignmentTargets.length > 0 &&
    Boolean(selectedAssignmentId) &&
    !busyUpload &&
    !deletingDocument &&
    !updatingDocument;

  const progressText = useMemo(() => {
    if (tus.state.status !== "uploading") return "";
    return `Đang tải lên: ${tus.state.progress}% (${prettyBytes(tus.state.bytesUploaded)}/${prettyBytes(tus.state.bytesTotal)})`;
  }, [tus.state]);

  const handlePick = (context: UploadContext) => {
    if (busyUpload) return;
    uploadContextRef.current = context;
    fileInputRef.current?.click();
  };

  const uploadOne = async (file: File, context: UploadContext) => {
    const data = {
      fileName: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
    };

    const session =
      context.scope === "WORK"
        ? await createWorkSession({ workId, data }).unwrap()
        : await createAssignmentSession({ workId, assignmentId: context.assignmentId, data }).unwrap();

    pendingRef.current = { fileName: file.name };
    await tus.start({
      file,
      endpoint: session.endpoint,
      uploadToken: session.uploadToken,
      chunkSize: session.chunkSize,
    });
  };

  const handlePicked: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const context = uploadContextRef.current;
    uploadContextRef.current = null;

    if (!context) return;

    try {
      await uploadOne(file, context);
    } catch (err: any) {
      console.error(err);
      pendingRef.current = null;
      alert(err?.message || "Tải tài liệu lên thất bại.");
    }
  };

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    if (tus.state.status === "error") {
      pendingRef.current = null;
      alert(tus.state.error || "Tải tài liệu lên thất bại.");
      return;
    }

    if (tus.state.status === "success") {
      const uploadId = tus.state.uploadId;
      const fileName = pending.fileName;

      if (!uploadId) {
        pendingRef.current = null;
        alert("Tài liệu đã tải lên nhưng thiếu mã xác nhận.");
        return;
      }

      (async () => {
        try {
          const verified = await triggerVerify({ uploadId, fileName }).unwrap();
          if ((verified as any)?.ok !== true) {
            throw new Error((verified as any)?.reason || "Không xác nhận được tài liệu đã tải lên.");
          }

          await refetchDocuments();
        } catch (err: any) {
          console.error(err);
          alert(err?.message || "Không xác nhận được tài liệu đã tải lên.");
        } finally {
          pendingRef.current = null;
        }
      })();
    }
  }, [tus.state, triggerVerify, refetchDocuments]);

  const handleDownload = async (fileId: string) => {
    try {
      const res = await triggerPresign({ fileId }).unwrap();
      const url = (res as any)?.url;
      if (!url) throw new Error("Không lấy được liên kết tải xuống.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Tải xuống thất bại.");
    }
  };

  const handleDelete = async (row: WorkDocumentRow) => {
    if (!row.canDelete || deletingDocument) return;
    if (!confirm("Xóa tài liệu này?")) return;

    try {
      await deleteDocument({ workId, fileId: row.id }).unwrap();
      await refetchDocuments();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Xóa tài liệu thất bại.");
    }
  };

  const handleOpenEdit = (row: WorkDocumentRow) => {
    if (!row.canUpdate || updatingDocument) return;
    const nextScope: WorkDocumentScope = row.scope === "ASSIGNMENT_BRANCH" ? "ASSIGNMENT_BRANCH" : "WORK";
    setEditTarget(row);
    setEditName(row.originalName || "");
    setEditScope(nextScope);
    setEditAssignmentId(row.assignmentId || selectedAssignmentId || assignmentTargets[0]?.assignmentId || "");
    setEditError(null);
  };

  const handleCloseEdit = () => {
    if (updatingDocument) return;
    setEditTarget(null);
    setEditError(null);
  };

  const handleSubmitEdit = async () => {
    if (!editTarget) return;

    const name = editName.trim();
    if (!name) {
      setEditError("Bắt buộc nhập tên tài liệu.");
      return;
    }

    if (editScope === "ASSIGNMENT_BRANCH" && !editAssignmentId) {
      setEditError("Chọn nhánh công việc cho tài liệu.");
      return;
    }

    try {
      setEditError(null);
      await updateDocument({
        workId,
        fileId: editTarget.id,
        data: {
          originalName: name,
          scope: editScope,
          assignmentId: editScope === "ASSIGNMENT_BRANCH" ? editAssignmentId : null,
        },
      }).unwrap();
      setEditTarget(null);
      await refetchDocuments();
    } catch (err: unknown) {
      setEditError(getErrorMessage(err, "Không sửa được tài liệu."));
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
          gap: 1.25,
          alignItems: "center",
          p: 1.5,
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          bgcolor: "#fff",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            size="small"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên tài liệu"
            sx={{ minWidth: { xs: 0, md: 260 } }}
          />
          <TextField
            select
            size="small"
            value={scope}
            onChange={(event) => setScope(event.target.value as "ALL" | "WORK" | "ASSIGNMENT_BRANCH")}
            sx={{ minWidth: { xs: 0, md: 190 } }}
          >
            <MenuItem value="ALL">Tất cả phạm vi</MenuItem>
            <MenuItem value="WORK">Toàn bộ công việc</MenuItem>
            <MenuItem value="ASSIGNMENT_BRANCH">Nhánh công việc</MenuItem>
          </TextField>
          {fetchingDocuments && !loadingDocuments ? <CircularProgress size={18} /> : null}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
          <input ref={fileInputRef} type="file" hidden accept={acceptedDocumentTypes} onChange={handlePicked} />

          {uploadOptions?.canUploadWork ? (
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => handlePick({ scope: "WORK" })}
              disabled={!canPickWork}
              sx={{ borderRadius: "8px" }}
            >
              Tải tài liệu chung
            </Button>
          ) : null}

          {assignmentTargets.length > 0 ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                select
                size="small"
                value={selectedAssignmentId}
                onChange={(event) => setSelectedAssignmentId(event.target.value)}
                sx={{ minWidth: { xs: 0, sm: 240 } }}
              >
                {assignmentTargets.map((target) => (
                  <MenuItem key={target.assignmentId} value={target.assignmentId}>
                    {target.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => handlePick({ scope: "ASSIGNMENT_BRANCH", assignmentId: selectedAssignmentId })}
                disabled={!canPickAssignment}
                sx={{ borderRadius: "8px" }}
              >
                Tải cho nhánh
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          bgcolor: "#fff",
        }}
      >
        {loadingDocuments || loadingOptions ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Đang tải tài liệu...
            </Typography>
          </Stack>
        ) : (documents?.length ?? 0) === 0 ? (
          <Stack spacing={1} alignItems="center" sx={{ p: 4, color: "#64748b" }}>
            <FolderOutlinedIcon />
            <Typography variant="body2">Chưa có tài liệu phù hợp.</Typography>
          </Stack>
        ) : (
          <Stack divider={<Divider flexItem />}>
            {documents!.map((row) => (
              <Box
                key={row.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr auto", md: "minmax(0, 1fr) 180px 160px auto" },
                  gap: 1,
                  alignItems: "center",
                  px: 1.5,
                  py: 1.1,
                }}
              >
                <Stack spacing={0.4} sx={{ minWidth: 0 }}>
                  <Typography
                    title={row.originalName}
                    sx={{
                      color: "#0f172a",
                      fontWeight: 800,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.originalName}
                  </Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {prettyBytes(row.size)} · {row.mimeType || "application/octet-stream"}
                    </Typography>
                  </Stack>
                </Stack>

                <Typography
                  variant="body2"
                  sx={{ display: { xs: "none", md: "block" }, color: "#334155", fontWeight: 650 }}
                  title={row.createdByName || row.createdByUserId || ""}
                >
                  {row.createdByName || "-"}
                </Typography>

                <Typography variant="body2" sx={{ display: { xs: "none", md: "block" }, color: "#64748b" }}>
                  {formatDate(row.createdAtUtc)}
                </Typography>

                <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                  <Tooltip title="Tải xuống">
                    <IconButton onClick={() => handleDownload(row.id)}>
                      <DownloadOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                  {row.canUpdate ? (
                    <Tooltip title="Sửa">
                      <span>
                        <IconButton onClick={() => handleOpenEdit(row)} disabled={updatingDocument}>
                          <EditOutlinedIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                  {row.canDelete ? (
                    <Tooltip title="Xóa">
                      <span>
                        <IconButton onClick={() => handleDelete(row)} disabled={deletingDocument}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Dialog open={Boolean(editTarget)} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Sửa tài liệu</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              size="small"
              label="Tên tài liệu"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              disabled={updatingDocument}
              fullWidth
              autoFocus
            />
            <TextField
              select
              size="small"
              label="Phạm vi"
              value={editScope}
              onChange={(event) => {
                const next = event.target.value as WorkDocumentScope;
                setEditScope(next);
                if (next === "ASSIGNMENT_BRANCH" && !editAssignmentId) {
                  setEditAssignmentId(editAssignmentOptions[0]?.assignmentId || "");
                }
              }}
              disabled={updatingDocument}
              fullWidth
            >
              <MenuItem value="WORK" disabled={!uploadOptions?.canUploadWork && editTarget?.scope !== "WORK"}>
                Toàn bộ công việc
              </MenuItem>
              <MenuItem
                value="ASSIGNMENT_BRANCH"
                disabled={editAssignmentOptions.length === 0 && editTarget?.scope !== "ASSIGNMENT_BRANCH"}
              >
                Nhánh công việc
              </MenuItem>
            </TextField>
            {editScope === "ASSIGNMENT_BRANCH" ? (
              <TextField
                select
                size="small"
                label="Nhánh công việc"
                value={editAssignmentId}
                onChange={(event) => setEditAssignmentId(event.target.value)}
                disabled={updatingDocument}
                fullWidth
              >
                {editAssignmentOptions.map((target) => (
                  <MenuItem key={target.assignmentId} value={target.assignmentId}>
                    {target.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {editError ? (
              <Typography variant="body2" color="error">
                {editError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={updatingDocument}>
            Hủy
          </Button>
          <Button variant="contained" onClick={() => void handleSubmitEdit()} disabled={updatingDocument}>
            {updatingDocument ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openProgress} onClose={() => {}} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Đang tải lên</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ py: 1 }}>
            <LinearProgress
              variant={tus.state.status === "uploading" ? "determinate" : "indeterminate"}
              value={tus.state.status === "uploading" ? tus.state.progress : 0}
            />
            <Typography variant="body2" color="text.secondary">
              {progressText || "Đang tạo phiên upload..."}
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default WorkDocumentLibrary;
