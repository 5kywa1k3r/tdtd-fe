import React from "react";
import { Box, Typography } from "@mui/material";
import { AppTable, type AppTableColumn } from "../../common/AppTable";
import type { AggregateTableResponse, AggregateTableRowDto } from "../../../types/reportAggregate";
import type { ReportRect } from "../../../types/aggregateTypes";
import {
  getAggregateUnitLabel,
  getAggregateUserLabel,
  valuesLengthFromRect,
} from "../../../components/works/aggregate/aggregateUtils";

export type AggregateResultTableProps = {
  result: AggregateTableResponse;
  aggregateMode: string;
  templateRect: ReportRect;
};

const AggregateResultTable: React.FC<AggregateResultTableProps> = ({
  result,
  aggregateMode,
  templateRect,
}) => {
  const columns = React.useMemo<AppTableColumn<AggregateTableRowDto>[]>(() => {
    const metaColumns: AppTableColumn<AggregateTableRowDto>[] = [];
    const isTemplateRowAppend = aggregateMode === "VERTICAL_BY_USER";

    if (aggregateMode !== "SUM_BY_CELL") {
      metaColumns.push(
        {
          field: "fullName",
          header: "Người dùng",
          width: "20%",
          sortable: false,
          render: (row) => (
            <Typography variant="body2" noWrap title={getAggregateUserLabel(row)}>
              {getAggregateUserLabel(row)}
            </Typography>
          ),
        },
        {
          field: "unitShortName",
          header: "Đơn vị",
          width: "16%",
          sortable: false,
          render: (row) => (
            <Typography variant="body2" noWrap title={getAggregateUnitLabel(row)}>
              {getAggregateUnitLabel(row)}
            </Typography>
          ),
        }
      );

      if (isTemplateRowAppend) {
        metaColumns.push({
          field: "sourceRowNumber",
          header: "Dòng mẫu",
          width: 100,
          align: "center",
          sortable: false,
          render: (row) => row.sourceRowLabel || row.sourceRowNumber || "-",
        });
      }
    }

    const valueCount = result.rows?.[0]?.values?.length ?? valuesLengthFromRect(templateRect);
    const valueColumns: AppTableColumn<AggregateTableRowDto>[] = Array.from(
      { length: valueCount },
      (_, idx) => ({
        field: `value_${idx}`,
        header: `V${idx + 1}`,
        width: 100,
        align: "center",
        sortable: false,
        render: (row) => row.values?.[idx] ?? "",
      })
    );

    return [...metaColumns, ...valueColumns];
  }, [aggregateMode, result.rows, templateRect]);

  return (
    <Box sx={{ minHeight: 280 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
        Bảng kết quả thô
      </Typography>
      <AppTable<AggregateTableRowDto>
        rows={result.rows ?? []}
        columns={columns}
        rowKey={(row) =>
          [
            row.userId || "",
            row.userName || "",
            row.fullName || "",
            row.unitSymbol || "",
            row.unitShortName || "",
            row.sourceRowKey || "",
            row.sourceRowNumber ?? "",
          ].join("|")
        }
        selectable={false}
      />
    </Box>
  );
};

export default AggregateResultTable;
