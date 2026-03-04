import {
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import type { HeaderKind, HeaderSpec } from "./fortune/types";

const clamp200 = (v: any) => Math.max(1, Math.min(200, Math.floor(Number(v || 1))));

function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ignore
  }
}

export type HeaderMeta = { code: string; name?: string };

export function HeaderInput(props: {
  value: HeaderSpec;
  onChange: (v: HeaderSpec) => void;

  meta?: HeaderMeta;
  onMetaChange?: (m: HeaderMeta) => void;

  /** code khóa cứng */
  codeReadOnly?: boolean;

  /** NEW */
  metaDisabled?: boolean; // khóa code/name row
  specDisabled?: boolean; // khóa kind + rows/cols
}) {
  const {
    value,
    onChange,
    meta: metaProp,
    onMetaChange,
    codeReadOnly = true,
    metaDisabled = false,
    specDisabled = false,
  } = props;

  // ✅ fallback an toàn: meta luôn có shape
  const meta: HeaderMeta = metaProp ?? { code: "", name: "" };

  const setMeta = (patch: Partial<HeaderMeta>) => {
    // ✅ nếu parent không truyền onMetaChange => meta sẽ "đơ"
    // (đây là đúng controlled behavior)
    onMetaChange?.({ ...meta, ...patch });
  };

  const setKind = (kind: HeaderKind) => {
    if (kind === "TOP") onChange({ kind: "TOP", topRows: 3, topCols: 6, dataRows: 10 });
    if (kind === "LEFT") onChange({ kind: "LEFT", leftRows: 10, leftCols: 2, dataCols: 6 });
    if (kind === "MATRIX") onChange({ kind: "MATRIX", topRows: 3, topCols: 4, leftRows: 5, leftCols: 2 });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          {/* Meta row */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="stretch"
            sx={{ width: "100%" }}
          >
            {/* Mã bảng (readOnly + copy) */}
            <TextField
              label="Mã bảng"
              size="small"
              value={meta.code ?? ""}
              sx={{ flex: 1, minWidth: 180 }}
              disabled={metaDisabled}
              InputProps={{
                readOnly: codeReadOnly,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Copy mã">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => copyText(meta.code ?? "")}
                          disabled={metaDisabled || !(meta.code ?? "").trim()}
                          edge="end"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              helperText={codeReadOnly ? "Mã do hệ thống cấp (không sửa)." : undefined}
            />

            {/* Tên bảng (create/edit cho sửa; view thì metaDisabled=true sẽ khóa) */}
            <TextField
              label="Tên bảng"
              size="small"
              value={meta.name ?? ""}
              onChange={(e) => setMeta({ name: e.target.value })}
              sx={{ flex: 1, minWidth: 220 }}
              disabled={metaDisabled}
            />
          </Stack>

          {/* Spec row */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="stretch"
            sx={{ width: "100%" }}
          >
            <FormControl size="small" sx={{ flex: 1.1, minWidth: 200 }}>
              <InputLabel>Loại</InputLabel>
              <Select
                label="Loại"
                value={value.kind}
                onChange={(e) => setKind(e.target.value as HeaderKind)}
                disabled={specDisabled} // ✅ ĐÚNG: specDisabled
              >
                <MenuItem value="TOP">Bảng ngang</MenuItem>
                <MenuItem value="LEFT">Bảng dọc</MenuItem>
                <MenuItem value="MATRIX">Bảng ma trận</MenuItem>
              </Select>
            </FormControl>

            {value.kind === "TOP" && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 220 }}
                  label="Header: số hàng (1..200)"
                  type="number"
                  value={value.topRows}
                  onChange={(e) => onChange({ ...value, topRows: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 220 }}
                  label="Header: số cột (1..200)"
                  type="number"
                  value={value.topCols}
                  onChange={(e) => onChange({ ...value, topCols: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 260 }}
                  label="Data: tổng số dòng (1..200)"
                  type="number"
                  value={value.dataRows}
                  onChange={(e) => onChange({ ...value, dataRows: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
              </>
            )}

            {value.kind === "LEFT" && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 220 }}
                  label="Header: số dòng (1..200)"
                  type="number"
                  value={value.leftRows}
                  onChange={(e) => onChange({ ...value, leftRows: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 220 }}
                  label="Header: số cột (1..200)"
                  type="number"
                  value={value.leftCols}
                  onChange={(e) => onChange({ ...value, leftCols: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 260 }}
                  label="Data: tổng số cột (1..200)"
                  type="number"
                  value={value.dataCols}
                  onChange={(e) => onChange({ ...value, dataCols: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
              </>
            )}

            {value.kind === "MATRIX" && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  label="Top: rows (1..200)"
                  type="number"
                  value={value.topRows}
                  onChange={(e) => onChange({ ...value, topRows: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  label="Top: cols (1..200)"
                  type="number"
                  value={value.topCols}
                  onChange={(e) => onChange({ ...value, topCols: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  label="Left: rows (1..200)"
                  type="number"
                  value={value.leftRows}
                  onChange={(e) => onChange({ ...value, leftRows: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  label="Left: cols (1..200)"
                  type="number"
                  value={value.leftCols}
                  onChange={(e) => onChange({ ...value, leftCols: clamp200(e.target.value) })}
                  disabled={specDisabled} // ✅ ĐÚNG
                />
              </>
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Lưu sẽ validate template theo rule. MATRIX: vùng data bắt đầu tại (row = topRows + 1, col = leftCols + 1) theo chỉ số Excel.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}