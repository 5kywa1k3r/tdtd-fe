// src/components/dashboard/SummaryCard.tsx
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';

interface BottomRow {
  label: string;
  value: number | string;
}

interface SummaryCardProps {
  title: string;
  value: number | string;
  valueColor?: string;
  bottomRows?: BottomRow[];
  loading?: boolean;
}

export function SummaryCard({
  title,
  value,
  valueColor = 'text.primary',
  bottomRows = [],
  loading = false,
}: SummaryCardProps) {
  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Title */}
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}
        >
          {title}
        </Typography>

        {/* Value */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: valueColor,
            minHeight: 40,
          }}
        >
          {loading ? '...' : value}
        </Typography>

        {/* Bottom Rows */}
        {bottomRows.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Divider sx={{ mb: 1 }} />
            {bottomRows.map((row, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {row.label}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {row.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
