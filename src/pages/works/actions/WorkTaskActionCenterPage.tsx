import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ApprovalOutlinedIcon from "@mui/icons-material/ApprovalOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

import CommonDateText from "../../../components/common/CommonDateText";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import {
  useApproveDynamicFormCloneRequestMutation,
  useCreateDynamicFormCloneRequestMutation,
  useRejectDynamicFormCloneRequestMutation,
  useSearchMyDynamicFormCloneRequestsMutation,
  useSearchPendingDynamicFormCloneRequestsMutation,
  type DynamicFormCloneRequestRow,
} from "../../../api/dynamicFormApi";
import { useGetWorkAssignmentsByWorkQuery } from "../../../api/workAssignmentApi";
import { getMeSnapshot } from "../../../stores/authStorage";
import type { UserRefDTO } from "../../../types/userRefDto";
import type { WorkAssignmentListResponse } from "../../../types/workAssignment";

type ActionSection = "PENDING" | "UNFINISHED" | "DONE";

type ReviewIntent = {
  row: DynamicFormCloneRequestRow;
  action: "approve" | "reject";
} | null;

type Props = {
  workId: string;
  onOpenAssignments: () => void;
  onOpenReports: () => void;
  onOpenReview: () => void;
};

function getUserLabel(row?: UserRefDTO | null) {
  if (!row) return "-";
  const name = row.fullName?.trim() || row.username?.trim() || row.userId?.trim();
  const unit = row.unitShortName?.trim() || row.unitName?.trim() || row.unitSymbol?.trim();
  return [name, unit].filter(Boolean).join(" - ") || "-";
}

function getAssignmentTemplateLabel(row: WorkAssignmentListResponse) {
  const name = row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  return name || row.name?.trim() || row.id;
}

function getAssignmentTemplateCode(row: WorkAssignmentListResponse) {
  return row.dynamicFormTemplateCode?.trim() || row.dynamicExcelCode?.trim() || "";
}

function getCloneRequestTemplateLabel(row: {
  dynamicFormTemplateName?: string | null;
  dynamicFormTemplateId?: string | null;
}) {
  return row.dynamicFormTemplateName?.trim() || row.dynamicFormTemplateId || "";
}

function getCloneRequestTemplateCode(row: { dynamicFormTemplateCode?: string | null }) {
  return row.dynamicFormTemplateCode?.trim() || "";
}

function getAssignmentAssigneeSummary(row: WorkAssignmentListResponse) {
  const labels = (row.assignees ?? [])
    .map((x) => x.fullName?.trim() || x.username?.trim() || x.userId)
    .filter(Boolean);

  if (labels.length === 0) return "-";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
}

function getProgressChip(row: WorkAssignmentListResponse) {
  if (row.hasOverduePeriod || row.progressStatus === 4) {
    return <Chip size="small" color="error" variant="outlined" label="Quá hạn" />;
  }
  if (row.progressStatus === 3) {
    return <Chip size="small" color="warning" variant="outlined" label="Có nguy cơ" />;
  }
  if (row.progressStatus === 2) {
    return <Chip size="small" color="success" label="Hoàn thành" />;
  }
  if (row.progressStatus === 1) {
    return <Chip size="small" color="primary" variant="outlined" label="Đang thực hiện" />;
  }
  return <Chip size="small" variant="outlined" label="Chưa bắt đầu" />;
}

function getCloneStatusChip(row?: DynamicFormCloneRequestRow | null) {
  if (!row) return null;
  if (row.status === "APPROVED") {
    return <Chip size="small" color="success" label="Đã duyệt" />;
  }
  if (row.status === "REJECTED") {
    return <Chip size="small" color="error" variant="outlined" label="Đã từ chối" />;
  }
  return <Chip size="small" color="warning" variant="outlined" label="Chờ duyệt" />;
}

export default function WorkTaskActionCenterPage({
  workId,
  onOpenAssignments,
  onOpenReports,
  onOpenReview,
}: Props) {
  const me = getMeSnapshot();

  const [section, setSection] = React.useState<ActionSection>("PENDING");
  const [requestReasons, setRequestReasons] = React.useState<Record<string, string>>({});
  const [reviewIntent, setReviewIntent] = React.useState<ReviewIntent>(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "" });

  const assignmentsQuery = useGetWorkAssignmentsByWorkQuery(
    { workId },
    { skip: !workId }
  );
  const [searchMyCloneRequests, myCloneRequestsState] =
    useSearchMyDynamicFormCloneRequestsMutation();
  const [searchPendingCloneRequests, pendingCloneRequestsState] =
    useSearchPendingDynamicFormCloneRequestsMutation();
  const [createCloneRequest, createCloneRequestState] =
    useCreateDynamicFormCloneRequestMutation();
  const [approveCloneRequest, approveState] = useApproveDynamicFormCloneRequestMutation();
  const [rejectCloneRequest, rejectState] = useRejectDynamicFormCloneRequestMutation();

  const runMyCloneRequests = React.useCallback(() => {
    if (!workId) return;
    void searchMyCloneRequests({
      workId,
      req: { status: null, page: 0, pageSize: 50 },
    });
  }, [searchMyCloneRequests, workId]);

  const runPendingCloneRequests = React.useCallback(() => {
    if (!workId) return;
    void searchPendingCloneRequests({
      workId,
      req: { status: "PENDING", page: 0, pageSize: 50 },
    });
  }, [searchPendingCloneRequests, workId]);

  const reloadAll = React.useCallback(() => {
    void assignmentsQuery.refetch();
    runMyCloneRequests();
    runPendingCloneRequests();
  }, [assignmentsQuery, runMyCloneRequests, runPendingCloneRequests]);

  React.useEffect(() => {
    if (!workId) return;
    runMyCloneRequests();
    runPendingCloneRequests();
  }, [runMyCloneRequests, runPendingCloneRequests, workId]);

  const assignments = React.useMemo(
    () => (assignmentsQuery.data ?? []) as WorkAssignmentListResponse[],
    [assignmentsQuery.data]
  );

  const myCloneRequestRows = myCloneRequestsState.data?.rows ?? [];
  const pendingCloneRequestRows = pendingCloneRequestsState.data?.rows ?? [];

  const myRequestByAssignmentId = React.useMemo(() => {
    const map = new Map<string, DynamicFormCloneRequestRow>();
    for (const row of myCloneRequestRows) {
      const existing = map.get(row.workAssignmentId);
      if (!existing || row.createdAtUtc > existing.createdAtUtc) {
        map.set(row.workAssignmentId, row);
      }
    }
    return map;
  }, [myCloneRequestRows]);

  const currentUserId = me?.id ?? "";

  const requestableAssignments = React.useMemo(
    () =>
      assignments.filter((row) => {
        if (!row.dynamicFormTemplateId || !currentUserId) return false;
        return (row.assignees ?? []).some((x) => x.userId === currentUserId);
      }),
    [assignments, currentUserId]
  );

  const unfinishedAssignments = React.useMemo(
    () => assignments.filter((row) => row.isActive && row.progressStatus !== 2),
    [assignments]
  );

  const handledCloneRows = React.useMemo(
    () => myCloneRequestRows.filter((row) => row.status !== "PENDING"),
    [myCloneRequestRows]
  );

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({ open: true, message });
  }, []);

  const handleCreateCloneRequest = async (assignmentId: string) => {
    try {
      await createCloneRequest({
        assignmentId,
        reason: requestReasons[assignmentId]?.trim() || null,
      }).unwrap();
      showMessage("Đã gửi yêu cầu xin quyền sao chép biểu mẫu động.");
      setRequestReasons((prev) => ({ ...prev, [assignmentId]: "" }));
      runMyCloneRequests();
    } catch (err: any) {
      showMessage(err?.data?.message || err?.message || "Gửi yêu cầu thất bại.");
    }
  };

  const handleConfirmReview = async () => {
    if (!reviewIntent) return;

    try {
      if (reviewIntent.action === "approve") {
        await approveCloneRequest({ id: reviewIntent.row.id, comment: null }).unwrap();
        showMessage("Đã duyệt quyền xem và sao chép biểu mẫu động.");
      } else {
        await rejectCloneRequest({ id: reviewIntent.row.id, comment: null }).unwrap();
        showMessage("Đã từ chối yêu cầu sao chép biểu mẫu động.");
      }
      setReviewIntent(null);
      runPendingCloneRequests();
    } catch (err: any) {
      showMessage(err?.data?.message || err?.message || "Cập nhật yêu cầu thất bại.");
    }
  };

  const loading =
    assignmentsQuery.isFetching ||
    myCloneRequestsState.isLoading ||
    pendingCloneRequestsState.isLoading;

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{ flexShrink: 0 }}
      >
        <Tabs
          value={section}
          onChange={(_, value) => setSection(value as ActionSection)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ minHeight: 42, borderBottom: 1, borderColor: "divider", flex: 1 }}
        >
          <Tab
            icon={<ApprovalOutlinedIcon />}
            iconPosition="start"
            value="PENDING"
            label="Yêu cầu cần xử lý"
          />
          <Tab
            icon={<AssignmentTurnedInOutlinedIcon />}
            iconPosition="start"
            value="UNFINISHED"
            label="Công việc chưa thực hiện"
          />
          <Tab icon={<FactCheckOutlinedIcon />} iconPosition="start" value="DONE" label="Đã xử lý" />
        </Tabs>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={reloadAll}
          disabled={loading}
          sx={{ flexShrink: 0 }}
        >
          Làm mới
        </Button>
      </Stack>

      {section === "PENDING" && (
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Bàn giao nhiệm vụ/chỉ tiêu
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Luồng bàn giao sẽ tạo yêu cầu chờ người nhận duyệt trước khi chuyển người phụ trách.
                    </Typography>
                  </Stack>
                  <Button variant="outlined" onClick={onOpenAssignments}>
                    Mở Nhiệm vụ/Chỉ tiêu
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Duyệt báo cáo và đánh giá
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Các việc duyệt/đánh giá sẽ mở đúng luồng báo cáo của đầu việc này.
                    </Typography>
                  </Stack>
                  <Button variant="outlined" onClick={onOpenReview}>
                    Mở luồng duyệt
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ContentCopyOutlinedIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Yêu cầu sao chép biểu mẫu động chờ duyệt
              </Typography>
            </Stack>

            {pendingCloneRequestsState.isLoading ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={22} />
              </Box>
            ) : pendingCloneRequestRows.length === 0 ? (
              <Alert severity="info">Không có yêu cầu sao chép biểu mẫu động đang chờ duyệt.</Alert>
            ) : (
              pendingCloneRequestRows.map((row) => (
                <Card key={row.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                      >
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {getCloneRequestTemplateLabel(row) || row.id}
                            </Typography>
                            {getCloneRequestTemplateCode(row) ? (
                              <Chip size="small" variant="outlined" label={getCloneRequestTemplateCode(row)} />
                            ) : null}
                            {getCloneStatusChip(row)}
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" color="text.secondary">
                              Người xin quyền: {getUserLabel(row.requester)}
                            </Typography>
                            {row.assignmentCode ? (
                              <Chip size="small" variant="outlined" label={row.assignmentCode} />
                            ) : null}
                          </Stack>
                          {row.requestReason && (
                            <Typography variant="body2">Lý do: {row.requestReason}</Typography>
                          )}
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            variant="outlined"
                            color="inherit"
                            disabled={approveState.isLoading || rejectState.isLoading}
                            onClick={() => setReviewIntent({ row, action: "reject" })}
                          >
                            Từ chối
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            disabled={approveState.isLoading || rejectState.isLoading}
                            onClick={() => setReviewIntent({ row, action: "approve" })}
                          >
                            Duyệt
                          </Button>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Gửi lúc:
                        </Typography>
                        <CommonDateText value={row.createdAtUtc} withTime />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ContentCopyOutlinedIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Xin quyền sao chép biểu mẫu động được giao
              </Typography>
            </Stack>

            {assignmentsQuery.isFetching || myCloneRequestsState.isLoading ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={22} />
              </Box>
            ) : requestableAssignments.length === 0 ? (
              <Alert severity="info">Không có công việc có biểu mẫu động nào có thể xin quyền sao chép.</Alert>
            ) : (
              requestableAssignments.map((assignment) => {
                const currentRequest = myRequestByAssignmentId.get(assignment.id);
                const alreadyHandled =
                  currentRequest?.status === "PENDING" || currentRequest?.status === "APPROVED";
                return (
                  <Card key={assignment.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          gap={1.5}
                        >
                          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {getAssignmentTemplateLabel(assignment)}
                              </Typography>
                              {getAssignmentTemplateCode(assignment) ? (
                                <Chip size="small" variant="outlined" label={getAssignmentTemplateCode(assignment)} />
                              ) : null}
                              {getCloneStatusChip(currentRequest)}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="body2" color="text.secondary">
                                Người được giao: {getAssignmentAssigneeSummary(assignment)}
                              </Typography>
                              {assignment.code ? (
                                <Chip size="small" variant="outlined" label={assignment.code} />
                              ) : null}
                            </Stack>
                          </Stack>
                          <Button
                            variant="contained"
                            startIcon={<ContentCopyOutlinedIcon />}
                            disabled={alreadyHandled || createCloneRequestState.isLoading}
                            onClick={() => handleCreateCloneRequest(assignment.id)}
                          >
                            Xin quyền
                          </Button>
                        </Stack>

                        <TextField
                          size="small"
                          label="Lý do xin quyền"
                          value={requestReasons[assignment.id] ?? ""}
                          onChange={(e) =>
                            setRequestReasons((prev) => ({
                              ...prev,
                              [assignment.id]: e.target.value,
                            }))
                          }
                          disabled={alreadyHandled}
                          fullWidth
                          multiline
                          minRows={2}
                        />

                        {currentRequest && (
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary">
                              Gửi lúc:
                            </Typography>
                            <CommonDateText value={currentRequest.createdAtUtc} withTime />
                            {currentRequest.reviewedAtUtc && (
                              <>
                                <Divider orientation="vertical" flexItem />
                                <Typography variant="caption" color="text.secondary">
                                  Xử lý lúc:
                                </Typography>
                                <CommonDateText value={currentRequest.reviewedAtUtc} withTime />
                              </>
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Stack>
        </Stack>
      )}

      {section === "UNFINISHED" && (
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Công việc chưa hoàn thành
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Danh sách đang lấy từ quyền xem công việc hiện có của đầu việc này.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onOpenAssignments}>
                Mở Nhiệm vụ/Chỉ tiêu
              </Button>
              <Button variant="outlined" onClick={onOpenReports}>
                Mở Báo cáo
              </Button>
            </Stack>
          </Stack>

          {assignmentsQuery.isFetching ? (
            <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : unfinishedAssignments.length === 0 ? (
            <Alert severity="success">Không có công việc chưa hoàn thành trong phạm vi hiện tại.</Alert>
          ) : (
            unfinishedAssignments.map((row) => (
              <Card key={row.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    justifyContent="space-between"
                  >
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {getAssignmentTemplateLabel(row)}
                        </Typography>
                        {getAssignmentTemplateCode(row) ? (
                          <Chip size="small" variant="outlined" label={getAssignmentTemplateCode(row)} />
                        ) : null}
                        {getProgressChip(row)}
                        <Chip
                          size="small"
                          variant="outlined"
                          label={row.assignmentType === "PERIODIC_REPORT" ? "Định kỳ" : "Một lần"}
                        />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" color="text.secondary">
                          Người được giao: {getAssignmentAssigneeSummary(row)}
                        </Typography>
                        {row.code ? (
                          <Chip size="small" variant="outlined" label={row.code} />
                        ) : null}
                      </Stack>
                      {row.latestDueAtUtc && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ReportProblemOutlinedIcon fontSize="small" color="warning" />
                          <Typography variant="body2" color="text.secondary">
                            Hạn gần nhất:
                          </Typography>
                          <CommonDateText value={row.latestDueAtUtc} withTime />
                        </Stack>
                      )}
                    </Stack>
                    <Button variant="contained" onClick={onOpenAssignments}>
                      Thực hiện ngay
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      {section === "DONE" && (
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Yêu cầu sao chép biểu mẫu động đã xử lý
          </Typography>

          {myCloneRequestsState.isLoading ? (
            <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : handledCloneRows.length === 0 ? (
            <Alert severity="info">Chưa có yêu cầu sao chép biểu mẫu động đã xử lý.</Alert>
          ) : (
            handledCloneRows.map((row) => (
              <Card key={row.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {getCloneRequestTemplateLabel(row) || row.id}
                      </Typography>
                      {getCloneRequestTemplateCode(row) ? (
                        <Chip size="small" variant="outlined" label={getCloneRequestTemplateCode(row)} />
                      ) : null}
                      {getCloneStatusChip(row)}
                    </Stack>
                    {row.assignmentCode ? (
                      <Chip size="small" variant="outlined" label={row.assignmentCode} sx={{ width: "fit-content" }} />
                    ) : null}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary">
                        Gửi lúc:
                      </Typography>
                      <CommonDateText value={row.createdAtUtc} withTime />
                      {row.reviewedAtUtc && (
                        <>
                          <Divider orientation="vertical" flexItem />
                          <Typography variant="caption" color="text.secondary">
                            Xử lý lúc:
                          </Typography>
                          <CommonDateText value={row.reviewedAtUtc} withTime />
                        </>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(reviewIntent)}
        title={reviewIntent?.action === "approve" ? "Duyệt quyền sao chép" : "Từ chối quyền sao chép"}
        message={
          <Box>
            <Typography variant="body2">
              {reviewIntent?.action === "approve"
                ? "Duyệt quyền xem và sao chép biểu mẫu động cho"
                : "Từ chối yêu cầu sao chép biểu mẫu động của"}{" "}
              <b>{getUserLabel(reviewIntent?.row.requester)}</b>?
            </Typography>
            {reviewIntent?.action === "approve" && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sau khi duyệt, người dùng sẽ thấy biểu mẫu động trong màn hình biểu mẫu động hiện có và tự sao chép ở đó.
              </Typography>
            )}
          </Box>
        }
        confirmText={reviewIntent?.action === "approve" ? "Duyệt" : "Từ chối"}
        cancelText="Hủy"
        variant={reviewIntent?.action === "approve" ? "info" : "warning"}
        confirmLoading={approveState.isLoading || rejectState.isLoading}
        onConfirm={handleConfirmReview}
        onClose={() => setReviewIntent(null)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Stack>
  );
}
