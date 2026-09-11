import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { DYNAMIC_FORM_LIST_PATH } from "../../routes/dynamicFormRoutes";

import {
  buildDynamicFormSchemaPayload,
  useGetDynamicFormQuery,
  useImportDynamicExcelBlockMutation,
  usePublishDynamicFormMutation,
  useUpdateDynamicFormMutation,
} from "../../api/dynamicFormApi";
import {
  useGetP8DynamicFormStatisticsQuery,
  usePutP8DynamicFormStatisticsMutation,
} from "../../api/statConfigApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import DynamicFormLoadStatePanel from "../../features/dynamicForms/components/DynamicFormLoadStatePanel";
import DynamicFormVersionStrip from "../../features/dynamicForms/components/DynamicFormVersionStrip";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";
import { UITextKey, uiText } from '../../constants/uiText';
import { normalizeApiError } from "../../utils/apiError";

import {
  buildP8DynamicFormStatisticMutationEnvelope,
  buildP8DynamicFormStatisticMutationPlan,
} from "./p8DynamicFormStatisticAdapter";

function createP8StatisticCommandId(kind: string) {
  const suffix = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `p8-ui-form-${suffix}-${kind.toLowerCase()}`;
}export default function DynamicFormEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useGetDynamicFormQuery({ id: id ?? "" }, { skip: !id });
  const statisticQuery = useGetP8DynamicFormStatisticsQuery(
    { id: id ?? "" },
    { skip: !id || !query.data?.isPublished },
  );
  const [update, updateState] = useUpdateDynamicFormMutation();
  const [updateStatisticConfig, updateStatisticConfigState] =
    usePutP8DynamicFormStatisticsMutation();
  const [publish, publishState] = usePublishDynamicFormMutation();
  const [importDynamicExcelBlock, importDynamicExcelBlockState] =
    useImportDynamicExcelBlockMutation();
  const revisionRef = useRef(0);
  const loadError = query.isError ? normalizeApiError(query.error) : null;

  useEffect(() => {
    if (query.data?.revision) revisionRef.current = query.data.revision;
  }, [query.data?.revision]);

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

  const canSave = query.data.isPublished
    ? query.data.actions.canUpdateStatistics &&
      Boolean(statisticQuery.data?.permissions.canManageDraft)
    : query.data.actions.canUpdate;
  const expectedRevision = () => revisionRef.current || query.data.revision;

  return (
    <Box>
      <Box sx={{ px: { xs: 1, md: 1.5 }, pt: { xs: 1, md: 1.5 } }}>
        <DynamicFormVersionStrip form={query.data} compact />
      </Box>
      {!canSave && (
        <Alert severity="info" sx={{ m: 1, mb: 0 }}>
          Bạn chỉ có quyền xem biểu mẫu này. Các thao tác lưu, công bố và nhập bảng đã được khóa.
        </Alert>
      )}
      {query.data.isPublished && statisticQuery.isError && (
        <Alert severity="error" sx={{ m: 1, mb: 0 }}>
          Không thể tải readback cấu hình thống kê P8. Hãy tải lại trước khi sửa cấu hình.
        </Alert>
      )}
      <DynamicFormEditor
        key={`${query.data.id}:${query.data.revision}`}
        mode={canSave ? "edit" : "view"}
        initialValue={initialValue}
        locked={query.data.isPublished}
        allowStatisticConfigEdit={query.data.isPublished && canSave}

        workspaceHeightOffset={82}
        busy={
          updateState.isLoading ||
          updateStatisticConfigState.isLoading ||
          statisticQuery.isFetching ||
          publishState.isLoading ||
          importDynamicExcelBlockState.isLoading
        }
        onBack={() => navigate(DYNAMIC_FORM_LIST_PATH)}
        onReload={() => query.data.isPublished
          ? Promise.all([query.refetch(), statisticQuery.refetch()])
          : query.refetch()}
        onSave={
          canSave
            ? async (payload) => {
                if (query.data.isPublished) {
                  const plan = buildP8DynamicFormStatisticMutationPlan(payload);
                  let identity = statisticQuery.data;
                  if (!identity) {
                    throw new Error("Không có readback cấu hình thống kê P8 để tạo lệnh CAS.");
                  }
                  if (plan.tableSource === "LEGACY_READ_ONLY") {
                    throw new Error(
                      "Cấu hình thống kê bảng legacy chỉ đọc; hãy chuyển biểu mẫu sang blocksJson canonical trước khi lưu.",
                    );
                  }
                  if (plan.steps.length === 0) {
                    throw new Error("Biểu mẫu không có trường hoặc bảng thống kê để cập nhật.");
                  }

                  for (let index = 0; index < plan.steps.length; index += 1) {
                    const step = plan.steps[index];
                    if (!step) continue;
                    try {
                      identity = await updateStatisticConfig({
                        id,
                        body: buildP8DynamicFormStatisticMutationEnvelope(
                          step,
                          identity,
                          createP8StatisticCommandId(step.kind),
                        ),
                      }).unwrap();
                    } catch (error) {
                      if (index > 0) {
                        void statisticQuery.refetch();
                        void query.refetch();
                        const partialError = new Error(
                          "Cấu hình trường đã lưu nhưng cấu hình bảng chưa lưu. Readback đang được tải lại; hãy kiểm tra rồi thử lại phần bảng.",
                        );
                        (partialError as Error & { cause?: unknown }).cause = error;
                        throw partialError;
                      }
                      throw error;
                    }
                  }
                  await Promise.all([statisticQuery.refetch(), query.refetch()]);
                  return;
                }

                const result = await update({
                  id,
                  body: {
                    name: payload.name,
                    description: payload.description,
                    tagCodes: payload.tagCodes,
                    schemaVersion: payload.schemaVersion,
                    schema: buildDynamicFormSchemaPayload(payload),
                    isActive: payload.isActive,
                    expectedRevision: expectedRevision(),
                  },
                }).unwrap();
                revisionRef.current = result.revision;
              }
            : undefined
        }
        onPublish={
          !query.data.actions.canPublish
            ? undefined
            : async () => {
                const result = await publish({
                  id,
                  expectedRevision: expectedRevision(),
                }).unwrap();
                revisionRef.current = result.revision;
                navigate(DYNAMIC_FORM_LIST_PATH);
              }
        }
        onImportDynamicExcelBlock={
          !query.data.actions.canImport
            ? undefined
            : async (dynamicExcelTemplateId, sectionId) => {
                const next = await importDynamicExcelBlock({
                  id,
                  body: {
                    dynamicExcelTemplateId,
                    sectionId,
                    expectedRevision: expectedRevision(),
                  },
                }).unwrap();
                revisionRef.current = next.revision;

                return buildEditorValue({
                  code: next.code,
                  name: next.name,
                  description: next.description,
                  tagCodes: next.tagCodes,
                  schemaVersion: next.schemaVersion,
                  isActive: next.isActive,
                  sectionsJson: next.sectionsJson,
                  fieldsJson: next.fieldsJson,
                  excelBlockJson: next.excelBlockJson,
                  blocksJson: next.blocksJson,
                });
              }
        }
      />
    </Box>
  );
}
