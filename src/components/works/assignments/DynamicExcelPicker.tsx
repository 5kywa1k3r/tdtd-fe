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
import AddIcon from "@mui/icons-material/Add";
import PreviewIcon from "@mui/icons-material/Preview";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import {
  type DynamicExcelHeaderKind,
  type DynamicExcelTableMode,
  useSearchDynamicExcelMutation,
} from "../../../api/dynamicExcelApi";
import { UITextKey, uiText } from '../../../constants/uiText';

type DynamicExcelOption = {
  id: string;
  code: string;
  name: string;
  headerKind?: DynamicExcelHeaderKind | null;
  tableMode?: DynamicExcelTableMode | null;
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
  triggerMode?: "field" | "button";
  triggerLabel?: string;
};

function formatHeaderKind(value?: DynamicExcelHeaderKind | null) {
  if (value === "TOP") return "Bảng ngang";
  if (value === "LEFT") return "Bảng dọc";
  if (value === "MATRIX") return "Bảng ma trận";
  return "Chưa xác định";
}

function formatTableMode(value?: DynamicExcelTableMode | null) {
  if (value === "APPEND_ROWS") return "Thêm dòng";
  if (value === "APPEND_COLUMNS") return "Thêm cột";
  return "Lưới cố định";
}

export const DynamicExcelPicker: React.FC<DynamicExcelPickerProps> = React.memo(function DynamicExcelPicker({
  value,
  valueCode,
  valueName,
  onChange,
  disabled,
  onPreview,
  triggerMode = "field",
  triggerLabel,
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<DynamicExcelOption[]>([]);
  const [search, { isLoading }] = useSearchDynamicExcelMutation();

  const displayValue = React.useMemo(
    () => (value ? `${valueCode ?? ""} — ${valueName ?? ""}`.trim() : ""),
    [value, valueCode, valueName]
  );

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

  const handleOpen = React.useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleClear = React.useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="stretch">
        {triggerMode === "button" ? (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            disabled={disabled}
          >
            {triggerLabel ?? uiText(UITextKey.TextChonBieuMauDong)}
          </Button>
        ) : (
          <TextField
            fullWidth
            size="small"
            label={uiText(UITextKey.TextChonBieuMauDaThietKe)}
            disabled={disabled}
            value={displayValue}
            placeholder={uiText(UITextKey.TextChonBieuMau)}
            onClick={handleOpen}
            slotProps={{ htmlInput: { readOnly: true } }}
          />
        )}

        {value && (
          <Tooltip title={uiText(UITextKey.TextXemTruocBieuMau)}>
            <span>
              <IconButton color="primary" onClick={() => onPreview?.(value)} disabled={disabled}>
                <PreviewIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {value && (
          <Tooltip title={uiText(UITextKey.TextXoaChon)}>
            <span>
              <IconButton onClick={handleClear} disabled={disabled}>
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{uiText(UITextKey.TextChonBieuMauDong)}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                label={uiText(UITextKey.TextTimTheoMaTen)}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void doSearch();
                  }
                }}
              />
              <Button variant="contained" startIcon={<SearchIcon />} onClick={() => void doSearch()}>
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
                      secondaryTypographyProps={{ component: "div" }}
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          <Chip size="small" variant="outlined" label={formatHeaderKind(x.headerKind)} />
                          <Chip size="small" variant="outlined" label={formatTableMode(x.tableMode)} />
                          <Typography variant="caption" color="text.secondary" component="span">
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
});
