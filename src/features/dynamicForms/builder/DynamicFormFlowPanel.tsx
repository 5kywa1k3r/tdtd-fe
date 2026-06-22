import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockIcon from "@mui/icons-material/Lock";
import SaveIcon from "@mui/icons-material/Save";

import {
  useCreateDynamicFlowTemplateMutation,
  useLazyGetDynamicFlowTemplateQuery,
  useLockDynamicFlowTemplateVersionMutation,
  useSaveDynamicFlowTemplateVersionDraftMutation,
  useSearchDynamicFlowTemplatesMutation,
  type DynamicFlowTemplateDto,
} from "../../../api/dynamicFlowTemplateApi";
import type { DynamicFormField } from "../dynamicForm.types";
import { getDynamicFormBlockJsonList, getDynamicFormFieldDisplayName } from "../dynamicFormSchema";

type FlowTab = "steps" | "actors" | "permissions" | "mapping" | "rollback" | "final" | "stats";
type PermissionTargetTab = "fields" | "tables";

type FlowStep = {
  stepId: string;
  stepCode: string;
  name?: string | null;
  order?: number | null;
};

type ActorPolicy = {
  policyId?: string | null;
  stepId?: string | null;
  stepCode?: string | null;
  actorRole?: string | null;
  allowSubFlow?: boolean;
  allowForward?: boolean;
  canFinalize?: boolean;
};

type FieldPolicy = {
  policyId?: string | null;
  stepId?: string | null;
  stepCode?: string | null;
  actorRole?: string | null;
  fieldId?: string | null;
  fieldKey?: string | null;
  read?: boolean;
  write?: boolean;
  required?: boolean;
  hidden?: boolean;
  lockedAfterSubmit?: boolean;
};

type TableColumnPolicy = {
  policyId?: string | null;
  stepId?: string | null;
  stepCode?: string | null;
  actorRole?: string | null;
  blockId?: string | null;
  columnKey?: string | null;
  read?: boolean;
  write?: boolean;
  required?: boolean;
  hidden?: boolean;
  lockedAfterSubmit?: boolean;
};

type MappingRule = {
  mappingId: string;
  mappingVersion: number;
  sourceStepId?: string | null;
  sourceStepCode?: string | null;
  sourceFieldId?: string | null;
  sourceFieldKey?: string | null;
  sourceBlockId?: string | null;
  sourceColumnKey?: string | null;
  targetStepId?: string | null;
  targetStepCode?: string | null;
  targetFieldId?: string | null;
  targetFieldKey?: string | null;
  targetBlockId?: string | null;
  targetColumnKey?: string | null;
  conceptCode?: string | null;
  dataType?: string | null;
  joinKey?: string | null;
  valueTransform?: string | null;
  conflictPolicy?: string | null;
  contributionPolicy?: string | null;
};

type FlowPayload = {
  steps: FlowStep[];
  transitions: Array<Record<string, unknown>>;
  actorPolicies: ActorPolicy[];
  fieldPolicies: FieldPolicy[];
  tableColumnPolicies: TableColumnPolicy[];
  mappingRules: MappingRule[];
  rollbackPolicy: Record<string, unknown>;
  finalResultPolicy: Record<string, unknown>;
  statisticProfile: Record<string, unknown>;
};

type FieldTarget = {
  fieldId: string;
  fieldKey: string;
  label: string;
};

type TableTarget = {
  blockId: string;
  columnKey: string;
  label: string;
};

type Props = {
  dynamicFormTemplateId?: string | null;
  fields: DynamicFormField[];
  blocksJson?: string | null;
  excelBlockJson?: string | null;
  readOnly?: boolean;
};

const actorRoles = ["ISSUER", "ASSIGNEE", "COORDINATOR", "REVIEWER", "FINALIZER"];
const flowTabs: Array<{ value: FlowTab; label: string }> = [
  { value: "steps", label: "Buoc" },
  { value: "actors", label: "Vai tro" },
  { value: "permissions", label: "Quyen" },
  { value: "mapping", label: "Mapping" },
  { value: "rollback", label: "Rollback" },
  { value: "final", label: "Ket qua" },
  { value: "stats", label: "Thong ke" },
];
const maxMatrixRows = 80;

export default function DynamicFormFlowPanel({
  dynamicFormTemplateId,
  fields,
  blocksJson,
  excelBlockJson,
  readOnly = false,
}: Props) {
  const [tab, setTab] = useState<FlowTab>("steps");
  const [permissionTab, setPermissionTab] = useState<PermissionTargetTab>("fields");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DynamicFlowTemplateDto[]>([]);
  const [templateDetail, setTemplateDetail] = useState<DynamicFlowTemplateDto | null>(null);
  const [payload, setPayload] = useState<FlowPayload>(() => createDefaultPayload());
  const [selectedStepId, setSelectedStepId] = useState<string>("step_1");
  const [selectedActorRole, setSelectedActorRole] = useState<string>("ISSUER");
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);

  const [searchTemplates, searchState] = useSearchDynamicFlowTemplatesMutation();
  const [loadTemplate, loadTemplateState] = useLazyGetDynamicFlowTemplateQuery();
  const [createTemplate, createState] = useCreateDynamicFlowTemplateMutation();
  const [saveDraft, saveState] = useSaveDynamicFlowTemplateVersionDraftMutation();
  const [lockVersion, lockState] = useLockDynamicFlowTemplateVersionMutation();

  const fieldTargets = useMemo<FieldTarget[]>(
    () =>
      fields.map((field) => ({
        fieldId: field.id,
        fieldKey: field.key?.trim() || field.id,
        label: getDynamicFormFieldDisplayName(field),
      })),
    [fields],
  );
  const tableTargets = useMemo<TableTarget[]>(
    () => readTableTargets(blocksJson, excelBlockJson),
    [blocksJson, excelBlockJson],
  );
  const activeTemplate = templateDetail?.id === selectedTemplateId
    ? templateDetail
    : templates.find((item) => item.id === selectedTemplateId) ?? null;
  const activeVersion = activeTemplate?.draftVersion ?? activeTemplate?.currentVersion ?? null;
  const busy =
    searchState.isLoading ||
    loadTemplateState.isFetching ||
    createState.isLoading ||
    saveState.isLoading ||
    lockState.isLoading;
  const activeStep = payload.steps.find((step) => step.stepId === selectedStepId) ?? payload.steps[0];
  const visibleFieldTargets = fieldTargets.slice(0, maxMatrixRows);
  const visibleTableTargets = tableTargets.slice(0, maxMatrixRows);
  const rowIdentityWarning = hasRowCompare(statisticProfile(payload)) && tableTargets.length === 0;

  useEffect(() => {
    if (!dynamicFormTemplateId) {
      setTemplates([]);
      setTemplateDetail(null);
      setSelectedTemplateId(null);
      setPayload(createDefaultPayload());
      return;
    }

    void reloadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicFormTemplateId]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateDetail(null);
      return;
    }

    let cancelled = false;
    loadTemplate({ id: selectedTemplateId })
      .unwrap()
      .then((detail) => {
        if (!cancelled) setTemplateDetail(detail);
      })
      .catch((err) => {
        if (!cancelled) setMessage({ severity: "error", text: readErrorMessage(err, "Khong tai duoc flow.") });
      });

    return () => {
      cancelled = true;
    };
  }, [loadTemplate, selectedTemplateId]);

  useEffect(() => {
    const version = templateDetail?.draftVersion ?? templateDetail?.currentVersion ?? null;
    setPayload(parseFlowPayload(version?.payloadJson));
  }, [templateDetail?.currentVersion?.id, templateDetail?.draftVersion?.id, templateDetail?.id]);

  useEffect(() => {
    if (!payload.steps.some((step) => step.stepId === selectedStepId)) {
      setSelectedStepId(payload.steps[0]?.stepId ?? "step_1");
    }
  }, [payload.steps, selectedStepId]);

  async function reloadTemplates(preferredTemplateId?: string) {
    if (!dynamicFormTemplateId) return;
    const result = await searchTemplates({
      dynamicFormTemplateId,
      page: 0,
      pageSize: 20,
    }).unwrap();
    const rows = result.rows ?? [];
    setTemplates(rows);
    const nextId = preferredTemplateId ?? selectedTemplateId ?? rows[0]?.id ?? null;
    setSelectedTemplateId(nextId);
    if (!nextId) {
      setTemplateDetail(null);
    }
  }

  async function refreshTemplate(id: string) {
    const detail = await loadTemplate({ id }).unwrap();
    setTemplateDetail(detail);
    setSelectedTemplateId(detail.id);
  }

  async function createFlowTemplate() {
    if (!dynamicFormTemplateId || readOnly) return;
    setMessage(null);
    try {
      const nextPayload = createDefaultPayload(fieldTargets);
      const created = await createTemplate({
        code: buildTemplateCode(dynamicFormTemplateId),
        name: "Dynamic flow",
        dynamicFormTemplateId,
        payloadJson: JSON.stringify(normalizePayload(nextPayload)),
      }).unwrap();
      setTemplateDetail(created);
      setSelectedTemplateId(created.id);
      setPayload(parseFlowPayload(created.draftVersion?.payloadJson));
      await reloadTemplates(created.id);
      setMessage({ severity: "success", text: "Da tao flow." });
    } catch (err) {
      setMessage({ severity: "error", text: readErrorMessage(err, "Khong tao duoc flow.") });
    }
  }

  async function saveFlowDraft() {
    if (!activeTemplate || readOnly) return;
    setMessage(null);
    try {
      const normalized = normalizePayload(payload);
      await saveDraft({
        id: activeTemplate.id,
        body: { payloadJson: JSON.stringify(normalized) },
      }).unwrap();
      await refreshTemplate(activeTemplate.id);
      await reloadTemplates(activeTemplate.id);
      setMessage({ severity: "success", text: "Da luu flow." });
    } catch (err) {
      setMessage({ severity: "error", text: readErrorMessage(err, "Khong luu duoc flow.") });
    }
  }

  async function lockFlowVersion() {
    if (!activeTemplate?.draftVersion || readOnly) return;
    setMessage(null);
    try {
      await lockVersion({ versionId: activeTemplate.draftVersion.id }).unwrap();
      await refreshTemplate(activeTemplate.id);
      await reloadTemplates(activeTemplate.id);
      setMessage({ severity: "success", text: "Da khoa version flow." });
    } catch (err) {
      setMessage({ severity: "error", text: readErrorMessage(err, "Khong khoa duoc flow.") });
    }
  }

  if (!dynamicFormTemplateId) {
    return (
      <Stack spacing={1.5}>
        <Typography fontWeight={800}>Flow</Typography>
        <Alert severity="info">Luu bieu mau truoc khi cau hinh flow.</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <AccountTreeIcon color="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800} noWrap>
              Flow
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {activeTemplate ? `${activeTemplate.code} - ${activeTemplate.status}` : "Chua co template"}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
          {templates.length > 0 && (
            <Select
              size="small"
              value={selectedTemplateId ?? ""}
              disabled={busy}
              onChange={(event: SelectChangeEvent) => setSelectedTemplateId(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.code}
                </MenuItem>
              ))}
            </Select>
          )}
          {!readOnly && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled={busy}
              onClick={() => void createFlowTemplate()}
            >
              Tao flow
            </Button>
          )}
          {activeTemplate && !readOnly && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={busy}
              onClick={() => void saveFlowDraft()}
            >
              Luu flow
            </Button>
          )}
          {activeTemplate?.draftVersion && !readOnly && (
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              disabled={busy}
              onClick={() => void lockFlowVersion()}
            >
              Khoa version
            </Button>
          )}
        </Stack>
      </Stack>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {!activeTemplate && !busy && (
        <Alert severity="info">Chua co flow template cho bieu mau nay.</Alert>
      )}
      {activeTemplate && !activeVersion && (
        <Alert severity="warning">Template chua co payload version.</Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value as FlowTab)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {flowTabs.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} />
        ))}
      </Tabs>

      {tab === "steps" && (
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700}>Flow steps</Typography>
            {!readOnly && (
              <Tooltip title="Them buoc">
                <IconButton size="small" onClick={() => setPayload(addStep(payload))}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Step id</TableCell>
                <TableCell>Step code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell width={44} />
              </TableRow>
            </TableHead>
            <TableBody>
              {payload.steps.map((step, index) => (
                <TableRow key={`${step.stepId}_${index}`}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={step.stepId}
                      disabled={readOnly}
                      onChange={(event) => updateStep(index, { stepId: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={step.stepCode}
                      disabled={readOnly}
                      onChange={(event) => updateStep(index, { stepCode: event.target.value.toUpperCase() })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={step.name ?? ""}
                      disabled={readOnly}
                      onChange={(event) => updateStep(index, { name: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    {!readOnly && payload.steps.length > 1 && (
                      <IconButton size="small" onClick={() => removeStep(index)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      )}

      {tab === "actors" && (
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700}>Actor policies</Typography>
            {!readOnly && (
              <Tooltip title="Them policy">
                <IconButton size="small" onClick={addActorPolicy}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Step</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Sub-flow</TableCell>
                <TableCell>Forward</TableCell>
                <TableCell>Final</TableCell>
                <TableCell width={44} />
              </TableRow>
            </TableHead>
            <TableBody>
              {payload.actorPolicies.map((policy, index) => (
                <TableRow key={policy.policyId ?? index}>
                  <TableCell>{renderStepSelect(policy.stepId ?? "", (stepId) => updateActorPolicy(index, { stepId }))}</TableCell>
                  <TableCell>{renderRoleSelect(policy.actorRole ?? "ISSUER", (actorRole) => updateActorPolicy(index, { actorRole }))}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={Boolean(policy.allowSubFlow)}
                      disabled={readOnly}
                      onChange={(event) => updateActorPolicy(index, { allowSubFlow: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={Boolean(policy.allowForward)}
                      disabled={readOnly}
                      onChange={(event) => updateActorPolicy(index, { allowForward: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={Boolean(policy.canFinalize)}
                      disabled={readOnly}
                      onChange={(event) => updateActorPolicy(index, { canFinalize: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <IconButton size="small" onClick={() => removeActorPolicy(index)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      )}

      {tab === "permissions" && (
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            {renderStepSelect(selectedStepId, setSelectedStepId)}
            {renderRoleSelect(selectedActorRole, setSelectedActorRole)}
            <Tabs
              value={permissionTab}
              onChange={(_, value) => setPermissionTab(value as PermissionTargetTab)}
              sx={{ minHeight: 36 }}
            >
              <Tab value="fields" label={`Fields ${fieldTargets.length}`} />
              <Tab value="tables" label={`Tables ${tableTargets.length}`} />
            </Tabs>
          </Stack>
          {permissionTab === "fields" ? (
            <PermissionTable
              rows={visibleFieldTargets.map((target) => ({
                key: target.fieldKey,
                label: target.label,
                policy: findFieldPolicy(payload, selectedStepId, selectedActorRole, target),
                onChange: (patch) => upsertFieldPolicy(target, patch),
              }))}
              readOnly={readOnly}
            />
          ) : (
            <PermissionTable
              rows={visibleTableTargets.map((target) => ({
                key: `${target.blockId}:${target.columnKey}`,
                label: target.label,
                policy: findTablePolicy(payload, selectedStepId, selectedActorRole, target),
                onChange: (patch) => upsertTablePolicy(target, patch),
              }))}
              readOnly={readOnly}
            />
          )}
          {permissionTab === "fields" && fieldTargets.length > maxMatrixRows && (
            <Typography variant="caption" color="text.secondary">{maxMatrixRows}/{fieldTargets.length}</Typography>
          )}
          {permissionTab === "tables" && tableTargets.length > maxMatrixRows && (
            <Typography variant="caption" color="text.secondary">{maxMatrixRows}/{tableTargets.length}</Typography>
          )}
        </Stack>
      )}

      {tab === "mapping" && (
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700}>Mapping rules</Typography>
            {!readOnly && (
              <Tooltip title="Them mapping">
                <IconButton size="small" onClick={addMappingRule}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Step</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Transform</TableCell>
                <TableCell>Policy</TableCell>
                <TableCell>Concept</TableCell>
                <TableCell width={44} />
              </TableRow>
            </TableHead>
            <TableBody>
              {payload.mappingRules.map((rule, index) => (
                <TableRow key={rule.mappingId}>
                  <TableCell>{renderStepSelect(rule.sourceStepId ?? "", (sourceStepId) => updateMappingRule(index, { sourceStepId }))}</TableCell>
                  <TableCell>
                    <Stack spacing={0.75}>
                      {renderMappingKindSelect(resolveMappingSourceKind(rule), (kind) => updateMappingRule(index, clearMappingEndpoint("source", kind)))}
                      {resolveMappingSourceKind(rule) === "table"
                        ? renderTableSelect(
                            buildTableTargetValue(rule.sourceBlockId, rule.sourceColumnKey),
                            (value) => updateMappingRule(index, toMappingTablePatch(value, "source")),
                          )
                        : renderFieldSelect(rule.sourceFieldId ?? "", (sourceFieldId) => updateMappingRule(index, { sourceFieldId, sourceFieldKey: null }))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.75}>
                      {renderMappingKindSelect(resolveMappingTargetKind(rule), (kind) => updateMappingRule(index, clearMappingEndpoint("target", kind)))}
                      {resolveMappingTargetKind(rule) === "table"
                        ? renderTableSelect(
                            buildTableTargetValue(rule.targetBlockId, rule.targetColumnKey),
                            (value) => updateMappingRule(index, toMappingTablePatch(value, "target")),
                          )
                        : renderFieldSelect(rule.targetFieldId ?? "", (targetFieldId) => updateMappingRule(index, { targetFieldId, targetFieldKey: null }))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.75}>
                      {renderOptionSelect(rule.valueTransform ?? "COPY", ["COPY", "FIRST_NON_BLANK", "SUM", "COUNT", "TEXT_JOIN"], (valueTransform) => updateMappingRule(index, { valueTransform }))}
                      <TextField
                        size="small"
                        value={rule.joinKey ?? ""}
                        placeholder="joinKey"
                        disabled={readOnly}
                        onChange={(event) => updateMappingRule(index, { joinKey: event.target.value })}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.75}>
                      {renderOptionSelect(rule.conflictPolicy ?? "OVERWRITE", ["OVERWRITE", "TARGET_WINS", "ERROR_ON_CONFLICT", "APPEND"], (conflictPolicy) => updateMappingRule(index, { conflictPolicy }))}
                      {renderOptionSelect(rule.contributionPolicy ?? "EXCLUDE", ["EXCLUDE", "INCLUDE"], (contributionPolicy) => updateMappingRule(index, { contributionPolicy }))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={rule.conceptCode ?? ""}
                      disabled={readOnly}
                      onChange={(event) => updateMappingRule(index, { conceptCode: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <IconButton size="small" onClick={() => removeMappingRule(index)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      )}

      {tab === "rollback" && (
        <JsonObjectEditor
          label="Rollback policy"
          value={payload.rollbackPolicy}
          disabled={readOnly}
          onChange={(rollbackPolicy) => setPayload((current) => ({ ...current, rollbackPolicy }))}
        />
      )}

      {tab === "final" && (
        <JsonObjectEditor
          label="Final result policy"
          value={payload.finalResultPolicy}
          disabled={readOnly}
          onChange={(finalResultPolicy) => setPayload((current) => ({ ...current, finalResultPolicy }))}
        />
      )}

      {tab === "stats" && (
        <Stack spacing={1.5}>
          <FormControlLabel
            control={
              <Checkbox
                checked={hasRowCompare(statisticProfile(payload))}
                disabled={readOnly}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    statisticProfile: {
                      ...current.statisticProfile,
                      diffMode: event.target.checked ? "ROW_COMPARE" : "NONE",
                    },
                  }))
                }
              />
            }
            label="Row compare"
          />
          {rowIdentityWarning && (
            <Alert severity="warning">Bang hien tai chua co row identity cho row compare.</Alert>
          )}
          <Divider />
          <JsonObjectEditor
            label="Statistic profile"
            value={payload.statisticProfile}
            disabled={readOnly}
            onChange={(statisticProfile) => setPayload((current) => ({ ...current, statisticProfile }))}
          />
        </Stack>
      )}
    </Stack>
  );

  function updateStep(index: number, patch: Partial<FlowStep>) {
    setPayload((current) => ({
      ...current,
      steps: current.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    }));
  }

  function removeStep(index: number) {
    setPayload((current) => ({
      ...current,
      steps: current.steps.filter((_, i) => i !== index),
    }));
  }

  function addActorPolicy() {
    setPayload((current) => ({
      ...current,
      actorPolicies: [
        ...current.actorPolicies,
        {
          policyId: createId("actor_policy"),
          stepId: activeStep?.stepId ?? current.steps[0]?.stepId ?? "step_1",
          actorRole: selectedActorRole,
          allowSubFlow: false,
          allowForward: false,
          canFinalize: false,
        },
      ],
    }));
  }

  function updateActorPolicy(index: number, patch: Partial<ActorPolicy>) {
    setPayload((current) => ({
      ...current,
      actorPolicies: current.actorPolicies.map((policy, i) =>
        i === index ? { ...policy, ...patch } : policy,
      ),
    }));
  }

  function removeActorPolicy(index: number) {
    setPayload((current) => ({
      ...current,
      actorPolicies: current.actorPolicies.filter((_, i) => i !== index),
    }));
  }

  function upsertFieldPolicy(target: FieldTarget, patch: Partial<FieldPolicy>) {
    setPayload((current) => {
      const index = current.fieldPolicies.findIndex((policy) =>
        policy.stepId === selectedStepId &&
        stringEquals(policy.actorRole, selectedActorRole) &&
        (policy.fieldKey === target.fieldKey || policy.fieldId === target.fieldId),
      );
      const nextPolicy: FieldPolicy = {
        ...(index >= 0 ? current.fieldPolicies[index] : {}),
        policyId: index >= 0 ? current.fieldPolicies[index].policyId : createId("field_policy"),
        stepId: selectedStepId,
        stepCode: activeStep?.stepCode ?? null,
        actorRole: selectedActorRole,
        fieldId: target.fieldId,
        fieldKey: target.fieldKey,
        ...patch,
      };
      const next = [...current.fieldPolicies];
      if (index >= 0) next[index] = nextPolicy;
      else next.push(nextPolicy);
      return { ...current, fieldPolicies: next };
    });
  }

  function upsertTablePolicy(target: TableTarget, patch: Partial<TableColumnPolicy>) {
    setPayload((current) => {
      const index = current.tableColumnPolicies.findIndex((policy) =>
        policy.stepId === selectedStepId &&
        stringEquals(policy.actorRole, selectedActorRole) &&
        policy.blockId === target.blockId &&
        stringEquals(policy.columnKey, target.columnKey),
      );
      const nextPolicy: TableColumnPolicy = {
        ...(index >= 0 ? current.tableColumnPolicies[index] : {}),
        policyId: index >= 0 ? current.tableColumnPolicies[index].policyId : createId("table_policy"),
        stepId: selectedStepId,
        stepCode: activeStep?.stepCode ?? null,
        actorRole: selectedActorRole,
        blockId: target.blockId,
        columnKey: target.columnKey,
        ...patch,
      };
      const next = [...current.tableColumnPolicies];
      if (index >= 0) next[index] = nextPolicy;
      else next.push(nextPolicy);
      return { ...current, tableColumnPolicies: next };
    });
  }

  function addMappingRule() {
    setPayload((current) => ({
      ...current,
      mappingRules: [
        ...current.mappingRules,
        {
          mappingId: createId("mapping"),
          mappingVersion: 1,
          sourceStepId: activeStep?.stepId ?? current.steps[0]?.stepId ?? "step_1",
          sourceFieldId: fieldTargets[0]?.fieldId ?? null,
          targetFieldId: fieldTargets[0]?.fieldId ?? null,
          valueTransform: "COPY",
          conflictPolicy: "OVERWRITE",
          contributionPolicy: "EXCLUDE",
        },
      ],
    }));
  }

  function updateMappingRule(index: number, patch: Partial<MappingRule>) {
    setPayload((current) => ({
      ...current,
      mappingRules: current.mappingRules.map((rule, i) =>
        i === index ? { ...rule, ...patch } : rule,
      ),
    }));
  }

  function removeMappingRule(index: number) {
    setPayload((current) => ({
      ...current,
      mappingRules: current.mappingRules.filter((_, i) => i !== index),
    }));
  }

  function renderStepSelect(value: string, onChange: (value: string) => void) {
    return (
      <Select
        size="small"
        value={value || payload.steps[0]?.stepId || ""}
        disabled={readOnly}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
        sx={{ minWidth: 150 }}
      >
        {payload.steps.map((step) => (
          <MenuItem key={step.stepId} value={step.stepId}>
            {step.stepCode || step.stepId}
          </MenuItem>
        ))}
      </Select>
    );
  }

  function renderRoleSelect(value: string, onChange: (value: string) => void) {
    return (
      <Select
        size="small"
        value={value || "ISSUER"}
        disabled={readOnly}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
        sx={{ minWidth: 150 }}
      >
        {actorRoles.map((role) => (
          <MenuItem key={role} value={role}>
            {role}
          </MenuItem>
        ))}
      </Select>
    );
  }

  function renderFieldSelect(value: string, onChange: (value: string) => void) {
    return (
      <Select
        size="small"
        value={value || fieldTargets[0]?.fieldId || ""}
        disabled={readOnly}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
        sx={{ minWidth: 180 }}
      >
        {fieldTargets.slice(0, maxMatrixRows).map((target) => (
          <MenuItem key={target.fieldId} value={target.fieldId}>
            {target.label}
          </MenuItem>
        ))}
      </Select>
    );
  }

  function renderTableSelect(value: string, onChange: (value: string) => void) {
    const fallback = tableTargets[0] ? buildTableTargetValue(tableTargets[0].blockId, tableTargets[0].columnKey) : "";
    return (
      <Select
        size="small"
        value={value || fallback}
        disabled={readOnly || tableTargets.length === 0}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
        sx={{ minWidth: 210 }}
      >
        {tableTargets.slice(0, maxMatrixRows).map((target) => (
          <MenuItem key={`${target.blockId}:${target.columnKey}`} value={buildTableTargetValue(target.blockId, target.columnKey)}>
            {target.label}
          </MenuItem>
        ))}
      </Select>
    );
  }

  function renderMappingKindSelect(value: "field" | "table", onChange: (value: "field" | "table") => void) {
    return (
      <Select
        size="small"
        value={value}
        disabled={readOnly}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value as "field" | "table")}
        sx={{ width: 108 }}
      >
        <MenuItem value="field">Field</MenuItem>
        <MenuItem value="table">Table</MenuItem>
      </Select>
    );
  }

  function renderOptionSelect(value: string, options: string[], onChange: (value: string) => void) {
    return (
      <Select
        size="small"
        value={value}
        disabled={readOnly}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
        sx={{ minWidth: 150 }}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    );
  }

  function clearMappingEndpoint(side: "source" | "target", kind: "field" | "table"): Partial<MappingRule> {
    if (side === "source") {
      if (kind === "table") {
        const target = tableTargets[0];
        return {
          sourceFieldId: null,
          sourceFieldKey: null,
          sourceBlockId: target?.blockId ?? null,
          sourceColumnKey: target?.columnKey ?? null,
        };
      }

      return {
        sourceFieldId: fieldTargets[0]?.fieldId ?? null,
        sourceFieldKey: null,
        sourceBlockId: null,
        sourceColumnKey: null,
      };
    }

    if (kind === "table") {
      const target = tableTargets[0];
      return {
        targetFieldId: null,
        targetFieldKey: null,
        targetBlockId: target?.blockId ?? null,
        targetColumnKey: target?.columnKey ?? null,
      };
    }

    return {
      targetFieldId: fieldTargets[0]?.fieldId ?? null,
      targetFieldKey: null,
      targetBlockId: null,
      targetColumnKey: null,
    };
  }

  function toMappingTablePatch(value: string, side: "source" | "target"): Partial<MappingRule> {
    const [blockId, columnKey] = splitTableTargetValue(value);
    return side === "source"
      ? { sourceBlockId: blockId, sourceColumnKey: columnKey, sourceFieldId: null, sourceFieldKey: null }
      : { targetBlockId: blockId, targetColumnKey: columnKey, targetFieldId: null, targetFieldKey: null };
  }
}

function resolveMappingSourceKind(rule: MappingRule): "field" | "table" {
  return rule.sourceBlockId || rule.sourceColumnKey ? "table" : "field";
}

function resolveMappingTargetKind(rule: MappingRule): "field" | "table" {
  return rule.targetBlockId || rule.targetColumnKey ? "table" : "field";
}

function buildTableTargetValue(blockId?: string | null, columnKey?: string | null) {
  return `${blockId ?? ""}:${columnKey ?? ""}`;
}

function splitTableTargetValue(value: string): [string | null, string | null] {
  const [blockId, columnKey] = value.split(":", 2);
  return [blockId?.trim() || null, columnKey?.trim() || null];
}

function PermissionTable({
  rows,
  readOnly,
}: {
  rows: Array<{
    key: string;
    label: string;
    policy?: FieldPolicy | TableColumnPolicy;
    onChange: (patch: Partial<FieldPolicy & TableColumnPolicy>) => void;
  }>;
  readOnly: boolean;
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Target</TableCell>
          <TableCell>Read</TableCell>
          <TableCell>Write</TableCell>
          <TableCell>Required</TableCell>
          <TableCell>Hidden</TableCell>
          <TableCell>Lock</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>
              <Typography variant="body2" fontWeight={700}>{row.label}</Typography>
              <Typography variant="caption" color="text.secondary">{row.key}</Typography>
            </TableCell>
            {permissionColumns.map((column) => (
              <TableCell key={column.key}>
                <Checkbox
                  checked={column.getValue(row.policy)}
                  disabled={readOnly}
                  onChange={(event) => row.onChange({ [column.key]: event.target.checked })}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const permissionColumns: Array<{
  key: "read" | "write" | "required" | "hidden" | "lockedAfterSubmit";
  getValue: (policy?: FieldPolicy | TableColumnPolicy) => boolean;
}> = [
  { key: "read", getValue: (policy) => policy?.read ?? true },
  { key: "write", getValue: (policy) => policy?.write ?? false },
  { key: "required", getValue: (policy) => policy?.required ?? false },
  { key: "hidden", getValue: (policy) => policy?.hidden ?? false },
  { key: "lockedAfterSubmit", getValue: (policy) => policy?.lockedAfterSubmit ?? false },
];

function JsonObjectEditor({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: Record<string, unknown>;
  disabled: boolean;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value ?? {}, null, 2));
    setError(null);
  }, [value]);

  return (
    <Stack spacing={1}>
      <TextField
        label={label}
        multiline
        minRows={8}
        value={text}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error ?? "JSON object"}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(text || "{}");
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
              throw new Error("Object required");
            }
            setError(null);
            onChange(parsed);
          } catch {
            setError("JSON object khong hop le.");
          }
        }}
      />
    </Stack>
  );
}

function parseFlowPayload(payloadJson?: string | null): FlowPayload {
  const fallback = createDefaultPayload();
  if (!payloadJson?.trim()) return fallback;
  try {
    const parsed = JSON.parse(payloadJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    return normalizePayload(parsed as Partial<FlowPayload>);
  } catch {
    return fallback;
  }
}

function normalizePayload(input: Partial<FlowPayload>): FlowPayload {
  const steps = normalizeSteps(input.steps);
  return {
    steps,
    transitions: Array.isArray(input.transitions) ? input.transitions : [],
    actorPolicies: Array.isArray(input.actorPolicies) ? input.actorPolicies : [],
    fieldPolicies: Array.isArray(input.fieldPolicies) ? input.fieldPolicies : [],
    tableColumnPolicies: Array.isArray(input.tableColumnPolicies) ? input.tableColumnPolicies : [],
    mappingRules: Array.isArray(input.mappingRules) ? input.mappingRules : [],
    rollbackPolicy: isPlainObject(input.rollbackPolicy) ? input.rollbackPolicy : {},
    finalResultPolicy: isPlainObject(input.finalResultPolicy) ? input.finalResultPolicy : {},
    statisticProfile: isPlainObject(input.statisticProfile) ? input.statisticProfile : {},
  };
}

function normalizeSteps(steps?: FlowStep[] | null): FlowStep[] {
  const source = Array.isArray(steps) && steps.length > 0 ? steps : createDefaultPayload().steps;
  return source.map((step, index) => ({
    ...step,
    stepId: readString(step.stepId) ?? `step_${index + 1}`,
    stepCode: (readString(step.stepCode) ?? `STEP_${index + 1}`).toUpperCase(),
    order: index + 1,
  }));
}

function createDefaultPayload(fields: FieldTarget[] = []): FlowPayload {
  return {
    steps: [{ stepId: "step_1", stepCode: "ISSUER", name: "Issuer", order: 1 }],
    transitions: [],
    actorPolicies: [
      {
        policyId: "actor_policy_1",
        stepId: "step_1",
        actorRole: "ISSUER",
        allowSubFlow: false,
        allowForward: true,
        canFinalize: true,
      },
    ],
    fieldPolicies: fields.slice(0, 20).map((field) => ({
      policyId: `field_policy_${field.fieldKey}`,
      stepId: "step_1",
      stepCode: "ISSUER",
      actorRole: "ISSUER",
      fieldId: field.fieldId,
      fieldKey: field.fieldKey,
      read: true,
      write: true,
      required: false,
      hidden: false,
      lockedAfterSubmit: true,
    })),
    tableColumnPolicies: [],
    mappingRules: [],
    rollbackPolicy: {},
    finalResultPolicy: {},
    statisticProfile: { diffMode: "NONE" },
  };
}

function addStep(payload: FlowPayload): FlowPayload {
  const index = payload.steps.length + 1;
  const step: FlowStep = {
    stepId: createId("step"),
    stepCode: `STEP_${index}`,
    name: `Step ${index}`,
    order: index,
  };
  return { ...payload, steps: [...payload.steps, step] };
}

function findFieldPolicy(
  payload: FlowPayload,
  stepId: string,
  actorRole: string,
  target: FieldTarget,
) {
  return payload.fieldPolicies.find((policy) =>
    policy.stepId === stepId &&
    stringEquals(policy.actorRole, actorRole) &&
    (policy.fieldKey === target.fieldKey || policy.fieldId === target.fieldId),
  );
}

function findTablePolicy(
  payload: FlowPayload,
  stepId: string,
  actorRole: string,
  target: TableTarget,
) {
  return payload.tableColumnPolicies.find((policy) =>
    policy.stepId === stepId &&
    stringEquals(policy.actorRole, actorRole) &&
    policy.blockId === target.blockId &&
    stringEquals(policy.columnKey, target.columnKey),
  );
}

function readTableTargets(blocksJson?: string | null, excelBlockJson?: string | null): TableTarget[] {
  const seen = new Set<string>();
  const rows: TableTarget[] = [];
  const blockJsonList = getDynamicFormBlockJsonList(blocksJson, excelBlockJson);

  blockJsonList.forEach((blockJson, blockIndex) => {
    const block = parseObject(blockJson);
    const blockId = readString(block?.blockId) ?? readString(block?.id) ?? `block_${blockIndex + 1}`;
    const columns = [
      ...readColumnTargets(block, "indexMap"),
      ...readColumnTargets(block, "statisticColumns"),
      ...readColumnTargets(block, "columns"),
      ...readColumnTargets(block, "columnDefinitions"),
    ];
    columns.forEach((column) => {
      const key = `${blockId}:${column.columnKey.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        blockId,
        columnKey: column.columnKey,
        label: `${blockId} / ${column.label}`,
      });
    });
  });

  return rows;
}

function readColumnTargets(block: Record<string, unknown> | null, propertyName: string) {
  const items = Array.isArray(block?.[propertyName]) ? block?.[propertyName] as unknown[] : [];
  return items
    .filter(isPlainObject)
    .map((item, index) => {
      const columnKey =
        readString(item.columnKey) ??
        readString(item.key) ??
        readString(item.id) ??
        readString(item.columnInstanceId) ??
        readString(item.header) ??
        readColumnIndexKey(item) ??
        `col_${index + 1}`;
      return {
        columnKey,
        label: readString(item.label) ?? readString(item.header) ?? columnKey,
      };
    });
}

function readColumnIndexKey(item: Record<string, unknown>) {
  const raw = item.columnIndex;
  const index = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : -1;
  return index >= 0 ? `col_${index + 1}` : null;
}

function buildTemplateCode(dynamicFormTemplateId: string) {
  const suffix = dynamicFormTemplateId.slice(-8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  return `FLOW_${suffix}_${stamp}`;
}

function statisticProfile(payload: FlowPayload) {
  return payload.statisticProfile ?? {};
}

function hasRowCompare(profile: Record<string, unknown>) {
  return readString(profile.diffMode)?.toUpperCase() === "ROW_COMPARE";
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseObject(json?: string | null): Record<string, unknown> | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringEquals(left?: string | null, right?: string | null) {
  return (left ?? "").toUpperCase() === (right ?? "").toUpperCase();
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; data?: { message?: unknown }; error?: unknown };
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.data?.message === "string" && record.data.message.trim()) return record.data.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  return fallback;
}
