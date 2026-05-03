import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Stack,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import { WorkForm } from "../../components/works/workform/WorkForm";
import WorkAssignTab from "../../components/works/assignments/WorkAssignTab";
import type { AssignmentTableRow } from "../../components/works/assignments/WorkAssignmentTable";
import { useGetWorkQuery } from "../../api/workApi";

import WorkReportTemplateGroupsPage from "./report/WorkReportTemplateGroupsPage";
import WorkReportTemplateDetailPage from "./report/WorkReportTemplateDetailPage";
import WorkAggregationTab from "./aggregation/WorkAggregationTab";
import type { MyReportTemplateRow } from "../../types/report";
import WorkReviewTab from "../../components/works/review/WorkReviewTab";
import { getMeSnapshot } from "../../stores/authStorage";

type WorkType = "TASK" | "INDICATOR";

interface WorkDetailPageProps {
  type: WorkType;
}

type DetailTab = "COMMON" | "ASSIGN" | "REPORT" | "AGGREGATION" | "REVIEW";
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

const WorkDetailPage: React.FC<WorkDetailPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const me = getMeSnapshot();

  const [tab, setTab] = useState<DetailTab>("COMMON");
  const [commonMode, setCommonMode] = useState<CommonMode>("view");
  const [selectedReportTemplateGroup, setSelectedReportTemplateGroup] =
    useState<MyReportTemplateRow | null>(null);
  const [aggregationSeed, setAggregationSeed] = useState<AggregationSeed | null>(null);

  const workId = id ?? "";

  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = useGetWorkQuery(workId, { skip: !id });

  const title = type === "TASK" ? "Chi tiết nhiệm vụ" : "Chi tiết chỉ tiêu";
  const assignTabLabel = type === "TASK" ? "Giao nhiệm vụ" : "Giao chỉ tiêu";

  const subtitle = useMemo(() => {
    if (!detail) return "";
    const code = (detail.autoCode || detail.code || "").trim();
    const name = (detail.name || "").trim();
    if (code && name) return `${code} • ${name}`;
    return code || name || workId;
  }, [detail, workId]);

  const handleBack = () => navigate(-1);

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
  };

  const isWorkOwner = Boolean(
    detail?.owner?.userId &&
      me?.id &&
      detail.owner.userId === me.id
  );

  const detailCanEdit =
    typeof (detail as { canEdit?: unknown }).canEdit === "boolean"
      ? (detail as { canEdit?: boolean }).canEdit
      : false;

  const canEditCommon = Boolean(isWorkOwner || detailCanEdit);

  const effectiveCommonMode: CommonMode =
    canEditCommon && commonMode === "edit" ? "edit" : "view";

  const isEdit = effectiveCommonMode === "edit";

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSelectedReportTemplateGroup(null);
      setAggregationSeed(null);
      setTab("COMMON");
      setCommonMode("view");
    }, 0);

    return () => window.clearTimeout(handle);
  }, [workId]);

  if (!id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Thiếu id.</Typography>
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
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
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
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
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
        p: 2,
        pt: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.7,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={subtitle}
            >
              {subtitle}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {tab === "COMMON" && canEditCommon && (
              isEdit ? (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => setCommonMode("view")}
                >
                  Xem
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => setCommonMode("edit")}
                >
                  Chỉnh sửa
                </Button>
              )
            )}

            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Quay lại
            </Button>
          </Stack>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => {
            const next = v as DetailTab;
            setTab(next);

            if (next !== "REPORT") {
              setSelectedReportTemplateGroup(null);
            }

            if (next !== "COMMON") {
              setCommonMode("view");
            }
          }}
          sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
        >
          <Tab value="COMMON" label="Thuộc tính chung" />
          <Tab value="ASSIGN" label={assignTabLabel} />
          <Tab value="REPORT" label="Báo cáo" />
          <Tab value="AGGREGATION" label="Tổng hợp" />
          <Tab value="REVIEW" label="Duyệt báo cáo" />
        </Tabs>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {tab === "COMMON" && (
            <WorkForm
              type={type}
              mode={effectiveCommonMode}
              initialData={detail}
              onCancel={() => {
                if (isEdit) setCommonMode("view");
                else handleBack();
              }}
              onSaved={async () => {
                setCommonMode("view");
                await refetch();
              }}
            />
          )}

          {tab === "ASSIGN" && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <WorkAssignTab
                workId={workId}
                workStartDate={detail.startDate ?? null}
                workEndDate={detail.endDate ?? null}
                isWorkOwner={isWorkOwner}
                onOpenAggregation={handleOpenAggregation}
              />
            </Box>
          )}

          {tab === "REPORT" && workId && !selectedReportTemplateGroup && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <WorkReportTemplateGroupsPage
                workId={workId}
                onOpenGroup={(row: MyReportTemplateRow) => setSelectedReportTemplateGroup(row)}
              />
            </Box>
          )}

          {tab === "REPORT" && workId && selectedReportTemplateGroup && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <WorkReportTemplateDetailPage
                workId={workId}
                group={selectedReportTemplateGroup}
                onBack={() => setSelectedReportTemplateGroup(null)}
              />
            </Box>
          )}

          {tab === "AGGREGATION" && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
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
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <WorkReviewTab workId={workId} />
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default WorkDetailPage;
