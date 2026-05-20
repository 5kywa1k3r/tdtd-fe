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

export interface AssignmentTableRow {
  id: string;
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
}

interface WorkAssignmentTableProps {
  rows: AssignmentTableRow[];
  onViewDetail?: (row: AssignmentTableRow) => void;
  onPreviewTemplate?: (row: AssignmentTableRow) => void;
  onOpenAggregate?: (row: AssignmentTableRow) => void;
  onConfigureSourceRules?: (row: AssignmentTableRow) => void;
  onConfigureAutoApprove?: (row: AssignmentTableRow) => void;
  onComplete?: (row: AssignmentTableRow) => void;
  onToggleActive?: (row: AssignmentTableRow) => void;
  onEvaluate?: (row: AssignmentTableRow) => void;
}

function getTemplateLabel(row: AssignmentTableRow) {
  const code = row.dynamicFormTemplateCode?.trim() || row.dynamicExcelCode?.trim();
  const name = row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || row.id;
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
  onViewDetail,
  onPreviewTemplate,
  onEvaluate,
  onOpenAggregate,
  onConfigureSourceRules,
  onConfigureAutoApprove,
  onComplete,
  onToggleActive,
}) => {
  const columns: AppTableColumn<AssignmentTableRow>[] = useMemo(
    () => [
      {
        field: "actions",
        header: "Thao tác",
        width: 330,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title={uiText(UITextKey.TextXemChiTiet)}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail?.(row);
                }}
              >
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip
              title={
                row.dynamicFormTemplateId
                  ? "Xem trước biểu mẫu động"
                  : "Công việc chưa có biểu mẫu động"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={!row.dynamicFormTemplateId}
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
                row.evaluationTemplateId
                  ? "Đánh giá công việc"
                  : "Công việc chưa có bộ tiêu chí"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={!row.evaluationTemplateId}
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
                isRootAssignment(row)
                  ? "Assignment root không ghi tổng hợp lên báo cáo cấp trên"
                  : uiText(UITextKey.TextTongHop)
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={isRootAssignment(row)}
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
                row.dynamicFormTemplateId
                  ? "Cấu hình nguồn dữ liệu"
                  : "Công việc chưa có biểu mẫu động"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={!row.dynamicFormTemplateId}
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
                row.dynamicFormTemplateId
                  ? "Cấu hình tự duyệt"
                  : "Công việc chưa có biểu mẫu động"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={!row.dynamicFormTemplateId}
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

            <Tooltip title={row.isActive ? "Ngừng hiệu lực" : "Kích hoạt lại"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive?.(row);
                }}
              >
                <PowerSettingsNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={isAssignmentCompleted(row) ? "Công việc đã hoàn thành" : "Xác nhận hoàn thành"}>
              <span>
                <IconButton
                  size="small"
                  disabled={isAssignmentCompleted(row)}
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
        field: "dynamicFormTemplateCode",
        header: "Biểu mẫu",
        sortable: true,
        width: "22%",
        getSortValue: (row) => getTemplateLabel(row).toLowerCase(),
        render: (row) => (
          <CommonLabelText
            text={getTemplateLabel(row)}
            fontWeight={600}
          />
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
            <CommonDateText value={row.dueDate} />
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
    [onComplete, onConfigureAutoApprove, onConfigureSourceRules, onEvaluate, onOpenAggregate, onPreviewTemplate, onToggleActive, onViewDetail]
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
