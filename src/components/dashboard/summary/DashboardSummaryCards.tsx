import { Box, Paper, Stack, Typography } from "@mui/material";

import { SummaryCard } from "../../common/SummaryCard";
import type { DashboardOverviewMetricDto } from "../../../types/dashboard";

type Props = {
  cards: DashboardOverviewMetricDto[];
  loading?: boolean;
};

function buildSummaryColumns(count: number) {
  if (count <= 1) {
    return { xs: "1fr" };
  }

  return {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
  };
}

function renderMetricCard(card: DashboardOverviewMetricDto, loading: boolean) {
  return (
    <SummaryCard
      title={card.label}
      value={card.value}
      loading={loading}
      valueColor={card.valueColor || undefined}
      bottomRows={
        card.secondaryLabel
          ? [{ label: card.secondaryLabel, value: card.secondaryValue ?? "-" }]
          : undefined
      }
    />
  );
}

export default function DashboardSummaryCards({
  cards,
  loading = false,
}: Props) {
  const summaryCards = cards.filter((x) => (x.category ?? "summary") !== "status");
  const statusCards = cards.filter((x) => x.category === "status");

  const statusDescription =
    statusCards.find((x) => x.description?.trim())?.description?.trim() || "";

  if (summaryCards.length === 0 && statusCards.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2}>
      {summaryCards.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: buildSummaryColumns(summaryCards.length),
            alignItems: "stretch",
          }}
        >
          {summaryCards.map((card) => (
            <Box key={card.key} sx={{ minWidth: 0 }}>
              {renderMetricCard(card, loading)}
            </Box>
          ))}
        </Box>
      ) : null}

      {statusCards.length > 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 3,
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={1.5}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle2" fontWeight={700}>
                Nhóm thẻ trạng thái
              </Typography>
              {statusDescription ? (
                <Typography variant="caption" color="text.secondary">
                  {statusDescription}
                </Typography>
              ) : null}
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(5, minmax(0, 1fr))",
                },
                alignItems: "stretch",
              }}
            >
              {statusCards.map((card) => (
                <Box
                  key={card.key}
                  sx={{
                    minWidth: 0,
                    p: 1,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  {renderMetricCard(card, loading)}
                </Box>
              ))}
            </Box>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
