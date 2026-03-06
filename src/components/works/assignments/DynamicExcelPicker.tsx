import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PreviewIcon from "@mui/icons-material/Preview";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import {
  useSearchDynamicExcelMutation,
} from "../../../api/dynamicExcelApi";

type DynamicExcelOption = {
  id: string;
  code: string;
  name: string;
  labels: string[];
  createdByUsername: string;
  createdAtUtc: string;
};

type DynamicExcelPickerProps = {
  value?: string | null;
  valueCode?: string | null;
  valueName?: string | null;
  onChange: (item: DynamicExcelOption | null) => void;
  disabled?: boolean;
  onPreview?: (id: string) => void;
};

export const DynamicExcelPicker: React.FC<DynamicExcelPickerProps> = ({
  value,
  valueCode,
  valueName,
  onChange,
  disabled,
  onPreview,
}) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<DynamicExcelOption[]>([]);
  const [search, { isLoading }] = useSearchDynamicExcelMutation();

  const doSearch = React.useCallback(async () => {
    const res = await search({
      q: q.trim() || undefined,
      page: 0,
      pageSize: 20,
      sortField: "createdAtUtc",
      sortDirection: "desc",
    }).unwrap();

    setRows(res.rows ?? []);
  }, [q, search]);

  React.useEffect(() => {
    if (!open) return;
    void doSearch();
  }, [open, doSearch]);

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="stretch">
        <TextField
          fullWidth
          size="small"
          label="Chọn biểu mẫu đã thiết kế"
          disabled={disabled}
          value={value ? `${valueCode ?? ""} — ${valueName ?? ""}`.trim() : ""}
          placeholder="Chọn biểu mẫu"
          onClick={() => !disabled && setOpen(true)}
          slotProps={{ htmlInput: { readOnly: true } }}
        />

        {value && (
          <Tooltip title="Xem trước biểu mẫu">
            <span>
              <IconButton
                color="primary"
                onClick={() => onPreview?.(value)}
                disabled={disabled}
              >
                <PreviewIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {value && (
          <Tooltip title="Xóa chọn">
            <span>
              <IconButton
                onClick={() => onChange(null)}
                disabled={disabled}
              >
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chọn biểu mẫu động</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Tìm theo mã / tên"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void doSearch();
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => void doSearch()}
              >
                Tìm
              </Button>
            </Stack>

            <Divider />

            {isLoading ? (
              <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List dense sx={{ maxHeight: 420, overflowY: "auto" }}>
                {rows.map((x) => (
                  <ListItemButton
                    key={x.id}
                    selected={x.id === value}
                    onClick={() => {
                      onChange(x);
                      setOpen(false);
                    }}
                  >
                    <ListItemText
                      primary={`${x.code} — ${x.name}`}
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          {(x.labels ?? []).slice(0, 4).map((lb) => (
                            <Chip key={lb} size="small" label={lb} />
                          ))}
                          <Typography variant="caption" color="text.secondary">
                            {x.createdByUsername}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}

                {!isLoading && rows.length === 0 && (
                  <Box sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Không có biểu mẫu phù hợp.
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};