import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AppTable, type AppTableColumn } from "../../common/AppTable";

export type ReviewEntityListItem = {
  key: string;
  label: string;
  secondary?: string;
};

type Props = {
  open: boolean;
  title: string;
  items: ReviewEntityListItem[];
  onClose: () => void;
};

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

const ReviewEntityListViewDialog: React.FC<Props> = ({
  open,
  title,
  items,
  onClose,
}) => {
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const filtered = React.useMemo(() => {
    const keyword = normalizeText(q);
    if (!keyword) return items;
    return items.filter((item) => {
      const text = normalizeText(`${item.label} ${item.secondary ?? ""}`);
      return text.includes(keyword);
    });
  }, [items, q]);

  const columns = React.useMemo<AppTableColumn<ReviewEntityListItem>[]>(
    () => [
      {
        field: "label",
        header: "Giá trị",
        sortable: true,
        width: "38%",
        getSortValue: (row) => row.label ?? "",
        render: (row) => (
          <Typography variant="body2" fontWeight={600} noWrap title={row.label}>
            {row.label}
          </Typography>
        ),
      },
      {
        field: "secondary",
        header: "Thông tin bổ sung",
        sortable: true,
        width: "62%",
        getSortValue: (row) => row.secondary ?? "",
        render: (row) => (
          <Typography variant="body2" color="text.secondary" noWrap title={row.secondary || "-"}>
            {row.secondary || "-"}
          </Typography>
        ),
      },
    ],
    []
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              size="small"
              label="Tìm nhanh"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
              sx={{ maxWidth: { md: 360 } }}
            />

            <Typography variant="body2" color="text.secondary">
              Tổng {filtered.length} / {items.length}
            </Typography>
          </Stack>

          <Box sx={{ borderRadius: 2, overflow: "hidden" }}>
            <AppTable<ReviewEntityListItem>
              rows={filtered}
              columns={columns}
              rowKey={(row) => row.key}
              selectable={false}
              initialSortField="label"
              initialSortDirection="asc"
              enablePagination
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewEntityListViewDialog;
