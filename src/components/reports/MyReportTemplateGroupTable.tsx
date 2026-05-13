import React from "react";
import { IconButton, Stack, Tooltip } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import { AppTable, type AppTableColumn, type SortDirection } from "../common/AppTable";
import CommonLabelText from "../common/CommonLabelText";
import CommonDateText from "../common/CommonDateText";
import BooleanChip from "../common/BooleanChip";
import ReportPeriodStatusChip from "./ReportPeriodStatusChip";
import type { MyReportTemplateRow } from "../../types/report";
import { UITextKey, uiText } from '../../constants/uiText';

export type MyReportTemplateSortField =
  | "dynamicFormTemplateCode"
  | "dynamicFormTemplateName"
  | "dynamicExcelCode"
  | "dynamicExcelName"
  | "bindingCount"
  | "periodCount"
  | "reportCount"
  | "latestPeriodKey"
  | "latestDueAtUtc"
  | "latestUpdatedAtUtc";

type Props = {
  rows: MyReportTemplateRow[];
  total: number;
  page: number;
  pageSize: number;
  sortField?: MyReportTemplateSortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: MyReportTemplateSortField, direction: SortDirection) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onOpen?: (row: MyReportTemplateRow) => void;
  onRowDoubleClick?: (row: MyReportTemplateRow) => void;
};

function getTemplateLabel(row: MyReportTemplateRow) {
  const code = row.dynamicFormTemplateCode?.trim() || row.dynamicExcelCode?.trim();
  const name = row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || row.dynamicFormTemplateId || row.dynamicExcelId || "";
}

export default function MyReportTemplateGroupTable({
  rows,
  total,
  page,
  pageSize,
  sortField = "latestUpdatedAtUtc",
  sortDirection = "desc",
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onRowDoubleClick,
}: Props) {
  const columns = React.useMemo<AppTableColumn<MyReportTemplateRow>[]>(
    () => [
      {
        field: "actions",
        header: "Thao tác",
        width: 90,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title={uiText(UITextKey.TextMoChiTiet)}>
              <span>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen?.(row);
                  }}
                  disabled={!onOpen}
                >
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: "dynamicFormTemplateCode",
        header: "Biểu mẫu",
        width: "28%",
        sortable: true,
        render: (row) => <CommonLabelText text={getTemplateLabel(row)} fontWeight={600} />,
      },
      {
        field: "bindingCount",
        header: "Phân công",
        width: 100,
        align: "center",
        sortable: true,
        render: (row) => row.bindingCount ?? 0,
      },
      {
        field: "periodCount",
        header: "Số kỳ",
        width: 90,
        align: "center",
        sortable: true,
        render: (row) => row.periodCount ?? 0,
      },
      {
        field: "reportCount",
        header: "Báo cáo",
        width: 90,
        align: "center",
        sortable: true,
        render: (row) => row.reportCount ?? 0,
      },
      {
        field: "latestPeriodStatus",
        header: "Trạng thái kỳ",
        width: 140,
        align: "center",
        sortable: false,
        render: (row) => <ReportPeriodStatusChip status={row.latestPeriodStatus} />,
      },
      {
        field: "latestDueAtUtc",
        header: "Hạn gần nhất",
        width: 130,
        sortable: true,
        render: (row) => <CommonDateText value={row.latestDueAtUtc} />,
      },
      {
        field: "hasOverduePeriod",
        header: "Quá hạn",
        width: 110,
        align: "center",
        sortable: false,
        render: (row) => (
          <BooleanChip
            value={!!row.hasOverduePeriod}
            trueLabel="Có"
            falseLabel="Không"
            trueColor="error"
          />
        ),
      },
      {
        field: "latestUpdatedAtUtc",
        header: "Cập nhật gần nhất",
        width: 170,
        sortable: true,
        render: (row) => <CommonDateText value={row.latestUpdatedAtUtc} withTime />,
      },
    ],
    [onOpen]
  );

  return (
    <AppTable<MyReportTemplateRow, MyReportTemplateSortField>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.dynamicFormTemplateId || row.dynamicExcelId || ""}
      selectable={false}
      onRowDoubleClick={onRowDoubleClick}
      sortMode="server"
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      enablePagination
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      totalRows={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      rowsPerPageOptions={[10, 20, 50, 100]}
    />
  );
}
