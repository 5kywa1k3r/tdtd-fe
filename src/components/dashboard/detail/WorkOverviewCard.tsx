import { Card, CardContent, Chip, Grid, Stack, Typography } from "@mui/material";

import { SummaryCard } from "../../common/SummaryCard";
import type { MyWorkSummaryRowDto } from "../../../types/dashboard";
import {
  buildProgressPieData,
  formatDateOnly,
  formatDateTime,
  getWorkStatusChipColor,
  getWorkStatusLabel,
} from "../../../utils/dashboardUi";
import DashboardPieChart from "../charts/DashboardPieChart";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  work: MyWorkSummaryRowDto;
};

export default function WorkOverviewCard({ work }: Props) {
  const progress = work.rootAssignmentProgressCounts;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                <div>
                  <Typography variant="h6" fontWeight={700}>
                    {work.workName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {work.workCode || "-"} • {work.workType || "-"}
                  </Typography>
                </div>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={getWorkStatusLabel(work.status)}
                    color={getWorkStatusChipColor(work.status)}
                  />
                  {work.hasManualEvaluations ? <Chip color="warning" label={uiText(UITextKey.TextCoDanhGiaThuCong)} /> : null}
                </Stack>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard title={uiText(UITextKey.TextCongViecDuocGiaoActive)} value={work.activeRootAssignmentCount} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard title={uiText(UITextKey.TextDaDanhGia)} value={work.evaluatedAssignmentCount} valueColor="warning.main" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard title={uiText(UITextKey.TextHanHoanThanh)} value={formatDateOnly(work.dueDate)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard title={uiText(UITextKey.TextCapNhatGanNhat)} value={formatDateTime(work.updatedAtUtc)} />
                </Grid>
              </Grid>

              {work.worstEvaluationLabel ? (
                <Typography variant="body2" color="text.secondary">
                  Đánh giá bất lợi nhất: <strong>{work.worstEvaluationLabel}</strong>
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <DashboardPieChart
          title={uiText(UITextKey.TextPhanBoTienDoCongViecDuocGiao)}
          data={buildProgressPieData(progress)}
          height={280}
          emptyText="Chưa có dữ liệu tiến độ để hiển thị."
        />
      </Grid>
    </Grid>
  );
}
