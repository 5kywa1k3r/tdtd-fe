import { useMemo } from "react";
import { IconButton, Stack, Tooltip } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

import type { EvaluationTemplateDto } from "../../types/evaluationTemplate";
import { AppTable, type AppTableColumn } from "../common/AppTable";
import CommonLabelText from "../common/CommonLabelText";
import CommonDateText from "../common/CommonDateText";
import BooleanChip from "../common/BooleanChip";
import { UITextKey, uiText } from '../../constants/uiText';

type Props = {
  rows: EvaluationTemplateDto[];
  onView: (row: EvaluationTemplateDto) => void;
  onDeactivate: (row: EvaluationTemplateDto) => void;
  canManage: boolean;
};

export default function EvaluationTemplateTable({
  rows,
  onView,
  onDeactivate,
  canManage,
}: Props) {
  const columns = useMemo<AppTableColumn<EvaluationTemplateDto>[]>(
    () => [
      {
        field: "representativeCode",
        header: "Mã đại diện",
        sortable: true,
        width: 150,
        getSortValue: (row) => row.representativeCode?.toLowerCase() || "",
        render: (row) => <CommonLabelText text={row.representativeCode} fontWeight={700} />,
      },
      {
        field: "representativeLabel",
        header: "Tên bộ đánh giá",
        sortable: true,
        width: "30%",
        getSortValue: (row) => row.representativeLabel?.toLowerCase() || "",
        render: (row) => (
          <Stack spacing={0.25}>
            <CommonLabelText text={row.representativeLabel} fontWeight={600} />
            {row.unitCodeScope ? (
              <CommonLabelText
                text={`Phạm vi: ${row.unitCodeScope}`}
                variant="caption"
                color="text.secondary"
              />
            ) : null}
          </Stack>
        ),
      },
      {
        field: "items",
        header: "Số mã con",
        sortable: true,
        width: 110,
        align: "center",
        getSortValue: (row) => row.items?.length ?? 0,
        render: (row) => String(row.items?.length ?? 0),
      },
      {
        field: "isActive",
        header: "Trạng thái",
        sortable: true,
        width: 140,
        align: "center",
        getSortValue: (row) => (row.isActive ? 1 : 0),
        render: (row) => (
          <BooleanChip
            value={row.isActive}
            trueLabel="Đang dùng"
            falseLabel="Ngừng dùng"
            trueColor="success"
          />
        ),
      },
      {
        field: "updatedAtUtc",
        header: "Cập nhật",
        sortable: true,
        width: 160,
        getSortValue: (row) => row.updatedAtUtc || row.createdAtUtc || "",
        render: (row) => <CommonDateText value={row.updatedAtUtc || row.createdAtUtc} withTime />,
      },
      {
        field: "actions",
        header: "Thao tác",
        sortable: false,
        width: 120,
        align: "center",
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title={uiText(UITextKey.TextXemChiTiet)}>
              <IconButton size="small" onClick={() => onView(row)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {canManage && row.isActive && (
              <Tooltip title={uiText(UITextKey.TextNgungDung)}>
                <IconButton size="small" color="error" onClick={() => onDeactivate(row)}>
                  <BlockOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    [canManage, onDeactivate, onView]
  );

  return (
    <AppTable<EvaluationTemplateDto>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      selectable={false}
      initialSortField="representativeCode"
      initialSortDirection="asc"
      initialPageSize={10}
      onRowDoubleClick={onView}
    />
  );
}
