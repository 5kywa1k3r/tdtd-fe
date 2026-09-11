import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import {
  useCloneDynamicFormMutation,
  useCreateDynamicFormVersionMutation,
  useGetDynamicFormQuery,
  useGetDynamicFormVersionHistoryQuery,
} from "../../api/dynamicFormApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import DynamicFormPreview from "../../features/dynamicForms/components/DynamicFormPreview";
import DomainContextStrip from "../../components/navigation/DomainContextStrip";
import DynamicFormVersionHistoryPanel from "../../features/dynamicForms/components/DynamicFormVersionHistoryPanel";
import DynamicFormVersionStrip from "../../features/dynamicForms/components/DynamicFormVersionStrip";
import DynamicFormLoadStatePanel from "../../features/dynamicForms/components/DynamicFormLoadStatePanel";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";
import { UITextKey, uiText } from '../../constants/uiText';
import { normalizeApiError } from "../../utils/apiError";

type DetailTab = "DETAIL" | "PREVIEW" | "HISTORY";

import { DYNAMIC_FORM_LIST_PATH, dynamicFormPath } from "../../routes/dynamicFormRoutes";
export default function DynamicFormViewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useGetDynamicFormQuery({ id: id ?? "" }, { skip: !id });
  const canViewHistory = Boolean(query.data?.actions.canViewHistory);
  const historyQuery = useGetDynamicFormVersionHistoryQuery(
    { id: id ?? "" },
    { skip: !id || !canViewHistory },
  );
  const [createVersion, createVersionState] = useCreateDynamicFormVersionMutation();
  const [clone, cloneState] = useCloneDynamicFormMutation();
  const [tab, setTab] = useState<DetailTab>("DETAIL");
  const [actionError, setActionError] = useState<string | null>(null);
  const loadError = query.isError ? normalizeApiError(query.error) : null;

  const initialValue = useMemo(() => {
    if (!query.data) return null;
    return buildEditorValue({
      code: query.data.code,
      name: query.data.name,
      description: query.data.description,
      tagCodes: query.data.tagCodes,
      schemaVersion: query.data.schemaVersion,
      isActive: query.data.isActive,
      sectionsJson: query.data.sectionsJson,
      fieldsJson: query.data.fieldsJson,
      excelBlockJson: query.data.excelBlockJson,
      blocksJson: query.data.blocksJson,
    });
  }, [query.data]);

  if (!id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>{uiText(UITextKey.TextMissingId)}</Typography>
      </Box>
    );
  }

  if (query.isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography>{uiText(UITextKey.TextLoadingForm)}</Typography>
      </Box>
    );
  }

  if (query.isError || !query.data || !initialValue) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        <DynamicFormLoadStatePanel
          forbidden={loadError?.status === 403}
          onBack={() => navigate(DYNAMIC_FORM_LIST_PATH)}
          onRetry={() => void query.refetch()}
        />
      </Box>
    );
  }

  if (!query.data.actions.canRead) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Bạn không có quyền đọc phiên bản biểu mẫu này.
      </Alert>
    );
  }

  const latestVersion = historyQuery.data?.versions[0];
  const canCreateFromCurrent =
    query.data.actions.canCreateVersion &&
    latestVersion?.id === query.data.id &&
    latestVersion.isPublished;
  const createVersionDisabledReason = historyQuery.isFetching
    ? "Đang kiểm tra phiên bản mới nhất."
    : historyQuery.isError
      ? "Không xác minh được phiên bản mới nhất. Hãy tải lại lịch sử."
      : !canCreateFromCurrent
        ? "Chỉ phiên bản đã công bố mới nhất và chưa có bản nháp kế tiếp mới được tạo phiên bản mới."
        : "";
  const canOpenEditor =
    query.data.actions.canUpdate ||
    (query.data.isPublished && query.data.actions.canUpdateStatistics);

  const createNextVersion = async () => {
    if (!canCreateFromCurrent) return;
    try {
      setActionError(null);
      const next = await createVersion({
        id: query.data.id,
        body: { expectedRevision: query.data.revision },
      }).unwrap();
      navigate(dynamicFormPath(next.id, "edit"));
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  const cloneAsNewForm = async () => {
    if (!query.data.actions.canClone) return;
    try {
      setActionError(null);
      const cloned = await clone({
        id: query.data.id,
        body: { name: `${query.data.name} - Bản sao` },
      }).unwrap();
      navigate(dynamicFormPath(cloned.id, "edit"));
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  return (
    <Stack spacing={1.25} sx={{ p: { xs: 1, md: 1.5 }, minWidth: 0 }}>
      <DynamicFormVersionStrip form={query.data} />
      <DomainContextStrip
        ariaLabel="Ngữ cảnh biểu mẫu"
        breadcrumbs={[
          { label: "Thiết kế" },
          { label: "Biểu mẫu", to: DYNAMIC_FORM_LIST_PATH },
          { label: query.data.code },
        ]}
        items={[
          { label: "Họ", value: query.data.familyId },
          { label: "Phiên bản", value: `v${query.data.versionNo}` },
          { label: "Trạng thái", value: query.data.isPublished ? "Đã công bố" : "Bản nháp", color: query.data.isPublished ? "success" : "warning" },
          { label: "Quyền", value: canOpenEditor ? "Có thể chỉnh sửa" : "Chỉ đọc" },
        ]}
      />

      {actionError && <Alert severity="error">{actionError}</Alert>}

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={1}
      >
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value as DetailTab)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab value="DETAIL" label="Chi tiết" />
          <Tab value="PREVIEW" label="Xem trước" />
          {query.data.actions.canViewHistory && (
            <Tab value="HISTORY" label="Lịch sử phiên bản" />
          )}
        </Tabs>

        <Stack
          direction="row"
          justifyContent="flex-end"
          gap={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(DYNAMIC_FORM_LIST_PATH)}
          >
            Quay lại
          </Button>

          {canOpenEditor && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(dynamicFormPath(query.data.id, "edit"))}
            >
              {query.data.isPublished ? "Cập nhật thống kê" : "Sửa bản nháp"}
            </Button>
          )}

          {query.data.actions.canClone && (
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              disabled={cloneState.isLoading}
              onClick={() => void cloneAsNewForm()}
            >
              Sao chép thành biểu mẫu mới
            </Button>
          )}

          {query.data.actions.canCreateVersion && (
            <Tooltip title={createVersionDisabledReason}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  disabled={!canCreateFromCurrent || createVersionState.isLoading}
                  onClick={() => void createNextVersion()}
                >
                  Tạo phiên bản mới
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {tab === "DETAIL" ? (
        <DynamicFormEditor
          key={query.data.id}
          mode="view"
          initialValue={initialValue}
          workspaceHeightOffset={176}
          onBack={() => navigate(DYNAMIC_FORM_LIST_PATH)}
        />
      ) : tab === "PREVIEW" ? (
        <Box sx={{ p: 2 }}>
          <DynamicFormPreview detail={query.data} />
        </Box>
      ) : (
        <DynamicFormVersionHistoryPanel
          history={historyQuery.data}
          currentVersionId={query.data.id}
          loading={historyQuery.isFetching}
          error={historyQuery.isError}
          onRetry={() => void historyQuery.refetch()}
          onOpenVersion={(version) => navigate(dynamicFormPath(version.id))}
        />
      )}
    </Stack>
  );
}
