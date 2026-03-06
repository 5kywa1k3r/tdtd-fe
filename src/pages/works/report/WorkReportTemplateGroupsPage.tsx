import * as React from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";

import type { SortDirection } from "../../../components/common/AppTable";
import MyReportTemplateGroupTable, {
  type MyReportTemplateSortField,
} from "../../../components/reports/MyReportTemplateGroupTable";

import { useLazySearchMyReportTemplatesQuery } from "../../../api/reportApi";
import type {
  MyReportTemplateRow,
  MyReportTemplateSearchRequest,
} from "../../../types/report";

export interface WorkReportTemplateGroupsPageProps {
  workId?: string;
  active?: boolean;
  onOpenGroup?: (row: MyReportTemplateRow) => void;
}

const DEFAULT_SORT_FIELD: MyReportTemplateSortField = "latestUpdatedAtUtc";
const DEFAULT_SORT_DIRECTION: SortDirection = "desc";

export default function WorkReportTemplateGroupsPage(
  props: WorkReportTemplateGroupsPageProps
) {
  const { workId, active = true, onOpenGroup } = props;

  const [qInput, setQInput] = React.useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);

  const [filter, setFilter] = React.useState<MyReportTemplateSearchRequest>({
    page: 0,
    pageSize: 10,
    q: "",
    isActive: true,
    hasReport: null,
    sortField: DEFAULT_SORT_FIELD,
    sortDirection: DEFAULT_SORT_DIRECTION,
  });

  const [trigger, { data, isLoading, isFetching, error }] =
    useLazySearchMyReportTemplatesQuery();

  const runSearch = React.useCallback(
    (nextFilter: MyReportTemplateSearchRequest) => {
      if (!workId) return;
      trigger(
        {
          workId,
          req: nextFilter,
        },
        true
      );
      setHasLoadedOnce(true);
    },
    [trigger, workId]
  );

  React.useEffect(() => {
    if (!active || !workId || hasLoadedOnce) return;
    runSearch(filter);
  }, [active, workId, hasLoadedOnce, filter, runSearch]);

  const rows = data?.rows ?? [];
  const total = data?.totalRows ?? 0;

  const handleSearch = () => {
    const next = {
      ...filter,
      page: 0,
      q: qInput.trim(),
    };
    setFilter(next);
    runSearch(next);
  };

  const handleReset = () => {
    const next: MyReportTemplateSearchRequest = {
      page: 0,
      pageSize: 10,
      q: "",
      isActive: true,
      hasReport: null,
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIRECTION,
    };
    setQInput("");
    setFilter(next);
    runSearch(next);
  };

  const handleSortChange = (
    field: MyReportTemplateSortField,
    direction: SortDirection
  ) => {
    const next = {
      ...filter,
      page: 0,
      sortField: field,
      sortDirection: direction,
    };
    setFilter(next);
    runSearch(next);
  };

  const handlePageChange = (page: number) => {
    const next = {
      ...filter,
      page,
    };
    setFilter(next);
    runSearch(next);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const next = {
      ...filter,
      page: 0,
      pageSize,
    };
    setFilter(next);
    runSearch(next);
  };

  const handleReload = () => {
    runSearch(filter);
  };

  if (!workId) {
    return <Alert severity="warning">Thiếu workId để tải danh sách báo cáo.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Nhóm biểu mẫu báo cáo
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Tìm mã / tên biểu mẫu"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            fullWidth
          />

          <Button variant="contained" onClick={handleSearch}>
            Tìm
          </Button>

          <Button variant="outlined" onClick={handleReset}>
            Đặt lại
          </Button>

          <Button variant="outlined" onClick={handleReload} disabled={isFetching}>
            Tải lại
          </Button>
        </Stack>
      </Box>

      {error ? (
        <Alert severity="error">
          Không tải được danh sách nhóm biểu mẫu báo cáo.
        </Alert>
      ) : (
        <MyReportTemplateGroupTable
          rows={rows}
          total={total}
          page={filter.page}
          pageSize={filter.pageSize}
          sortField={(filter.sortField as MyReportTemplateSortField) ?? DEFAULT_SORT_FIELD}
          sortDirection={(filter.sortDirection as SortDirection) ?? DEFAULT_SORT_DIRECTION}
          onSortChange={handleSortChange}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onOpen={onOpenGroup}
          onRowDoubleClick={onOpenGroup}
        />
      )}

      {(isLoading || isFetching) && (
        <Typography variant="body2" color="text.secondary">
          Đang tải dữ liệu...
        </Typography>
      )}
    </Stack>
  );
}