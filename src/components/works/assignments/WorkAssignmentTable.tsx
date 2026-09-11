import React, { useMemo } from "react";
import { Chip, IconButton, Stack, Tooltip } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";

import { AppTable, type AppTableColumn } from "../../common/AppTable";
import CommonLabelText from "../../common/CommonLabelText";
import CommonDateText from "../../common/CommonDateText";
import BooleanChip from "../../common/BooleanChip";
import AssignmentProgressChip from "../../reports/AssignmentProgressChip";
import { UITextKey, uiText } from '../../../constants/uiText';
import type { WorkAssignmentFlowMetadataFields } from "../../../types/workAssignment";

export interface AssignmentTableRow extends WorkAssignmentFlowMetadataFields {
  id: string;
  code?: string | null;
  name?: string | null;
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicFormDataSourceRulesJson?: string | null;
  autoApproveConditionJson?: string | null;
  assignmentType?: string | null;
  aggregationType?: string | null;
  assignees?:
    | Array<{
        userId?: string | null;
        fullName?: string | null;
        username?: string | null;
        userName?: string | null;
        unitId?: string | null;
        unitSymbol?: string | null;
        unitShortName?: string | null;
        unitName?: string | null;
      }>
    | null;
  isActive?: boolean | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  progressStatus?: number | null;
  progressStatusUpdatedAtUtc?: string | null;
  latestPeriodKey?: string | null;
  latestDueAtUtc?: string | null;
  hasAnyDuePeriod?: boolean | null;
  hasOverduePeriod?: boolean | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  completedAtUtc?: string | null;
  completedByUserId?: string | null;
  evaluationTemplateLabel?: string | null;
  evaluationTemplateCode?: string | null;
  evaluatedAssignmentCount?: number | null;
  worstEvaluationLabel?: string | null;
  worstEvaluationCode?: string | null;
  dueAtUtc?: string | null;
  evaluationTemplateId?: string | null;
  evaluationCode?: string | null;
  evaluationLabel?: string | null;
  parentAssignmentId?: string | null;
  rootAssignmentId?: string | null;
  level?: number | null;
  path?: string | null;
}

interface WorkAssignmentTableProps {
  rows: AssignmentTableRow[];
  readOnly?: boolean;
  onViewDetail?: (row: AssignmentTableRow) => void;
  onPreviewTemplate?: (row: AssignmentTableRow) => void;
  onOpenAggregate?: (row: AssignmentTableRow) => void;
  onConfigureSourceRules?: (row: AssignmentTableRow) => void;
  onConfigureAutoApprove?: (row: AssignmentTableRow) => void;
  onComplete?: (row: AssignmentTableRow) => void;
  completeActionLabel?: string;
  completedActionLabel?: string;
  onToggleActive?: (row: AssignmentTableRow) => void;
  onEvaluate?: (row: AssignmentTableRow) => void;
}

function getTemplateLabel(row: AssignmentTableRow) {
  const name = row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  return name || row.id;
}

const FLOW_RUNTIME_READONLY_REASON =
  "Assignment do Flow runtime sở hữu; chỉ server capability tại canonical Flow route mới được mở thao tác.";
const FLOW_RUNTIME_P7_REASON = "Flow runtime mapping/source rules bị khóa đến P7.";
const FLOW_RUNTIME_P8_REASON = "Flow runtime statistics/aggregation bị khóa đến P8.";

function isFlowRuntimeOwned(row: AssignmentTableRow) {
  return Boolean(row.flowInstanceId?.trim());
}

function getTemplateCode(row: AssignmentTableRow) {
  return row.dynamicFormTemplateCode?.trim() || row.dynamicExcelCode?.trim();
}

function getAssignmentName(row: AssignmentTableRow) {
  return row.name?.trim() || row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim() || row.id;
}

function getAssigneeSummary(row: AssignmentTableRow) {
  const list = row.assignees ?? [];
  const labels = list
    .map((x) => x?.fullName?.trim() || x?.username?.trim() || x?.userName?.trim())
    .filter(Boolean) as string[];

  if (labels.length === 0) return "-";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
}

function getEvaluationTemplateLabel(row: AssignmentTableRow) {
  return row.evaluationTemplateLabel || row.evaluationTemplateCode || "-";
}

function getDueDateValue(row: AssignmentTableRow) {
  return row.dueAtUtc || row.latestDueAtUtc || null;
}

function getDueSortValue(row: AssignmentTableRow) {
  if (row.assignmentType === "ONCE") {
    return getDueDateValue(row) || "";
  }

  return row.latestPeriodKey || "";
}

function manualEvalLabel(row: AssignmentTableRow) {
  if ((row.evaluatedAssignmentCount ?? 0) <= 0) return "Chưa đánh giá";
  return row.worstEvaluationLabel || row.worstEvaluationCode || "Đã đánh giá";
}

function isRootAssignment(row: AssignmentTableRow) {
  if (row.level === 0) return true;
  if (!row.parentAssignmentId?.trim()) return true;
  return Boolean(row.rootAssignmentId && row.rootAssignmentId === row.id);
}

function isAssignmentCompleted(row: AssignmentTableRow) {
  return Boolean(row.completedAtUtc || (row.progressStatus === 2 && row.completedDate));
}

const WorkAssignmentTable: React.FC<WorkAssignmentTableProps> = ({
  rows,
  readOnly = false,
  onViewDetail,
  onPreviewTemplate,
  onEvaluate,
  onOpenAggregate,
  onConfigureSourceRules,
  onConfigureAutoApprove,
  onComplete,
  completeActionLabel = "Xác nhận hoàn thành",
  completedActionLabel = "Công việc đã hoàn thành",
  onToggleActive,
}) => {
  const columns: AppTableColumn<AssignmentTableRow>[] = useMemo(
    () => [
      {
        field: "actions",
        header: "Thao tác",
        width: 370,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_READONLY_REASON
                  : uiText(UITextKey.TextXemChiTiet)
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={isFlowRuntimeOwned(row)}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_READONLY_REASON
                      : uiText(UITextKey.TextXemChiTiet)
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail?.(row);
                  }}
                >
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_READONLY_REASON
                  : row.dynamicFormTemplateId
                  ? "Xem trước biểu mẫu động"
                  : "Công việc chưa có biểu mẫu động"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={isFlowRuntimeOwned(row) || !row.dynamicFormTemplateId}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_READONLY_REASON
                      : "Xem trước biểu mẫu động"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewTemplate?.(row);
                  }}
                >
                  <PreviewOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_READONLY_REASON
                  : row.evaluationTemplateId
                  ? "Đánh giá công việc"
                  : "Công việc chưa có bộ tiêu chí"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={readOnly || isFlowRuntimeOwned(row) || !row.evaluationTemplateId}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_READONLY_REASON
                      : "Đánh giá công việc"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onEvaluate?.(row);
                  }}
                >
                  <FactCheckOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_P8_REASON
                  : isRootAssignment(row)
                  ? "Tổng hợp bảng từ các công việc đã giao hoặc phối hợp"
                  : uiText(UITextKey.TextTongHop)
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={isFlowRuntimeOwned(row)}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_P8_REASON
                      : uiText(UITextKey.TextTongHop)
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAggregate?.(row);
                  }}
                >
                  <TableViewOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_P7_REASON
                  : row.dynamicFormTemplateId
                  ? "Cấu hình nguồn dữ liệu"
                  : "Công việc chưa có biểu mẫu động"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={readOnly || isFlowRuntimeOwned(row) || !row.dynamicFormTemplateId}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_P7_REASON
                      : "Cấu hình nguồn dữ liệu"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigureSourceRules?.(row);
                  }}
                >
                  <AccountTreeOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_READONLY_REASON
                  : row.dynamicFormTemplateId
                  ? "Cấu hình tự duyệt"
                  : "Công việc chưa có biểu mẫu động"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={readOnly || isFlowRuntimeOwned(row) || !row.dynamicFormTemplateId}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_READONLY_REASON
                      : "Cấu hình tự duyệt"
                  }
                  color={row.autoApproveConditionJson ? "success" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigureAutoApprove?.(row);
                  }}
                >
                  <RuleOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_READONLY_REASON
                  : row.isActive
                    ? "Ngừng hiệu lực"
                    : "Kích hoạt lại"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={readOnly || isFlowRuntimeOwned(row)}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_READONLY_REASON
                      : row.isActive
                        ? "Ngừng hiệu lực"
                        : "Kích hoạt lại"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive?.(row);
                  }}
                >
                  <PowerSettingsNewIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isFlowRuntimeOwned(row)
                  ? FLOW_RUNTIME_READONLY_REASON
                  : isAssignmentCompleted(row)
                    ? completedActionLabel
                    : completeActionLabel
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={readOnly || isFlowRuntimeOwned(row) || isAssignmentCompleted(row)}
                  aria-label={
                    isFlowRuntimeOwned(row)
                      ? FLOW_RUNTIME_READONLY_REASON
                      : isAssignmentCompleted(row)
                        ? completedActionLabel
                        : completeActionLabel
                  }
                  color={isAssignmentCompleted(row) ? "success" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete?.(row);
                  }}
                >
                  <TaskAltOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: "name",
        header: "Công việc",
        sortable: true,
        width: "20%",
        getSortValue: (row) => `${row.code || ""} ${getAssignmentName(row)}`.toLowerCase(),
        render: (row) => (
          <Stack spacing={0.45} sx={{ minWidth: 0 }}>
            <Chip
              size="small"
              variant="outlined"
              label={row.code || "Chưa có mã"}
              sx={{ width: "fit-content", maxWidth: "100%" }}
            />
            <CommonLabelText text={getAssignmentName(row)} fontWeight={700} />
          </Stack>
        ),
      },
      {
        field: "dynamicFormTemplateCode",
        header: "Biểu mẫu",
        sortable: true,
        width: "18%",
        getSortValue: (row) => getTemplateLabel(row).toLowerCase(),
        render: (row) => (
          <Stack spacing={0.45} sx={{ minWidth: 0 }}>
            {getTemplateCode(row) ? (
              <Chip
                size="small"
                variant="outlined"
                label={getTemplateCode(row)}
                sx={{ width: "fit-content", maxWidth: "100%" }}
              />
            ) : null}
            <CommonLabelText
              text={getTemplateLabel(row)}
              fontWeight={600}
            />
          </Stack>
        ),
      },
      {
        field: "assignees",
        header: "Người được giao",
        sortable: true,
        width: "18%",
        getSortValue: (row) => getAssigneeSummary(row).toLowerCase(),
        render: (row) => <CommonLabelText text={getAssigneeSummary(row)} />,
      },
      {
        field: "evaluationTemplateLabel",
        header: "Bộ tiêu chí",
        sortable: true,
        width: 170,
        getSortValue: (row) => getEvaluationTemplateLabel(row).toLowerCase(),
        render: (row) => <CommonLabelText text={getEvaluationTemplateLabel(row)} />,
      },
      {
        field: "worstEvaluationLabel",
        header: "Đánh giá thủ công",
        sortable: true,
        width: 160,
        align: "center",
        getSortValue: (row) => manualEvalLabel(row).toLowerCase(),
        render: (row) => (
          <Chip
            size="small"
            variant={(row.evaluatedAssignmentCount ?? 0) > 0 ? "filled" : "outlined"}
            label={manualEvalLabel(row)}
          />
        ),
      },
      {
        field: "evaluatedAssignmentCount",
        header: "Đã đánh giá",
        sortable: true,
        width: 110,
        align: "center",
        getSortValue: (row) => row.evaluatedAssignmentCount ?? 0,
        render: (row) => String(row.evaluatedAssignmentCount ?? 0),
      },
      {
        field: "assignmentType",
        header: "Loại giao",
        sortable: true,
        width: 130,
        align: "center",
        getSortValue: (row) => row.assignmentType || "",
        render: (row) => (
          <Chip
            size="small"
            variant="outlined"
            color={row.assignmentType === "PERIODIC_REPORT" ? "primary" : "default"}
            label={row.assignmentType === "PERIODIC_REPORT" ? "Định kỳ" : "Một lần"}
          />
        ),
      },
      {
        field: "progressStatus",
        header: "Tiến độ",
        sortable: true,
        width: 150,
        align: "center",
        getSortValue: (row) => row.progressStatus ?? -1,
        render: (row) => <AssignmentProgressChip status={row.progressStatus} />,
      },
      {
        field: "latestDueAtUtc",
        header: "Kỳ / hạn",
        sortable: true,
        width: 150,
        align: "center",
        getSortValue: getDueSortValue,
        render: (row) =>
          row.assignmentType === "ONCE" ? (
            <CommonDateText value={getDueDateValue(row)} withTime />
          ) : (
            <CommonLabelText text={row.latestPeriodKey || "-"} />
          ),
      },
      {
        field: "startDate",
        header: "Kế hoạch",
        sortable: true,
        width: 180,
        getSortValue: (row) => row.startDate || "",
        render: (row) => (
          <Stack spacing={0.25}>
            <CommonDateText value={row.startDate} />
            {row.assignmentType !== "ONCE" ? <CommonDateText value={row.dueDate} /> : null}
          </Stack>
        ),
      },
      {
        field: "completedDate",
        header: "Hoàn thành",
        sortable: true,
        width: 130,
        align: "center",
        getSortValue: (row) => row.completedDate || "",
        render: (row) => <CommonDateText value={row.completedDate} />,
      },
      {
        field: "isActive",
        header: "Hiệu lực",
        sortable: true,
        width: 130,
        align: "center",
        getSortValue: (row) => (row.isActive ? 1 : 0),
        render: (row) => (
          <BooleanChip
            value={!!row.isActive}
            trueLabel="Đang hiệu lực"
            falseLabel="Ngừng hiệu lực"
            trueColor="success"
          />
        ),
      },
      {
        field: "updatedAtUtc",
        header: "Cập nhật",
        sortable: true,
        width: 160,
        getSortValue: (row) => row.updatedAtUtc || "",
        render: (row) => <CommonDateText value={row.updatedAtUtc} withTime />,
      },
    ],
    [
      completeActionLabel,
      completedActionLabel,
      onComplete,
      onConfigureAutoApprove,
      onConfigureSourceRules,
      onEvaluate,
      onOpenAggregate,
      onPreviewTemplate,
      onToggleActive,
      onViewDetail,
      readOnly,
    ]
  );

  return (
    <AppTable<AssignmentTableRow>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      selectable={false}
      initialSortField="updatedAtUtc"
      initialSortDirection="desc"
      initialPageSize={10}
      onRowDoubleClick={onViewDetail}
    />
  );
};

export default WorkAssignmentTable;
