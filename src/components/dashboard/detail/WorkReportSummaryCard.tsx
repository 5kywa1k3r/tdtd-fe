import { Grid } from "@mui/material";

import { SummaryCard } from "../../common/SummaryCard";
import DashboardPieChart from "../charts/DashboardPieChart";
import type { DashboardNodeReportSummaryDto } from "../../../types/dashboard";
import {
  buildReportPieData,
  countOverdueReports,
  countWaitingReports,
} from "../../../utils/dashboardUi";

type Props = {
  summary?: DashboardNodeReportSummaryDto | null;
};

export default function WorkReportSummaryCard({ summary }: Props) {
  if (!summary) return null;

  const overdueApprovedCount =
    typeof summary.overdueApprovedCount === "number"
      ? summary.overdueApprovedCount
      : 0;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard title="Tổng báo cáo" value={summary.total} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard
              title="Đang chờ xử lý"
              value={countWaitingReports(summary)}
              bottomRows={[
                { label: "Chưa mở", value: summary.pendingCount },
                { label: "Bản nháp", value: summary.draftCount },
                { label: "Đã gửi", value: summary.submittedCount },
              ]}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard
              title="Đã duyệt"
              value={summary.approvedCount}
              valueColor="success.main"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard
              title="Quá hạn"
              value={countOverdueReports(summary)}
              valueColor="error.main"
              bottomRows={[
                { label: "Quá hạn chưa mở", value: summary.overduePendingCount },
                { label: "Quá hạn bản nháp", value: summary.overdueDraftCount },
                { label: "Quá hạn đã gửi", value: summary.overdueSubmittedCount },
                ...(overdueApprovedCount > 0
                  ? [
                      {
                        label: "Quá hạn đã duyệt",
                        value: overdueApprovedCount,
                      },
                    ]
                  : []),
              ]}
            />
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <DashboardPieChart
          title="Cơ cấu trạng thái báo cáo"
          data={buildReportPieData(summary)}
          height={280}
          emptyText="Chưa có dữ liệu báo cáo để hiển thị."
        />
      </Grid>
    </Grid>
  );
}