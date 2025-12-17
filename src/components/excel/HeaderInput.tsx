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
} from "@mui/material";

import type { HeaderKind, HeaderSpec } from "../../features/excelDesigner/types";

const clamp200 = (v: any) => Math.max(1, Math.min(200, Math.floor(Number(v || 1))));

export function HeaderInput(props: {
  value: HeaderSpec;
  onChange: (v: HeaderSpec) => void;
}) {
  const { value, onChange } = props;

  const setKind = (kind: HeaderKind) => {
    if (kind === "TOP") onChange({ kind: "TOP", topRows: 3, topCols: 6, dataRows: 10 });
    if (kind === "LEFT") onChange({ kind: "LEFT", leftRows: 10, leftCols: 2, dataCols: 6 });
    if (kind === "MATRIX") onChange({ kind: "MATRIX", topRows: 3, topCols: 4, leftRows: 5, leftCols: 2 });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="stretch"
            sx={{ width: "100%" }}
          >
            <FormControl size="small" sx={{ flex: 2, minWidth: 260 }}>
              <InputLabel>Loại</InputLabel>
              <Select
                label="Loại"
                value={value.kind}
                onChange={(e) => setKind(e.target.value as HeaderKind)}
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
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 220 }}
                  label="Header: số cột (1..200)"
                  type="number"
                  value={value.topCols}
                  onChange={(e) => onChange({ ...value, topCols: clamp200(e.target.value) })}
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 260 }}
                  label="Data: tổng số dòng (1..200)"
                  type="number"
                  value={value.dataRows}
                  onChange={(e) => onChange({ ...value, dataRows: clamp200(e.target.value) })}
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
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 220 }}
                  label="Header: số cột (1..200)"
                  type="number"
                  value={value.leftCols}
                  onChange={(e) => onChange({ ...value, leftCols: clamp200(e.target.value) })}
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 260 }}
                  label="Data: tổng số cột (1..200)"
                  type="number"
                  value={value.dataCols}
                  onChange={(e) => onChange({ ...value, dataCols: clamp200(e.target.value) })}
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
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  label="Top: cols (1..200)"
                  type="number"
                  value={value.topCols}
                  onChange={(e) => onChange({ ...value, topCols: clamp200(e.target.value) })}
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  label="Left: rows (1..200)"
                  type="number"
                  value={value.leftRows}
                  onChange={(e) => onChange({ ...value, leftRows: clamp200(e.target.value) })}
                />
                <TextField
                  fullWidth
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  label="Left: cols (1..200)"
                  type="number"
                  value={value.leftCols}
                  onChange={(e) => onChange({ ...value, leftCols: clamp200(e.target.value) })}
                />
              </>
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Lưu sẽ validate: ô header không được trống, ô data cũng không được trống.
            MATRIX: data bắt đầu tại (row = topRows + 1, col = leftCols + 1) theo chỉ số Excel.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
