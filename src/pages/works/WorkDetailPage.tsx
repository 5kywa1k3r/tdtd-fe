import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import { WorkForm } from "../../components/works/workform/WorkForm";
import WorkAssignTab from "../../components/works/assignments/WorkAssignTab";
import type { AssignmentTableRow } from "../../components/works/assignments/WorkAssignmentTable";
import { useGetWorkQuery } from "../../api/workApi";
import { useGetMyReportAssignmentsByWorkQuery } from "../../api/workAssignmentApi";

import WorkReportTemplateGroupsPage from "./report/WorkReportTemplateGroupsPage";
import WorkReportTemplateDetailPage from "./report/WorkReportTemplateDetailPage";
import WorkAggregationTab from "./aggregation/WorkAggregationTab";
import type { MyReportTemplateRow } from "../../types/report";
import WorkReviewTab from "../../components/works/review/WorkReviewTab";
import WorkDocumentLibrary from "../../components/works/documents/WorkDocumentLibrary";
import { getMeSnapshot } from "../../stores/authStorage";
import { UITextKey, uiText } from "../../constants/uiText";
import { getWorkStatusLabel, WORK_STATUS } from "../../types/work";

type WorkType = "TASK" | "INDICATOR";

interface WorkDetailPageProps {
  type: WorkType;
}

type DetailTab = "COMMON" | "DOCUMENT" | "ASSIGN" | "REPORT" | "AGGREGATION" | "REVIEW";
type CommonMode = "view" | "edit";
type AggregationSeed = {
  parentAssignmentId: string;
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
};

const workPageFont =
  '"Inter", "Roboto", "Helvetica", "Arial", sans-serif';

const compactDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatCompactDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return compactDateFormatter.format(date);
}

function getStatusColor(status?: number | null) {
  if (status === WORK_STATUS.S3) return "#16a34a";
  if (status === WORK_STATUS.S4) return "#d97706";
  if (status === WORK_STATUS.S5) return "#dc2626";
  if (status === WORK_STATUS.S2) return "#2563eb";
  return "#64748b";
}

function normalizeDetailTab(value?: string | null): DetailTab | null {
  const upper = (value || "").trim().toUpperCase();
  if (upper === "ACTIONS") return "ASSIGN";
  if (upper === "DOCUMENTS" || upper === "FILES") return "DOCUMENT";
  if (
    upper === "COMMON" ||
    upper === "DOCUMENT" ||
    upper === "ASSIGN" ||
    upper === "REPORT" ||
    upper === "AGGREGATION" ||
    upper === "REVIEW"
  ) {
    return upper;
  }
  return null;
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const WorkDetailPage: React.FC<WorkDetailPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const me = getMeSnapshot();

  const queryTab = normalizeDetailTab(searchParams.get("tab"));
  const queryAggregationAssignmentId = normalizeOptionalText(searchParams.get("assignmentId"));
  const [tab, setTab] = useState<DetailTab | null>(queryTab);
  const [commonMode, setCommonMode] = useState<CommonMode>("view");
  const [selectedReportTemplateGroup, setSelectedReportTemplateGroup] =
    useState<MyReportTemplateRow | null>(null);
  const [aggregationSeed, setAggregationSeed] = useState<AggregationSeed | null>(
    queryTab === "AGGREGATION" && queryAggregationAssignmentId
      ? { parentAssignmentId: queryAggregationAssignmentId }
      : null
  );

  const workId = id ?? "";

  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = useGetWorkQuery(workId, { skip: !id });

  const { data: myReportAssignments } = useGetMyReportAssignmentsByWorkQuery(
    { workId },
    { skip: !workId }
  );

  const title = type === "TASK" ? "Chi tiết nhiệm vụ" : "Chi tiết chỉ tiêu";

  const subtitle = useMemo(() => {
    if (!detail) return "";
    const code = (detail.autoCode || detail.code || "").trim();
    const name = (detail.name || "").trim();
    if (code && name) return `${code} - ${name}`;
    return code || name || workId;
  }, [detail, workId]);

  const handleBack = () => navigate(-1);

  const handleOpenFunction = (next: DetailTab) => {
    setTab(next);

    if (next !== "REPORT") {
      setSelectedReportTemplateGroup(null);
    }

    if (next !== "AGGREGATION") {
      setAggregationSeed(null);
    }

    if (next !== "COMMON") {
      setCommonMode("view");
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    if (next !== "AGGREGATION") {
      nextParams.delete("assignmentId");
    }
    if (next !== "ASSIGN") {
      nextParams.delete("section");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleBackToLauncher = () => {
    setTab(null);
    setSelectedReportTemplateGroup(null);
    setAggregationSeed(null);
    setCommonMode("view");

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tab");
    nextParams.delete("section");
    nextParams.delete("assignmentId");
    setSearchParams(nextParams, { replace: true });
  };

  const handleOpenAggregation = (row: AssignmentTableRow) => {
    setAggregationSeed({
      parentAssignmentId: row.id,
      dynamicExcelId: row.dynamicExcelId ?? null,
      dynamicExcelCode: row.dynamicExcelCode ?? null,
      dynamicExcelName: row.dynamicExcelName ?? null,
      dynamicFormTemplateId: row.dynamicFormTemplateId ?? null,
      dynamicFormTemplateCode: row.dynamicFormTemplateCode ?? null,
      dynamicFormTemplateName: row.dynamicFormTemplateName ?? null,
    });
    setSelectedReportTemplateGroup(null);
    setCommonMode("view");
    setTab("AGGREGATION");

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "AGGREGATION");
    nextParams.set("assignmentId", row.id);
    nextParams.delete("section");
    setSearchParams(nextParams, { replace: true });
  };

  const isWorkOwner = Boolean(
    detail?.owner?.userId &&
      me?.id &&
      detail.owner.userId === me.id
  );

  const detailCanEdit = detail?.canEdit === true;
  const canEditCommon = Boolean(isWorkOwner || detailCanEdit);
  const reportAssignmentsLoaded = Array.isArray(myReportAssignments);
  const hasMyReportAssignments = (myReportAssignments ?? []).length > 0;
  const statusLabel = getWorkStatusLabel(detail?.status ?? null);
  const statusColor = getStatusColor(detail?.status ?? null);

  const effectiveCommonMode: CommonMode =
    canEditCommon && commonMode === "edit" ? "edit" : "view";

  const isEdit = effectiveCommonMode === "edit";

  useEffect(() => {
    setSelectedReportTemplateGroup(null);
    setAggregationSeed(
      queryTab === "AGGREGATION" && queryAggregationAssignmentId
        ? { parentAssignmentId: queryAggregationAssignmentId }
        : null
    );
    setCommonMode("view");
    setTab(queryTab);
  }, [workId]);

  useEffect(() => {
    if (queryTab === tab) return;
    setTab(queryTab);
    if (queryTab !== "REPORT") {
      setSelectedReportTemplateGroup(null);
    }
    if (queryTab !== "AGGREGATION") {
      setAggregationSeed(null);
    } else if (queryAggregationAssignmentId) {
      setAggregationSeed((prev) =>
        prev?.parentAssignmentId === queryAggregationAssignmentId
          ? prev
          : { parentAssignmentId: queryAggregationAssignmentId }
      );
    }
    if (queryTab !== "COMMON") {
      setCommonMode("view");
    }
  }, [queryAggregationAssignmentId, queryTab, tab]);

  const functionCards = useMemo(
    () => {
      const cards = [
        {
          key: "COMMON" as DetailTab,
          title: "Thuộc tính chung",
          description: "Xem và chỉnh sửa thông tin nền, phạm vi, thời gian và người phụ trách của đầu việc.",
          badge: canEditCommon ? "Có thể chỉnh sửa" : "Chỉ xem",
          icon: <DashboardCustomizeOutlinedIcon />,
          accent: "#111827",
        },
        {
          key: "DOCUMENT" as DetailTab,
          title: "Tài liệu",
          description: "Quản lý kho tài liệu dùng chung theo phạm vi toàn bộ công việc và từng nhánh công việc.",
          badge: "MinIO",
          icon: <FolderOutlinedIcon />,
          accent: "#0f766e",
        },
        {
          key: "ASSIGN" as DetailTab,
          title: "Giao việc",
          description:
            "Quản lý người được giao, biểu mẫu báo cáo, kỳ hạn và tiến độ thực hiện.",
          badge: "Công việc",
          icon: <AssignmentTurnedInOutlinedIcon />,
          accent: "#2563eb",
        },
        {
          key: "REVIEW" as DetailTab,
          title: "Duyệt báo cáo",
          description: "Duyệt, trả lại, thu hồi và đánh giá báo cáo trong phạm vi được phân quyền.",
          badge: "Duyệt",
          icon: <FactCheckOutlinedIcon />,
          accent: "#b45309",
        },
      ];

      if (hasMyReportAssignments) {
        cards.splice(2, 0, {
          key: "REPORT" as DetailTab,
          title: "Báo cáo",
          description: "Làm báo cáo được giao và mở đúng kỳ báo cáo cần xử lý.",
          badge: "Báo cáo",
          icon: <SummarizeOutlinedIcon />,
          accent: "#0f766e",
        });
      }

      return cards;
    },
    [canEditCommon, hasMyReportAssignments]
  );

  const activeCard = functionCards.find((card) => card.key === tab) ?? null;
  const activeMeta =
    activeCard ??
    (tab === "REPORT"
      ? {
          title: "Báo cáo",
          description: "Làm báo cáo được giao và mở đúng kỳ báo cáo cần xử lý.",
        }
      : tab === "AGGREGATION"
      ? {
          title: "Tổng hợp",
          description: "Tổng hợp theo công việc đã chọn từ danh sách giao việc.",
        }
      : null);

  const pageTitle = tab ? activeMeta?.title ?? title : title;
  const pageDescription = tab
    ? activeMeta?.description ?? subtitle
    : subtitle;
  const listBackLabel = type === "TASK" ? "Danh sách nhiệm vụ" : "Danh sách chỉ tiêu";
  const ownerLabel =
    detail?.owner?.fullName?.trim() ||
    detail?.owner?.username?.trim() ||
    "-";
  const leaderLabel =
    detail?.leaderDirective?.fullName?.trim() ||
    detail?.leaderDirective?.username?.trim() ||
    "-";
  const updatedLabel = formatCompactDate(detail?.updatedAtUtc || detail?.createdAtUtc);
  const reportCountLabel = reportAssignmentsLoaded
    ? String(myReportAssignments?.length ?? 0)
    : "...";

  const summaryCards = [
    {
      label: "Báo cáo",
      value: reportCountLabel,
      helper: "được giao",
      icon: <SummarizeOutlinedIcon fontSize="small" />,
      color: "#0f766e",
    },
    {
      label: "Trạng thái",
      value: statusLabel,
      helper: "hiện tại",
      icon: <AssignmentTurnedInOutlinedIcon fontSize="small" />,
      color: statusColor,
    },
    {
      label: "Cập nhật",
      value: updatedLabel,
      helper: "gần nhất",
      icon: <UpdateOutlinedIcon fontSize="small" />,
      color: "#16a34a",
    },
  ];

  if (!id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>{uiText(UITextKey.TextThieuId2)}</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Đang tải dữ liệu...
            </Typography>
          </Stack>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Quay lại
          </Button>
        </Stack>
      </Box>
    );
  }

  if (isError || !detail) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Không tìm thấy dữ liệu với id: {id}
          </Typography>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Quay lại
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        p: { xs: 1, md: 2 },
        pt: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: workPageFont,
        background:
          "linear-gradient(180deg, rgba(248,251,255,0.96) 0%, rgba(255,255,255,1) 54%)",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          bgcolor: "rgba(255,255,255,0.96)",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Box
          sx={{
            px: { xs: 1.5, md: 2.5 },
            py: { xs: 1.5, md: 2 },
            borderBottom: "1px solid #eef2f7",
            background:
              "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,251,255,0.92) 100%)",
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{ minWidth: 0, color: "#64748b" }}
              >
                <HomeOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {type === "TASK" ? "Nhiệm vụ" : "Chỉ tiêu"}
                </Typography>
                <ChevronRightOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </Typography>
                {tab && (
                  <>
                    <ChevronRightOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#0f5bd8",
                        fontWeight: 800,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {activeMeta?.title}
                    </Typography>
                  </>
                )}
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                {tab === "COMMON" && canEditCommon && (
                  isEdit ? (
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => setCommonMode("view")}
                      sx={{ borderRadius: "8px", bgcolor: "#fff", borderColor: "#dbe4f0" }}
                    >
                      Xem
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => setCommonMode("edit")}
                      sx={{ borderRadius: "8px", boxShadow: "0 8px 18px rgba(37,99,235,0.22)" }}
                    >
                      Chỉnh sửa
                    </Button>
                  )
                )}

                {tab && (
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBackToLauncher}
                    sx={{ borderRadius: "8px", bgcolor: "#fff", borderColor: "#dbe4f0" }}
                  >
                    Quay lại
                  </Button>
                )}

                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<ListAltOutlinedIcon />}
                  onClick={handleBack}
                  sx={{ borderRadius: "8px", bgcolor: "#fff", borderColor: "#dbe4f0" }}
                >
                  {listBackLabel}
                </Button>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  color: "#fff",
                  bgcolor: activeCard?.accent ?? "#2563eb",
                  boxShadow: `0 10px 22px ${alpha(activeCard?.accent ?? "#2563eb", 0.24)}`,
                }}
              >
                {activeCard?.icon ?? <AssignmentTurnedInOutlinedIcon />}
              </Box>

              <Stack spacing={0.65} sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="h5"
                  sx={{
                    color: "#0f172a",
                    fontFamily: workPageFont,
                    fontWeight: 850,
                    lineHeight: 1.22,
                    letterSpacing: 0,
                  }}
                >
                  {pageTitle}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  title={pageDescription}
                  sx={{
                    maxWidth: 980,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: { xs: "normal", md: "nowrap" },
                    lineHeight: 1.55,
                  }}
                >
                  {pageDescription}
                </Typography>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {tab && (
                    <Chip
                      size="small"
                      label={subtitle}
                      sx={{
                        maxWidth: { xs: "100%", md: 520 },
                        bgcolor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontWeight: 700,
                        "& .MuiChip-label": {
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      }}
                    />
                  )}
                  <Chip
                    size="small"
                    label={statusLabel}
                    sx={{
                      color: statusColor,
                      bgcolor: alpha(statusColor, 0.1),
                      border: `1px solid ${alpha(statusColor, 0.2)}`,
                      borderRadius: "6px",
                      fontWeight: 800,
                    }}
                  />
                  {!tab && detail?.startDate && detail?.endDate && (
                    <Chip
                      size="small"
                      icon={<CalendarTodayOutlinedIcon />}
                      label={`${formatCompactDate(detail.startDate)} - ${formatCompactDate(detail.endDate)}`}
                      sx={{ borderRadius: "6px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}
                    />
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        {!tab ? (
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 1.5, md: 2 } }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1.25,
                }}
              >
                {summaryCards.map((item) => (
                  <Card
                    key={item.label}
                    elevation={0}
                    sx={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "8px",
                            display: "grid",
                            placeItems: "center",
                            color: item.color,
                            bgcolor: alpha(item.color, 0.1),
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              color: "#0f172a",
                              fontFamily: workPageFont,
                              fontWeight: 850,
                              lineHeight: 1.15,
                              letterSpacing: 0,
                            }}
                          >
                            {item.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {item.label} {item.helper}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 280px" },
                  gap: 2,
                  alignItems: "start",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                    gap: 2,
                  }}
                >
                  {functionCards.map((card) => (
                    <Card
                      key={card.key}
                      elevation={0}
                      sx={{
                        minHeight: 212,
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
                        transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 18px 40px ${alpha(card.accent, 0.16)}`,
                          borderColor: alpha(card.accent, 0.48),
                        },
                      }}
                    >
                      <CardActionArea
                        onClick={() => handleOpenFunction(card.key)}
                        sx={{ height: "100%", alignItems: "stretch" }}
                      >
                        <CardContent
                          sx={{
                            height: "100%",
                            p: 2,
                            display: "flex",
                            flexDirection: "column",
                            "&:last-child": { pb: 2 },
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: "8px",
                                display: "grid",
                                placeItems: "center",
                                color: card.accent,
                                bgcolor: alpha(card.accent, 0.1),
                              }}
                            >
                              {card.icon}
                            </Box>
                            <Chip
                              size="small"
                              label={card.badge}
                              sx={{
                                height: 26,
                                color: card.accent,
                                bgcolor: alpha(card.accent, 0.08),
                                border: `1px solid ${alpha(card.accent, 0.12)}`,
                                borderRadius: "6px",
                                fontWeight: 800,
                                "& .MuiChip-label": { px: 1 },
                              }}
                            />
                          </Stack>

                          <Box sx={{ mt: 3, flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                color: "#0f172a",
                                fontFamily: workPageFont,
                                fontWeight: 850,
                                lineHeight: 1.2,
                                letterSpacing: 0,
                                mb: 1,
                              }}
                            >
                              {card.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ lineHeight: 1.65, maxWidth: 520 }}
                            >
                              {card.description}
                            </Typography>
                          </Box>

                          <Box sx={{ display: "flex", justifyContent: "flex-end", color: card.accent }}>
                            <ArrowForwardOutlinedIcon fontSize="small" />
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>

                <Stack spacing={1.5}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonOutlineOutlinedIcon sx={{ color: "#2563eb" }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 850, color: "#0f172a" }}>
                            Phụ trách
                          </Typography>
                        </Stack>
                        <Stack spacing={1}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                              Chủ sở hữu
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 750, color: "#0f172a" }}>
                              {ownerLabel}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                              Lãnh đạo chỉ đạo
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 750, color: "#0f172a" }}>
                              {leaderLabel}
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <UpdateOutlinedIcon sx={{ color: "#16a34a" }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 850, color: "#0f172a" }}>
                            Trạng thái xử lý
                          </Typography>
                        </Stack>
                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography variant="body2" color="text.secondary">
                              Hiện tại
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: statusColor }}>
                              {statusLabel}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography variant="body2" color="text.secondary">
                              Cập nhật
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                              {updatedLabel}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              p: { xs: 1.5, md: 2 },
              pt: { xs: 1.5, md: 2 },
              display: "flex",
              flexDirection: "column",
              overflow: tab === "COMMON" ? "auto" : "hidden",
            }}
          >
            {tab === "COMMON" && (
              <WorkForm
                type={type}
                mode={effectiveCommonMode}
                initialData={detail}
                onCancel={() => {
                  if (isEdit) setCommonMode("view");
                  else handleBackToLauncher();
                }}
                onSaved={async () => {
                  setCommonMode("view");
                  await refetch();
                }}
              />
            )}

            {tab === "DOCUMENT" && (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <WorkDocumentLibrary workId={workId} />
              </Box>
            )}

            {tab === "ASSIGN" && (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <WorkAssignTab
                  workId={workId}
                  workStartDate={detail.startDate ?? null}
                  workEndDate={detail.endDate ?? null}
                  isWorkOwner={isWorkOwner}
                  onOpenAggregation={handleOpenAggregation}
                  onOpenReports={() => handleOpenFunction("REPORT")}
                  onOpenReview={() => handleOpenFunction("REVIEW")}
                />
              </Box>
            )}

            {tab === "REPORT" && !reportAssignmentsLoaded && (
              <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {tab === "REPORT" && reportAssignmentsLoaded && !hasMyReportAssignments && (
              <Alert severity="info">Không có báo cáo được giao cho tài khoản hiện tại.</Alert>
            )}

            {tab === "REPORT" && workId && reportAssignmentsLoaded && hasMyReportAssignments && !selectedReportTemplateGroup && (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <WorkReportTemplateGroupsPage
                  workId={workId}
                  onOpenGroup={(row: MyReportTemplateRow) => setSelectedReportTemplateGroup(row)}
                />
              </Box>
            )}

            {tab === "REPORT" && workId && reportAssignmentsLoaded && hasMyReportAssignments && selectedReportTemplateGroup && (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <WorkReportTemplateDetailPage
                  workId={workId}
                  group={selectedReportTemplateGroup}
                  onBack={() => setSelectedReportTemplateGroup(null)}
                />
              </Box>
            )}

            {tab === "AGGREGATION" && (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <WorkAggregationTab
                  workId={workId}
                  parentAssignmentId={aggregationSeed?.parentAssignmentId ?? null}
                  defaultDynamicExcelId={aggregationSeed?.dynamicExcelId ?? null}
                  defaultDynamicExcelCode={aggregationSeed?.dynamicExcelCode ?? null}
                  defaultDynamicExcelName={aggregationSeed?.dynamicExcelName ?? null}
                  defaultDynamicFormTemplateId={aggregationSeed?.dynamicFormTemplateId ?? null}
                  defaultDynamicFormTemplateCode={aggregationSeed?.dynamicFormTemplateCode ?? null}
                  defaultDynamicFormTemplateName={aggregationSeed?.dynamicFormTemplateName ?? null}
                />
              </Box>
            )}

            {tab === "REVIEW" && (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <WorkReviewTab workId={workId} />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WorkDetailPage;
