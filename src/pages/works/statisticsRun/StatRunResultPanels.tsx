import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  createStatRunExport,
  downloadStatRunExport,
  getStatRunExport,
  type StatRunCanonicalResult,
  type StatRunExport,
  type StatRunExportCreateRequest,
} from "../../../api/statRunApi";
import { getApiErrorMessage } from "../../../utils/apiError";
import { canonicalDrilldownRows, canonicalRows, serverTotals } from "./statRunUiModel";

function displayValue(value: unknown): string {
  if (value === null) return "∅ null";
  if (value === undefined) return "— missing";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value === "" ? "\"\" empty" : value;
  if (typeof value === "number") return new Intl.NumberFormat("vi-VN").format(value);
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function CanonicalResultPanel({
  result,
  page,
  pageSize,
  onPageChange,
}: {
  result: StatRunCanonicalResult;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const rows = useMemo(() => canonicalRows(result), [result]);
  const drilldownRows = useMemo(() => canonicalDrilldownRows(result), [result]);
  const totals = useMemo(() => serverTotals(result), [result]);
  const columns = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) Object.keys(row).forEach((key) => seen.add(key));
    return [...seen].slice(0, 14);
  }, [rows]);
  const [drilldown, setDrilldown] = useState<Record<string, unknown> | null>(null);
  const totalRows = Number(result.totalRows ?? result.totalRowCount ?? rows.length);
  const returnedRows = Number(result.returnedRows ?? rows.length);
  const hasPrevious = page > 0;
  const hasNext = Number.isFinite(totalRows) && (page + 1) * pageSize < totalRows;

  return (
    <Stack spacing={2} data-testid="stat-run-canonical-result">
      {totals.length ? (
        <Box
          aria-label="Tổng số do máy chủ trả về"
          data-testid="stat-run-server-totals"
          sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1 }}
        >
          {totals.map(([key, value]) => (
            <Card key={key} variant="outlined">
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{key}</Typography>
                <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>{displayValue(value)}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : null}

      <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: "100%" }}>
        <Table size="small" aria-label="Kết quả thống kê canonical từ máy chủ">
          <TableHead>
            <TableRow>
              {columns.map((column) => <TableCell key={column} scope="col">{column}</TableCell>)}
              <TableCell scope="col" align="right">Chi tiết</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={String(row.rowId ?? row.id ?? row.stableIdentity ?? index)} hover>
                {columns.map((column) => (
                  <TableCell key={column} sx={{ maxWidth: 300, overflowWrap: "anywhere" }}>
                    {displayValue(row[column])}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Button
                    size="small"
                    data-testid={`stat-run-drilldown-open-${index}`}
                    startIcon={<VisibilityRoundedIcon />}
                    onClick={() => setDrilldown(drilldownRows[index] ?? row)}
                    aria-label={`Xem chi tiết hàng ${index + 1}`}
                  >
                    Xem
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {drilldownRows.length ? (
        <Typography
          variant="caption"
          color="text.secondary"
          data-testid="stat-run-authorized-drilldown-count"
        >
          Server-authorized typed/redacted drilldown rows: {drilldownRows.length}.
        </Typography>
      ) : null}

      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        alignItems="center"
        data-stat-run-paging
        data-page={page}
        data-page-size={pageSize}
        data-total-rows={totalRows}
        data-returned-rows={returnedRows}
        data-has-previous={String(hasPrevious)}
        data-has-next={String(hasNext)}
      >
        <Typography variant="body2" aria-live="polite">Trang {page + 1}</Typography>
        <Button data-testid="stat-run-page-previous" disabled={!hasPrevious} onClick={() => onPageChange(page - 1)}>Trang trước</Button>
        <Button data-testid="stat-run-page-next" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>Trang sau</Button>
      </Stack>

      <Dialog open={Boolean(drilldown)} onClose={() => setDrilldown(null)} fullWidth maxWidth="md">
        <DialogTitle>Chi tiết typed/redacted do máy chủ trả về</DialogTitle>
        <DialogContent dividers>
          <Stack component="dl" spacing={1} sx={{ m: 0 }}>
            {drilldown ? Object.entries(drilldown).map(([key, value]) => (
              <Box key={key}>
                <Typography component="dt" variant="caption" color="text.secondary">{key}</Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                  {displayValue(value)}
                </Typography>
              </Box>
            )) : null}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setDrilldown(null)} autoFocus>Đóng</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

export function StatRunExportPanel({
  buildRequest,
  missingPins,
  onReadyExportChange,
}: {
  buildRequest: (format: "CSV" | "XLSX") => StatRunExportCreateRequest;
  missingPins: string[];
  onReadyExportChange?: (exportRow: StatRunExport | null) => void;
}) {
  const [confirmFormat, setConfirmFormat] = useState<"CSV" | "XLSX" | null>(null);
  const [exportRow, setExportRow] = useState<StatRunExport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = exportRow ? new Date(exportRow.expiresAtUtc).getTime() <= Date.now() : false;

  const requestExport = async () => {
    if (!confirmFormat) return;
    setBusy(true);
    setError(null);
    try {
      onReadyExportChange?.(null);
      setExportRow(null);
      const created = await createStatRunExport(buildRequest(confirmFormat));
      const current = created.status === "COMPLETED" || created.status === "READY"
        ? created
        : await getStatRunExport(created.exportId, {
          workId: created.workId,
          scopeType: created.scopeType,
          scopeId: created.scopeId,
          capabilityId: created.capabilityId,
        });
      setExportRow(current);
      onReadyExportChange?.(
        current.status === "COMPLETED" || current.status === "READY"
          ? current
          : null,
      );
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setBusy(false);
      setConfirmFormat(null);
    }
  };

  const download = async () => {
    if (!exportRow) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadStatRunExport(exportRow);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportRow.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="stat-run-export-panel">
      <Stack spacing={1.5}>
        <Box>
          <Typography component="h2" variant="h6">Xuất kết quả trên máy chủ</Typography>
          <Typography variant="body2" color="text.secondary">
            CSV/XLSX được tạo từ cùng result pin canonical; trình duyệt không dựng lại tệp.
          </Typography>
        </Box>
        {missingPins.length ? (
          <Alert severity="warning">
            Chưa thể xuất vì deep link thiếu pin: {missingPins.join(", ")}.
          </Alert>
        ) : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {(["CSV", "XLSX"] as const).map((format) => (
            <Button
              key={format}
              data-testid={`stat-run-export-request-${format.toLowerCase()}`}
              variant="outlined"
              disabled={busy || missingPins.length > 0}
              onClick={() => setConfirmFormat(format)}
            >
              Yêu cầu {format}
            </Button>
          ))}
          {exportRow ? (
            <Button
              data-testid="stat-run-export-download"
              variant="contained"
              startIcon={<DownloadRoundedIcon />}
              disabled={busy || expired}
              onClick={download}
            >
              Tải {exportRow.fileName}
            </Button>
          ) : null}
        </Stack>
        <Box role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
          {busy ? <Typography>Đang xử lý yêu cầu export…</Typography> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {exportRow && !expired ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip color="success" label={exportRow.status} />
              <Chip variant="outlined" label={`${exportRow.rowCount} hàng`} />
              <Chip variant="outlined" label={`Hết hạn ${new Date(exportRow.expiresAtUtc).toLocaleString("vi-VN")}`} />
            </Stack>
          ) : null}
          {exportRow && expired ? (
            <Alert severity="warning" action={<Button onClick={() => {
              setExportRow(null);
              onReadyExportChange?.(null);
            }}>Yêu cầu lại</Button>}>
              Artifact đã hết hạn; tải xuống bị khóa và có thể yêu cầu bản mới.
            </Alert>
          ) : null}
        </Box>
      </Stack>

      <Dialog open={Boolean(confirmFormat)} onClose={() => setConfirmFormat(null)}>
        <DialogTitle>Xác nhận yêu cầu export</DialogTitle>
        <DialogContent>
          <Typography>Tạo artifact {confirmFormat} từ result/config/source pin hiện tại?</Typography>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setConfirmFormat(null)}>Hủy</Button>
          <Button data-testid="stat-run-export-confirm" variant="contained" onClick={requestExport} autoFocus>Xác nhận</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
