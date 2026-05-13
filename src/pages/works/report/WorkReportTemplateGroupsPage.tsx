import * as React from "react";
import { Alert, Stack, Typography } from "@mui/material";

import type { SortDirection } from "../../../components/common/AppTable";
import MyReportTemplateGroupTable, {
  type MyReportTemplateSortField,
} from "../../../components/reports/MyReportTemplateGroupTable";
import WorkReportTemplateGroupFilterBar, {
  type WorkReportTemplateGroupFilterValue,
} from "../../../components/reports/WorkReportTemplateGroupFilterBar";
import { useLazySearchMyReportTemplatesQuery } from "../../../api/reportApi";
import type {
  MyReportTemplateRow,
  MyReportTemplateSearchRequest,
} from "../../../types/report";
import { UITextKey, uiText } from "../../../constants/uiText";

export interface WorkReportTemplateGroupsPageProps {
  workId?: string;
  active?: boolean;
  onOpenGroup?: (row: MyReportTemplateRow) => void;
}

const DEFAULT_SORT_FIELD: MyReportTemplateSortField = "latestUpdatedAtUtc";
const DEFAULT_SORT_DIRECTION: SortDirection = "desc";

const defaultFilterBarValue = (): WorkReportTemplateGroupFilterValue => ({
  q: "",
});

const defaultSearchRequest = (): MyReportTemplateSearchRequest => ({
  page: 0,
  pageSize: 10,
  q: "",
  isActive: null,
  hasReport: null,
  sortField: DEFAULT_SORT_FIELD,
  sortDirection: DEFAULT_SORT_DIRECTION,
});

export default function WorkReportTemplateGroupsPage(
  props: WorkReportTemplateGroupsPageProps
) {
  const { workId, active = true, onOpenGroup } = props;

  const [filterValue, setFilterValue] = React.useState<WorkReportTemplateGroupFilterValue>(
    defaultFilterBarValue()
  );
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [filter, setFilter] = React.useState<MyReportTemplateSearchRequest>(defaultSearchRequest());

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
  }, [active, filter, hasLoadedOnce, runSearch, workId]);

  const rows = data?.rows ?? [];
  const total = data?.totalRows ?? 0;

  const handleSearch = React.useCallback(() => {
    const next: MyReportTemplateSearchRequest = {
      ...filter,
      page: 0,
      q: filterValue.q.trim(),
    };
    setFilter(next);
    runSearch(next);
  }, [filter, filterValue.q, runSearch]);

  const handleReset = React.useCallback(() => {
    const next = defaultSearchRequest();
    setFilterValue(defaultFilterBarValue());
    setFilter(next);
    runSearch(next);
  }, [runSearch]);

  const handleSortChange = React.useCallback(
    (field: MyReportTemplateSortField, direction: SortDirection) => {
      const next: MyReportTemplateSearchRequest = {
        ...filter,
        page: 0,
        sortField: field,
        sortDirection: direction,
      };
      setFilter(next);
      runSearch(next);
    },
    [filter, runSearch]
  );

  const handlePageChange = React.useCallback(
    (page: number) => {
      const next: MyReportTemplateSearchRequest = {
        ...filter,
        page,
      };
      setFilter(next);
      runSearch(next);
    },
    [filter, runSearch]
  );

  const handlePageSizeChange = React.useCallback(
    (pageSize: number) => {
      const next: MyReportTemplateSearchRequest = {
        ...filter,
        page: 0,
        pageSize,
      };
      setFilter(next);
      runSearch(next);
    },
    [filter, runSearch]
  );

  if (!workId) {
    return <Alert severity="warning">{uiText(UITextKey.TextThieuWorkIdDeTaiDanhSachBaoCao)}</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <WorkReportTemplateGroupFilterBar
        value={filterValue}
        onChange={setFilterValue}
        onSearch={handleSearch}
        onReset={handleReset}
        onReload={() => runSearch(filter)}
        loading={isFetching}
      />

      {error ? (
        <Alert severity="error">{uiText(UITextKey.TextKhongTaiDuocDanhSachBaoCao)}</Alert>
      ) : rows.length === 0 && !isLoading && !isFetching ? (
        <Alert severity="info">{uiText(UITextKey.TextKhongCoNhomBieuMauBaoCaoPhuHop)}</Alert>
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
