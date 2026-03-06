import React, { useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

import { useTusUpload } from "../../../../features/uploads/useTusUpload";
import {
  useCreateWorkUploadSessionMutation,
  useDeleteWorkFileMutation,
  useListWorkFilesQuery,
} from "../../../../api/workFilesApi";
import { useLazyVerifyUploadQuery, useLazyPresignDownloadQuery } from "../../../../api/uploadApi";

export type WorkBasisFilesProps = {
  workId: string;
  disabled?: boolean; // view mode => true
  title?: string;
  helperText?: string;
  accept?: string;
};

const prettyBytes = (n: number) => {
  if (!Number.isFinite(n)) return "-";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

export const WorkBasisFiles: React.FC<WorkBasisFilesProps> = ({
  workId,
  disabled,
  title = "Tệp đính kèm",
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg",
}) => {
  const tus = useTusUpload();

  const [createSession, { isLoading: creatingSession }] = useCreateWorkUploadSessionMutation();
  const [deleteFile, { isLoading: deletingFile }] = useDeleteWorkFileMutation();

  const [triggerVerify] = useLazyVerifyUploadQuery();
  const [triggerPresign] = useLazyPresignDownloadQuery();

  const { data: files, isLoading: loadingFiles, refetch: refetchFiles } = useListWorkFilesQuery(workId, {
    skip: !workId,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // giữ fileName để verify khi tus success
  const pendingRef = useRef<{ fileName: string } | null>(null);

  const busyUpload = tus.state.status === "uploading" || creatingSession;
  const canUpload = !!workId && !disabled && !busyUpload && !deletingFile;

  const progressValue = useMemo(() => {
    const st = tus.state;
    return st.status === "uploading" ? st.progress : 0;
  }, [tus.state]);

  const progressText = useMemo(() => {
    const st = tus.state;
    if (st.status !== "uploading") return "";
    return `Đang tải lên: ${st.progress}% (${st.bytesUploaded}/${st.bytesTotal})`;
  }, [tus.state]);

  const openProgress = busyUpload || !!pendingRef.current;

  const uploadOne = async (file: File) => {
    if (!workId) throw new Error("Thiếu workId.");

    // 1) session
    const sess = await createSession({
      workId,
      data: {
        fileName: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
      },
    }).unwrap();

    // 2) start tus
    pendingRef.current = { fileName: file.name };
    await tus.start({
      file,
      endpoint: sess.endpoint,
      uploadToken: sess.uploadToken,
      chunkSize: sess.chunkSize,
    });

    // verify sẽ chạy ở effect
  };

  // auto verify sau success
  useEffect(() => {
    const st = tus.state;
    const pending = pendingRef.current;

    if (!pending) return;

    if (st.status === "error") {
      pendingRef.current = null;
      // eslint-disable-next-line no-console
      console.error(st.error);
      alert(st.error || "Upload thất bại.");
      return;
    }

    if (st.status === "success") {
      const uploadId = st.uploadId;
      const fileName = pending.fileName;

      if (!uploadId) {
        pendingRef.current = null;
        alert("Upload xong nhưng thiếu uploadId.");
        return;
      }

      (async () => {
        try {
          const ver = await triggerVerify({ uploadId, fileName }).unwrap();
          const ok = (ver as any)?.ok;
          if (ok !== true) throw new Error((ver as any)?.reason || "Verify thất bại.");

          await refetchFiles();
        } catch (err: any) {
          // eslint-disable-next-line no-console
          console.error(err);
          alert(err?.message || "Verify thất bại.");
        } finally {
          pendingRef.current = null;
        }
      })();
    }
  }, [tus.state, triggerVerify, refetchFiles]);

  const handlePick = () => {
    if (!canUpload) return;
    fileInputRef.current?.click();
  };

  const handlePicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    try {
      await uploadOne(f);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      pendingRef.current = null;
      alert(err?.message || "Upload thất bại.");
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!workId) return;
    if (disabled) return;
    if (!confirm("Xóa file này? (File sẽ được dọn MinIO bởi job cleanup)")) return;

    try {
      await deleteFile({ workId, fileId }).unwrap();
      await refetchFiles();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert(err?.message || "Xóa file thất bại.");
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const res = await triggerPresign({ fileId }).unwrap();
      const url = (res as any)?.url;
      if (!url) throw new Error("Không lấy được presign url.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert(err?.message || "Tải xuống thất bại.");
    }
  };

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.25}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
              </Stack>

              <Box>
                <input ref={fileInputRef} type="file" hidden onChange={handlePicked} accept={accept} />
                <Button variant="contained" startIcon={<UploadFileIcon />} onClick={handlePick} disabled={!canUpload}>
                  Tải lên
                </Button>
              </Box>
            </Stack>

            <Divider />

            {loadingFiles ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Đang tải danh sách file...
                </Typography>
              </Stack>
            ) : (files?.length ?? 0) === 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Chưa có file nào.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {files!.map((f) => (
                  <Box
                    key={f.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={f.originalName}
                      >
                        {f.originalName}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        {prettyBytes(f.size)} • {f.mimeType}
                      </Typography>
                    </Box>

                    <IconButton onClick={() => handleDownload(f.id)} title="Tải xuống">
                      <DownloadOutlinedIcon />
                    </IconButton>

                    {!disabled && (
                      <IconButton onClick={() => handleDelete(f.id)} title="Xóa" disabled={deletingFile}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={openProgress} onClose={() => {}} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Đang tải lên…</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ py: 1 }}>
            <LinearProgress
              variant={tus.state.status === "uploading" ? "determinate" : "indeterminate"}
              value={progressValue}
            />
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {progressText || (creatingSession ? "Đang tạo phiên upload…" : "Đang xác nhận…")}
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};