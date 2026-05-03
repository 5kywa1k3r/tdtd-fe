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
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import {
  type DynamicFormRow,
  useSearchDynamicFormsMutation,
} from "../../../api/dynamicFormApi";

type DynamicFormPickerProps = {
  value?: string | null;
  valueCode?: string | null;
  valueName?: string | null;
  onChange: (item: DynamicFormRow | null) => void;
  disabled?: boolean;
};

export const DynamicFormPicker: React.FC<DynamicFormPickerProps> = React.memo(function DynamicFormPicker({
  value,
  valueCode,
  valueName,
  onChange,
  disabled,
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<DynamicFormRow[]>([]);
  const [search, { isLoading }] = useSearchDynamicFormsMutation();

  const displayValue = React.useMemo(
    () => (value ? `${valueCode ?? ""} - ${valueName ?? ""}`.trim() : ""),
    [value, valueCode, valueName]
  );

  const doSearch = React.useCallback(async () => {
    const res = await search({
      q: q.trim() || undefined,
      isActive: true,
      isPublished: true,
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

  const handleClear = React.useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="stretch">
        <TextField
          fullWidth
          size="small"
          label="Chon Dynamic Form"
          disabled={disabled}
          value={displayValue}
          placeholder="Chon form da publish"
          onClick={handleOpen}
          slotProps={{ htmlInput: { readOnly: true } }}
        />

        {value && (
          <Tooltip title="Xoa chon">
            <span>
              <IconButton onClick={handleClear} disabled={disabled}>
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chon Dynamic Form</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Tim theo ma / ten"
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
                Tim
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
                      primary={`${x.code} - ${x.name}`}
                      secondaryTypographyProps={{ component: "div" }}
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          {(x.labels ?? []).slice(0, 4).map((lb) => (
                            <Chip key={lb} size="small" label={lb} />
                          ))}
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
                      Khong co Dynamic Form phu hop.
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
