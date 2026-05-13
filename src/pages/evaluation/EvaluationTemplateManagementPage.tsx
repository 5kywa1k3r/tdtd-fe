import * as React from "react";
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";

import { getMeSnapshot } from "../../stores/authStorage";
import {
  useCreateEvaluationTemplateMutation,
  useDeactivateEvaluationTemplateMutation,
  useGetEvaluationTemplatesQuery,
} from "../../api/evaluationTemplateApi";
import type {
  CreateEvaluationTemplateRequest,
  EvaluationTemplateDto,
  UpdateEvaluationTemplateRequest,
} from "../../types/evaluationTemplate";
import { canCrudEvaluationTemplate } from "../../components/evaluation/evaluationTemplateWhitelist";
import EvaluationTemplateDialog from "../../components/evaluation/EvaluationTemplateDialog";
import EvaluationTemplateTable from "../../components/evaluation/EvaluationTemplateTable";
import EvaluationTemplateFilterBar, {
  type EvaluationTemplateFilterValue,
} from "../../components/evaluation/EvaluationTemplateFilterBar";
import { normalizeVi } from "../../helpers/normalize";
import { releaseFocusBeforeModal } from "../../utils/focus";
import { UITextKey, uiText } from '../../constants/uiText';

const defaultFilterValue = (): EvaluationTemplateFilterValue => ({
  q: "",
  isActive: "1",
});

export default function EvaluationTemplateManagementPage() {
  const me = getMeSnapshot();
  const canManage = canCrudEvaluationTemplate({
    unitCode: me?.unitCode,
    unitSymbol: me?.unitSymbol,
    username: me?.username,
    positionCode: me?.positionCode,
    roles: me?.roles,
  });

  const [filterValue, setFilterValue] = React.useState<EvaluationTemplateFilterValue>(
    defaultFilterValue()
  );
  const [dialogMode, setDialogMode] = React.useState<"create" | "view" | null>(null);
  const [selected, setSelected] = React.useState<EvaluationTemplateDto | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data = [], isFetching, refetch } = useGetEvaluationTemplatesQuery({
    isActive: filterValue.isActive === "all" ? null : filterValue.isActive === "1",
  });

  const filteredRows = React.useMemo(() => {
    const keyword = normalizeVi(filterValue.q || "");
    if (!keyword) return data;

    return data.filter((row) =>
      normalizeVi(
        [
          row.representativeCode,
          row.representativeLabel,
          row.unitCodeScope,
          ...(row.items ?? []).flatMap((item) => [item.code, item.label]),
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(keyword)
    );
  }, [data, filterValue.q]);

  const [createTemplate] = useCreateEvaluationTemplateMutation();
  const [deactivateTemplate] = useDeactivateEvaluationTemplateMutation();

  const handleCreate = async (data: CreateEvaluationTemplateRequest | UpdateEvaluationTemplateRequest) => {
    await createTemplate(data as CreateEvaluationTemplateRequest).unwrap();
    setMessage("Đã tạo bộ mã đánh giá.");
    await refetch();
  };

  const handleDeactivate = async (row: EvaluationTemplateDto) => {
    try {
      await deactivateTemplate(row.id).unwrap();
      setMessage(`Đã ngừng dùng bộ ${row.representativeCode}.`);
      await refetch();
    } catch (e: any) {
      setError(e?.data?.Message || e?.message || "Không thể ngừng dùng bộ mã đánh giá.");
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Quản lý bộ đánh giá
        </Typography>
        <Typography color="text.secondary">{uiText(UITextKey.TextQuanLyBoMaDanhGiaDungChung)}</Typography>
      </Box>

      {!canManage && (
        <Alert severity="warning">
          Tài khoản hiện tại chỉ được xem danh sách. Quyền thêm và ngừng dùng áp dụng cho tài khoản
          quản trị, manager, hoặc Trưởng/Phó phòng PV01.
        </Alert>
      )}

      {message && (
        <Alert severity="success" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <EvaluationTemplateFilterBar
        value={filterValue}
        onChange={setFilterValue}
        onReset={() => setFilterValue(defaultFilterValue())}
        onReload={() => void refetch()}
        onCreate={() => {
          releaseFocusBeforeModal();
          setSelected(null);
          setDialogMode("create");
        }}
        canManage={canManage}
        loading={isFetching}
      />

      <Stack direction="row" spacing={1}>
        <Chip label={`Hiển thị: ${filteredRows.length}`} />
        <Chip
          label={`Đang dùng: ${filteredRows.filter((x) => x.isActive).length}`}
          color="success"
          variant="outlined"
        />
      </Stack>

      {isFetching ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">{uiText(UITextKey.TextDangTaiDanhSachBoDanhGia)}</Typography>
        </Stack>
      ) : filteredRows.length === 0 ? (
        <Alert severity="info">{uiText(UITextKey.TextKhongCoBoDanhGiaPhuHopVoiBo)}</Alert>
      ) : (
        <EvaluationTemplateTable
          rows={filteredRows}
          canManage={canManage}
          onView={(row) => {
            releaseFocusBeforeModal();
            setSelected(row);
            setDialogMode("view");
          }}
          onDeactivate={handleDeactivate}
        />
      )}

      {dialogMode === "create" && (
        <EvaluationTemplateDialog open onClose={() => setDialogMode(null)} onSubmit={handleCreate} />
      )}

      {dialogMode === "view" && selected && (
        <EvaluationTemplateDialog
          open
          readOnly
          template={selected}
          onClose={() => setDialogMode(null)}
          onSubmit={async () => undefined}
        />
      )}
    </Stack>
  );
}
