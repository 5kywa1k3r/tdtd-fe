import React, { useMemo, useState } from "react";
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
import { WorkAssignTab } from "../../components/works/assignments/WorkAssignTab";
import { useGetWorkQuery } from "../../api/workApi";

import WorkReportTemplateGroupsPage from "./report/WorkReportTemplateGroupsPage";
import type { MyReportTemplateRow } from "../../types/report";

type WorkType = "TASK" | "INDICATOR";

interface WorkDetailPageProps {
  type: WorkType;
}

type DetailTab = "COMMON" | "ASSIGN" | "AGGREGATE" | "REPORT";

// COMMON: view/edit trong cùng 1 page
type CommonMode = "view" | "edit";

const WorkDetailPage: React.FC<WorkDetailPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [tab, setTab] = useState<DetailTab>("COMMON");
  const [commonMode, setCommonMode] = useState<CommonMode>("view");
  const [selectedReportTemplateGroup, setSelectedReportTemplateGroup] =
  useState<MyReportTemplateRow | null>(null);

  const workId = id ?? "";
  const { data: detail, isLoading, isError, refetch } = useGetWorkQuery(workId, { skip: !id });

  const title = type === "TASK" ? "Chi tiết nhiệm vụ" : "Chi tiết chỉ tiêu";
  const assignTabLabel = type === "TASK" ? "Giao nhiệm vụ" : "Giao chỉ tiêu";

  // title line dưới header (autoCode/code)
  const subtitle = useMemo(() => {
    if (!detail) return "";
    const code = (detail.autoCode || detail.code || "").trim();
    return code ? `${code} • ${detail.name}` : detail.name;
  }, [detail]);

  const handleBack = () => navigate(-1);

  const canEdit = true; // TODO: sau này ràng theo role/permission
  const isEdit = commonMode === "edit";

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
        p: 2,
        pt: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Header */}
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
            {tab === "COMMON" && canEdit && (
              <>
                {isEdit ? (
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
                )}
              </>
            )}

            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Quay lại
            </Button>
          </Stack>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as DetailTab)}
          sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
        >
          <Tab value="COMMON" label="Thuộc tính chung" />
          <Tab value="ASSIGN" label={assignTabLabel} />
          <Tab value="AGGREGATE" label="Tự động tổng hợp" />
          <Tab value="REPORT" label="Báo cáo" />
        </Tabs>

        {/* Tab content */}
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {tab === "COMMON" && (
            <WorkForm
              type={type}
              mode={commonMode}
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
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <WorkAssignTab
                workId={workId}
                workStartDate={detail.startDate ?? null}
                workEndDate={detail.endDate ?? null}
              />
            </Box>
          )}

          {tab === "AGGREGATE" && (
            <Box sx={{ p: 2, opacity: 0.6 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Tự động tổng hợp
              </Typography>
              <Typography variant="body2">
                Placeholder – sẽ gắn Aggregation Builder sau.
              </Typography>
            </Box>
          )}

          {tab === "REPORT" && workId && !selectedReportTemplateGroup && (
            <WorkReportTemplateGroupsPage
              workId={workId}
              onOpenGroup={(row) => setSelectedReportTemplateGroup(row)}
            />
          )}

          {tab === "REPORT" && workId && selectedReportTemplateGroup && (
            <Box>
              Đã chọn nhóm biểu mẫu: {selectedReportTemplateGroup.dynamicExcelName}
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default WorkDetailPage;