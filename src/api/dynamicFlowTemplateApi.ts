import { baseApi } from "./base/baseApi";
import { type PagedResult } from "../types/pagedResult";
import {
  DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256,
  DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION,
} from "../generated/dynamicFormFlowCapabilityCatalog.generated";

export type DynamicFlowTemplateStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type DynamicFlowTemplateVersionStatus = "DRAFT" | "LOCKED" | "ARCHIVED";
export type DynamicFlowStatisticContributionPolicy = "EXCLUDE" | "INCLUDE";

export type FlowActorRole = "ISSUER" | "ASSIGNEE" | "COORDINATOR" | "REVIEWER" | "FINALIZER";

export type FlowPayload = {
  rootDynamicFormTemplateId?: string | null;
  formNodes: FlowFormNode[];
  steps: FlowStep[];
  transitions: FlowTransition[];
  actorPolicies: FlowActorPolicy[];
  fieldPolicies: FlowFieldPolicy[];
  tableColumnPolicies: FlowTableColumnPolicy[];
  mappingRules: FlowMappingRule[];
  rollbackPolicy: Record<string, unknown>;
  finalResultPolicy: Record<string, unknown>;
  statisticProfile: Record<string, unknown>;
};

export type FlowTransition = {
  transitionId?: string | null;
  fromStepId: string;
  toStepId: string;
};

export type FlowActorPolicy = {
  policyId?: string | null;
  stepId?: string | null;
  stepCode?: string | null;
  actorRole?: FlowActorRole | "*" | null;
  allowSubFlow?: boolean | null;
  allowForward?: boolean | null;
  canFinalize?: boolean | null;
};

export type FlowFormNode = {
  formNodeId: string;
  role: "ROOT" | "CHILD" | string;
  dynamicFormTemplateId: string;
  dynamicFormFamilyId?: string | null;
  dynamicFormVersionNo?: number | null;
  dynamicFormSchemaHash?: string | null;
};

export type FlowStep = {
  stepId: string;
  stepCode: string;
  stepName?: string | null;
  stepOrder: number;
  formNodeId?: string | null;
  dynamicFormTemplateId: string;
};

export type FlowMappingRule = {
  mappingId: string;
  mappingVersion: number;
  mappingKind: "FIELD" | "TABLE_COLUMN" | string;
  sourceDynamicFormTemplateId?: string | null;
  sourceStepId?: string | null;
  sourceStepCode?: string | null;
  sourceSectionId?: string | null;
  sourceSectionCode?: string | null;
  sourceFieldId?: string | null;
  sourceFieldKey?: string | null;
  sourceBlockId?: string | null;
  sourceColumnKey?: string | null;
  targetDynamicFormTemplateId?: string | null;
  targetStepId?: string | null;
  targetStepCode?: string | null;
  targetSectionId?: string | null;
  targetSectionCode?: string | null;
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
  evaluationGrain?: "FLOW_INSTANCE" | "SOURCE_REPORT" | "TABLE_ROW" | string | null;
  errorPolicy?: "BLOCK_APPLY" | "SKIP_RULE" | "USE_DEFAULT" | string | null;
  inputs?: FlowMappingInput[] | null;
  target?: FlowMappingEndpoint | null;
  calculation?: FlowMappingCalculation | null;
};

export type FlowMappingInput = {
  inputKey: string;
  source: FlowMappingEndpoint;
  dataType?: string | null;
  cardinality?: "ONE" | "MANY" | string | null;
  nullPolicy?: "KEEP_NULL" | "SKIP" | "ZERO" | "EMPTY_TEXT" | "ERROR" | string | null;
  constantValue?: unknown;
};

export type FlowMappingEndpoint = {
  kind: "FIELD" | "TABLE_COLUMN" | "CONSTANT" | string;
  dynamicFormTemplateId?: string | null;
  stepId?: string | null;
  stepCode?: string | null;
  sectionId?: string | null;
  fieldId?: string | null;
  fieldKey?: string | null;
  blockId?: string | null;
  columnKey?: string | null;
  rowKey?: string | null;
  dataType?: string | null;
};

export type FlowMappingCalculation = {
  kind: "DIRECT" | "EXPRESSION" | "REGISTERED_FUNCTION" | string;
  operation?: string | null;
  resultDataType?: string | null;
  expression?: unknown;
  functionCode?: string | null;
  functionVersion?: number | null;
  arguments?: Record<string, unknown> | null;
  defaultValue?: unknown;
};

export type FlowFieldPolicy = {
  policyId?: string | null;
  id?: string | null;
  dynamicFormTemplateId?: string | null;
  stepId?: string | null;
  stepCode?: string | null;
  actorRole?: string | null;
  fieldId?: string | null;
  fieldKey?: string | null;
  read?: boolean | null;
  canRead?: boolean | null;
  write?: boolean | null;
  canWrite?: boolean | null;
  required?: boolean | null;
  isRequired?: boolean | null;
  hidden?: boolean | null;
  isHidden?: boolean | null;
  locked?: boolean | null;
  isLocked?: boolean | null;
  lockedAfterSubmit?: boolean | null;
};

export type FlowTableColumnPolicy = {
  policyId?: string | null;
  id?: string | null;
  dynamicFormTemplateId?: string | null;
  stepId?: string | null;
  stepCode?: string | null;
  actorRole?: string | null;
  blockId: string;
  columnKey: string;
  read?: boolean | null;
  write?: boolean | null;
  required?: boolean | null;
  hidden?: boolean | null;
  locked?: boolean | null;
  lockedAfterSubmit?: boolean | null;
};

// P4 definition contract. The legacy builder types above remain available while
// old drafts are adapted by the server; new definition endpoints use only these
// closed unions and server-derived permission/eligibility metadata.
export const DYNAMIC_FLOW_DEFINITION_SCHEMA_VERSION = 2 as const;
export const DYNAMIC_FLOW_CATALOG_VERSION =
  DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION;
const DYNAMIC_FLOW_HISTORICAL_CATALOG_PINS = {
  "1.1": "e8a0b15bb5c7cab81ed49ec5c213105366a1194faa2d78168a46226d9cc505cf",
  "1.2": "b26549d5de7a3d93bd6fc9bab7bfdfbdaffb66a01347039b2c3629692b60068f",
  "1.3": "55cfa0a4420e01db6707011ffc7a0271088c5b01b63edb8f2d21978edd3e2497",
  "1.4": "d2ca56a4745380688e24c6926752643d2b023b2d47bc1578d3b3e2f9379457ee",
} as const;
export const DYNAMIC_FLOW_DEFINITION_ACCESS_FORBIDDEN_REASON =
  "DYNAMIC_FLOW_DEFINITION_ACCESS_FORBIDDEN" as const;

export type DynamicFlowTargetPhase = "P5" | "P6" | "P7";
export type DynamicFlowExecutionEligibility = "BLOCKED_UNTIL_TARGET_PHASE";
export type DynamicFlowExecutionBlockedReason = "TARGET_PHASE_NOT_IMPLEMENTED";

export type DynamicFlowPermissionMetadata = {
  canRead: boolean;
  canManage: boolean;
  executeGrant: boolean;
  /**
   * Server attestation produced by a successful lock. A false value on a
   * clean draft must not prevent asking the server to validate and lock it.
   */
  definitionLockable: boolean;
  executionEligibility: DynamicFlowExecutionEligibility;
  executionBlockedReason: DynamicFlowExecutionBlockedReason | null;
  blockedUntilPhase: DynamicFlowTargetPhase | null;
  canExecute: false;
};

export type DynamicFlowCatalogMetadata = {
  // REQUIRES_REVIEW snapshots expose these values only as untrusted migration
  // metadata. CANONICAL responses are still decoded strictly against schema 2
  // and the generated active catalog version.
  schemaVersion: number | null;
  adapterVersion: number | null;
  catalogVersion: string | null;
  catalogSemanticHash: string | null;
};

export type DynamicFlowDefinitionLineage = {
  originFamilyId: string | null;
  originVersionId: string | null;
};

export type FlowDefinitionFormReferenceV2 = {
  formNodeId: string;
  role: "ROOT" | "CHILD" | "REVIEWER";
  dynamicFormTemplateId: string;
};

export type FlowDefinitionFormSnapshotV2 = FlowDefinitionFormReferenceV2 & {
  dynamicFormFamilyId: string | null;
  dynamicFormVersionNo: number | null;
  dynamicFormSchemaHash: string | null;
  dynamicFormSnapshotHash: string | null;
};

export type FlowJsonValue =
  | string
  | number
  | boolean
  | null
  | FlowJsonValue[]
  | { [key: string]: FlowJsonValue };

export type FlowConditionOperatorV2 =
  | "AND"
  | "OR"
  | "NOT"
  | "EQ"
  | "NE"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IN"
  | "NOT_IN"
  | "EXISTS"
  | "NOT_EXISTS"
  | "IS_NULL"
  | "IS_NOT_NULL"
  | "TRUE"
  | "FALSE";

export type FlowConditionV2 = {
  operator: FlowConditionOperatorV2;
  field: string | null;
  value: FlowJsonValue;
  values: FlowJsonValue[];
  children: FlowConditionV2[];
};

export type FlowGatewayKindV2 =
  | "FORK"
  | "JOIN_ALL"
  | "JOIN_ANY"
  | "JOIN_N_OF_M"
  | "CONDITION"
  | "REVIEW"
  | "SUBFLOW"
  | "SCHEDULE"
  | "ROLLBACK_FINALIZE";

export type FlowGatewayV2 = {
  kind: FlowGatewayKindV2;
  expectedIncomingNodeIds: string[];
  requiredIncomingCount: number | null;
  reviewRole: FlowActorRole | null;
  subflowFamilyId: string | null;
  subflowVersionId: string | null;
  scheduleKey: string | null;
  rollbackTargetNodeId: string | null;
};

export type FlowDefinitionNodeV2 =
  | {
      nodeId: string;
      nodeCode: string;
      nodeKind: "FORM_STEP";
      name: string | null;
      formNodeId: string;
      declaredRoles: FlowActorRole[];
      gateway: null;
    }
  | {
      nodeId: string;
      nodeCode: string;
      nodeKind: "GATEWAY";
      name: string | null;
      formNodeId: null;
      declaredRoles: FlowActorRole[];
      gateway: FlowGatewayV2;
    }
  | {
      nodeId: string;
      nodeCode: string;
      nodeKind: "FINAL";
      name: string | null;
      formNodeId: null;
      declaredRoles: FlowActorRole[];
      gateway: null;
    };

export type FlowDefinitionEdgeV2 = {
  transitionId: string;
  fromNodeId: string;
  toNodeId: string;
  condition?: FlowConditionV2 | null;
};

export type FlowActorPolicyV2 = {
  policyId: string | null;
  stepId: string | null;
  stepCode: string | null;
  actorRole: FlowActorRole | "*" | null;
  allowSubFlow: boolean | null;
  allowForward: boolean | null;
  canFinalize: boolean | null;
};

export type FlowFieldPolicyV2 = {
  policyId: string | null;
  dynamicFormTemplateId: string | null;
  stepId: string | null;
  stepCode: string | null;
  actorRole: FlowActorRole | "*" | null;
  fieldId: string | null;
  fieldKey: string | null;
  read: boolean | null;
  write: boolean | null;
  required: boolean | null;
  hidden: boolean | null;
  locked: boolean | null;
  lockedAfterSubmit: boolean | null;
};

export type FlowTableColumnPolicyV2 = {
  policyId: string | null;
  dynamicFormTemplateId: string | null;
  stepId: string | null;
  stepCode: string | null;
  actorRole: FlowActorRole | "*" | null;
  blockId: string | null;
  columnKey: string | null;
  read: boolean | null;
  write: boolean | null;
  required: boolean | null;
  hidden: boolean | null;
  locked: boolean | null;
  lockedAfterSubmit: boolean | null;
};

export type FlowMappingEndpointV2 = {
  kind: "FIELD" | "TABLE_COLUMN" | "CONSTANT" | null;
  dynamicFormTemplateId: string | null;
  stepId: string | null;
  stepCode: string | null;
  sectionId: string | null;
  sectionCode: string | null;
  fieldId: string | null;
  fieldKey: string | null;
  blockId: string | null;
  columnKey: string | null;
  rowKey: string | null;
  dataType: string | null;
};

export type FlowMappingInputV2 = {
  inputKey: string;
  source: FlowMappingEndpointV2;
  dataType: string | null;
  cardinality: "ONE" | "MANY" | null;
  nullPolicy: "KEEP_NULL" | "SKIP" | "ZERO" | "EMPTY_TEXT" | "ERROR" | null;
  constantValue: FlowJsonValue;
};

export type FlowMappingCalculationV2 = {
  kind: "DIRECT" | "EXPRESSION" | "REGISTERED_FUNCTION" | null;
  operation: string | null;
  resultDataType: string | null;
  expression: FlowJsonValue;
  functionCode: string | null;
  functionVersion: number | null;
  arguments: Record<string, FlowJsonValue> | null;
  defaultValue: FlowJsonValue;
};

export type FlowMappingRuleV2 = {
  mappingId: string;
  mappingVersion: number;
  mappingKind: "FIELD" | "TABLE_COLUMN" | "APPEND_COLUMNS" | null;
  inputs: FlowMappingInputV2[] | null;
  target: FlowMappingEndpointV2 | null;
  calculation: FlowMappingCalculationV2 | null;
  conceptCode: string | null;
  evaluationGrain: "FLOW_INSTANCE" | "SOURCE_REPORT" | "TABLE_ROW" | null;
  errorPolicy: "BLOCK_APPLY" | "SKIP_RULE" | "USE_DEFAULT" | null;
};

export type FlowDefinitionPayloadV2 = {
  schemaVersion: typeof DYNAMIC_FLOW_DEFINITION_SCHEMA_VERSION;
  archetypeId: string;
  entryStepId: string;
  rootDynamicFormTemplateId?: string | null;
  formNodes: FlowDefinitionFormReferenceV2[];
  nodes: FlowDefinitionNodeV2[];
  edges: FlowDefinitionEdgeV2[];
  actorPolicies: FlowActorPolicyV2[];
  fieldPolicies: FlowFieldPolicyV2[];
  tableColumnPolicies: FlowTableColumnPolicyV2[];
  mappingRules: FlowMappingRuleV2[];
  resultOwnerStepId: string | null;
  resultOwnerFormNodeId: string | null;
  statisticsOwnerStepId: string | null;
  statisticsOwnerFormNodeId: string | null;
  rollbackPolicy: Readonly<Record<string, unknown>>;
  finalResultPolicy: Readonly<Record<string, unknown>>;
  statisticProfile: Readonly<Record<string, unknown>>;
};

export type FlowDefinitionSnapshotV2 = Omit<FlowDefinitionPayloadV2, "formNodes" | "schemaVersion"> & {
  schemaVersion: number | null;
  formNodes: FlowDefinitionFormSnapshotV2[];
  catalogVersion: string | null;
  catalogSemanticHash: string | null;
};

export type DynamicFlowTemplateVersionDetailDto = DynamicFlowPermissionMetadata &
  DynamicFlowCatalogMetadata & {
    id: string;
    templateId: string;
    familyId: string;
    rootDynamicFormTemplateId: string | null;
    dynamicFormTemplateId: string | null;
    versionNo: number;
    status: DynamicFlowTemplateVersionStatus;
    draftRevision: number;
    payload: FlowDefinitionSnapshotV2;
    payloadHash: string;
    contributionPolicy: DynamicFlowStatisticContributionPolicy | null;
    contributionPolicyHash: string | null;
    contributionWarning: string | null;
    isUsed: boolean;
    lineage: DynamicFlowDefinitionLineage;
    migrationState: "CANONICAL" | "REQUIRES_REVIEW";
    lockedAtUtc: string | null;
    lockedByUserId: string | null;
    archivedAtUtc: string | null;
    archivedByUserId: string | null;
    createdAtUtc: string;
    updatedAtUtc: string;
  };

export type DynamicFlowTemplateVersionSummaryDto = Omit<
  DynamicFlowTemplateVersionDetailDto,
  "payload"
>;

export type DynamicFlowTemplateFamilyDto = DynamicFlowPermissionMetadata & {
    id: string;
    familyId: string;
    code: string;
    name: string;
    description: string | null;
    rootDynamicFormTemplateId: string | null;
    dynamicFormTemplateId: string | null;
    status: DynamicFlowTemplateStatus;
    familyRevision: number;
    ownerUserId: string | null;
    ownerUnitId: string | null;
    lineage: DynamicFlowDefinitionLineage;
    currentVersionId: string | null;
    currentVersionNo: number | null;
    currentVersionHash: string | null;
    currentVersion: DynamicFlowTemplateVersionDetailDto | null;
    draftVersion: DynamicFlowTemplateVersionDetailDto | null;
    versions: DynamicFlowTemplateVersionSummaryDto[];
    hasLockedVersion: boolean;
    archivedAtUtc: string | null;
    archivedByUserId: string | null;
    isDeleted: boolean;
    createdAtUtc: string;
    updatedAtUtc: string;
  };

export type DynamicFlowTemplateSortField =
  | "updatedAtUtc"
  | "createdAtUtc"
  | "code"
  | "name"
  | "status";
export type DynamicFlowSortDirection = "ASC" | "DESC";

export type SearchDynamicFlowTemplateFamiliesRequest = {
  query?: string | null;
  status?: DynamicFlowTemplateStatus | null;
  sortBy?: DynamicFlowTemplateSortField;
  sortDirection?: DynamicFlowSortDirection;
  page: number;
  pageSize: number;
};

export type CreateDynamicFlowTemplateFamilyRequest = {
  commandId: string;
  code: string;
  name: string;
  description?: string | null;
  rootDynamicFormTemplateId?: string | null;
  dynamicFormTemplateId?: string | null;
  payload: FlowDefinitionPayloadV2;
};

export type UpdateDynamicFlowTemplateFamilyRequest = {
  commandId: string;
  expectedFamilyRevision: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  rootDynamicFormTemplateId?: string | null;
  dynamicFormTemplateId?: string | null;
};

export type DynamicFlowFamilyRevisionCommand = {
  commandId: string;
  expectedFamilyRevision: number;
};

export type CloneDynamicFlowTemplateFamilyRequest = DynamicFlowFamilyRevisionCommand & {
  sourceVersionId: string;
  sourceDraftRevision: number;
  sourcePayloadHash: string;
  code: string;
  name?: string | null;
  description?: string | null;
};

export type SaveDynamicFlowTemplateDraftP4Request = {
  commandId: string;
  expectedDraftRevision: number;
  expectedPayloadHash: string;
  payload: FlowDefinitionPayloadV2;
};

export type LockDynamicFlowTemplateVersionP4Request = DynamicFlowFamilyRevisionCommand & {
  expectedDraftRevision: number;
  expectedPayloadHash: string;
  contributionPolicy?: DynamicFlowStatisticContributionPolicy | null;
  acknowledgeContributionWarning?: boolean | null;
};

export type DiffDynamicFlowTemplateVersionsRequest = {
  fromVersionId: string;
  toVersionId: string;
};

export type DynamicFlowDiffOperation = {
  op: "ADD" | "REMOVE" | "REPLACE";
  path: string;
  fromValue?: unknown;
  toValue?: unknown;
};

export type DynamicFlowTemplateDiffDto = {
  familyId: string;
  fromVersionId: string;
  toVersionId: string;
  fromPayloadHash: string;
  toPayloadHash: string;
  operations: DynamicFlowDiffOperation[];
};

export type DynamicFlowTemplateSearchRequest = {
  query?: string | null;
  status?: DynamicFlowTemplateStatus | string | null;
  rootDynamicFormTemplateId?: string | null;
  dynamicFormTemplateId?: string | null;
  page?: number;
  pageSize?: number;
};

export type DynamicFlowTemplateVersionDto = {
  id: string;
  templateId: string;
  familyId?: string;
  rootDynamicFormTemplateId?: string | null;
  dynamicFormTemplateId?: string | null;
  versionNo: number;
  status: DynamicFlowTemplateVersionStatus | string;
  draftRevision: number;
  payload: FlowPayload;
  /** @deprecated Use payload. */
  payloadJson: string;
  payloadHash: string;
  contributionPolicy?: DynamicFlowStatisticContributionPolicy | null;
  contributionPolicyHash?: string | null;
  contributionWarning?: string | null;
  isUsed: boolean;
  schemaVersion?: number;
  adapterVersion?: number;
  catalogVersion?: string | null;
  catalogSemanticHash?: string | null;
  lineage?: DynamicFlowDefinitionLineage | null;
  migrationState?: "CANONICAL" | "REQUIRES_REVIEW" | string;
  canRead?: boolean;
  canManage?: boolean;
  executeGrant?: boolean;
  definitionLockable?: boolean;
  executionEligibility?: DynamicFlowExecutionEligibility | null;
  executionBlockedReason?: DynamicFlowExecutionBlockedReason | string | null;
  blockedUntilPhase?: DynamicFlowTargetPhase | null;
  canExecute?: boolean;
  lockedAtUtc?: string | null;
  lockedByUserId?: string | null;
  archivedAtUtc?: string | null;
  archivedByUserId?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type DynamicFlowTemplateDto = {
  id: string;
  familyId?: string;
  code: string;
  name: string;
  description?: string | null;
  rootDynamicFormTemplateId?: string | null;
  dynamicFormTemplateId?: string | null;
  status: DynamicFlowTemplateStatus | string;
  familyRevision?: number;
  ownerUserId?: string | null;
  ownerUnitId?: string | null;
  lineage?: DynamicFlowDefinitionLineage | null;
  canRead?: boolean;
  canManage?: boolean;
  executeGrant?: boolean;
  definitionLockable?: boolean;
  executionEligibility?: DynamicFlowExecutionEligibility | null;
  executionBlockedReason?: DynamicFlowExecutionBlockedReason | string | null;
  blockedUntilPhase?: DynamicFlowTargetPhase | null;
  canExecute?: boolean;
  hasLockedVersion?: boolean;
  archivedAtUtc?: string | null;
  archivedByUserId?: string | null;
  isDeleted?: boolean;
  currentVersionId?: string | null;
  currentVersionNo?: number | null;
  currentVersionHash?: string | null;
  currentVersion?: DynamicFlowTemplateVersionDto | null;
  draftVersion?: DynamicFlowTemplateVersionDto | null;
  versions: DynamicFlowTemplateVersionDto[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateDynamicFlowTemplateRequest = {
  commandId?: string;
  code: string;
  name: string;
  description?: string | null;
  rootDynamicFormTemplateId?: string | null;
  dynamicFormTemplateId?: string | null;
  payload?: FlowPayload | null;
  /** @deprecated Use payload. */
  payloadJson?: string | null;
};

export type UpdateDynamicFlowTemplateRequest = {
  commandId?: string;
  expectedFamilyRevision?: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  rootDynamicFormTemplateId?: string | null;
  dynamicFormTemplateId?: string | null;
};

export type SaveDynamicFlowTemplateVersionDraftRequest = {
  commandId?: string;
  expectedDraftRevision?: number;
  expectedPayloadHash?: string;
  payload?: FlowPayload | null;
  /** @deprecated Use payload. */
  payloadJson?: string | null;
};

export type LockDynamicFlowTemplateVersionRequest = {
  commandId?: string;
  expectedFamilyRevision?: number;
  expectedDraftRevision?: number;
  expectedPayloadHash?: string;
  contributionPolicy?: DynamicFlowStatisticContributionPolicy | null;
  acknowledgeContributionWarning?: boolean | null;
};

export class DynamicFlowResponseContractError extends Error {
  readonly path: string;

  constructor(path: string, expected: string) {
    super(`Invalid dynamic Flow response at ${path}: expected ${expected}.`);
    this.name = "DynamicFlowResponseContractError";
    this.path = path;
  }
}

function responseRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DynamicFlowResponseContractError(path, "object");
  }
  return value as Record<string, unknown>;
}

function responseString(value: unknown, path: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new DynamicFlowResponseContractError(path, "non-empty string");
  }
  return value;
}

function responseNullableString(value: unknown, path: string) {
  if (value !== null && typeof value !== "string") {
    throw new DynamicFlowResponseContractError(path, "string or null");
  }
}

function responseInteger(value: unknown, path: string) {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new DynamicFlowResponseContractError(path, "non-negative integer");
  }
  return value as number;
}

function responseBoolean(value: unknown, path: string) {
  if (typeof value !== "boolean") {
    throw new DynamicFlowResponseContractError(path, "boolean");
  }
  return value;
}

function responseArray(value: unknown, path: string) {
  if (!Array.isArray(value)) {
    throw new DynamicFlowResponseContractError(path, "array");
  }
  return value;
}

function responseNullableBoolean(value: unknown, path: string) {
  if (value !== null && typeof value !== "boolean") {
    throw new DynamicFlowResponseContractError(path, "boolean or null");
  }
}

function responseNullableInteger(value: unknown, path: string) {
  if (value !== null) responseInteger(value, path);
}

function responseNullableEnum(
  value: unknown,
  path: string,
  allowed: readonly string[],
) {
  if (
    value !== null &&
    (typeof value !== "string" || !allowed.includes(value))
  ) {
    throw new DynamicFlowResponseContractError(
      path,
      `${allowed.join(", ")}, or null`,
    );
  }
}

function responseJsonValue(value: unknown, path: string): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new DynamicFlowResponseContractError(path, "finite JSON number");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => responseJsonValue(item, `${path}[${index}]`));
    return;
  }
  const record = responseRecord(value, path);
  Object.entries(record).forEach(([key, item]) =>
    responseJsonValue(item, `${path}.${key}`));
}

const POLICY_IDENTITY_FIELDS = [
  "policyId",
  "dynamicFormTemplateId",
  "stepId",
  "stepCode",
  "actorRole",
] as const;

const POLICY_DECISION_FIELDS = [
  "read",
  "write",
  "required",
  "hidden",
  "locked",
  "lockedAfterSubmit",
] as const;

const FLOW_ACTOR_ROLES = [
  "ISSUER",
  "ASSIGNEE",
  "COORDINATOR",
  "REVIEWER",
  "FINALIZER",
  "*",
] as const;

function decodeFlowFieldPolicy(value: unknown, path: string) {
  const record = responseRecord(value, path);
  POLICY_IDENTITY_FIELDS
    .filter((field) => field !== "actorRole")
    .forEach((field) => {
      responseNullableString(record[field], `${path}.${field}`);
    });
  responseNullableEnum(record.actorRole, `${path}.actorRole`, FLOW_ACTOR_ROLES);
  responseNullableString(record.fieldId, `${path}.fieldId`);
  responseNullableString(record.fieldKey, `${path}.fieldKey`);
  POLICY_DECISION_FIELDS.forEach((field) =>
    responseNullableBoolean(record[field], `${path}.${field}`));
}

function decodeFlowTableColumnPolicy(value: unknown, path: string) {
  const record = responseRecord(value, path);
  POLICY_IDENTITY_FIELDS
    .filter((field) => field !== "actorRole")
    .forEach((field) => {
      responseNullableString(record[field], `${path}.${field}`);
    });
  responseNullableEnum(record.actorRole, `${path}.actorRole`, FLOW_ACTOR_ROLES);
  responseNullableString(record.blockId, `${path}.blockId`);
  responseNullableString(record.columnKey, `${path}.columnKey`);
  POLICY_DECISION_FIELDS.forEach((field) =>
    responseNullableBoolean(record[field], `${path}.${field}`));
}

const MAPPING_ENDPOINT_STRING_FIELDS = [
  "kind",
  "dynamicFormTemplateId",
  "stepId",
  "stepCode",
  "sectionId",
  "sectionCode",
  "fieldId",
  "fieldKey",
  "blockId",
  "columnKey",
  "rowKey",
  "dataType",
] as const;

function decodeFlowMappingEndpoint(value: unknown, path: string) {
  const record = responseRecord(value, path);
  MAPPING_ENDPOINT_STRING_FIELDS
    .filter((field) => field !== "kind")
    .forEach((field) => {
      responseNullableString(record[field], `${path}.${field}`);
    });
  responseNullableEnum(
    record.kind,
    `${path}.kind`,
    ["FIELD", "TABLE_COLUMN", "CONSTANT"],
  );
}

function decodeFlowMappingInput(value: unknown, path: string) {
  const record = responseRecord(value, path);
  responseString(record.inputKey, `${path}.inputKey`);
  decodeFlowMappingEndpoint(record.source, `${path}.source`);
  responseNullableString(record.dataType, `${path}.dataType`);
  responseNullableEnum(record.cardinality, `${path}.cardinality`, ["ONE", "MANY"]);
  responseNullableEnum(
    record.nullPolicy,
    `${path}.nullPolicy`,
    ["KEEP_NULL", "SKIP", "ZERO", "EMPTY_TEXT", "ERROR"],
  );
  responseJsonValue(record.constantValue, `${path}.constantValue`);
}

function decodeFlowMappingCalculation(value: unknown, path: string) {
  const record = responseRecord(value, path);
  for (const field of [
    "operation",
    "resultDataType",
    "functionCode",
  ] as const) {
    responseNullableString(record[field], `${path}.${field}`);
  }
  responseNullableEnum(
    record.kind,
    `${path}.kind`,
    ["DIRECT", "EXPRESSION", "REGISTERED_FUNCTION"],
  );
  responseJsonValue(record.expression, `${path}.expression`);
  responseNullableInteger(record.functionVersion, `${path}.functionVersion`);
  if (record.arguments !== null) {
    const argumentsRecord = responseRecord(record.arguments, `${path}.arguments`);
    Object.entries(argumentsRecord).forEach(([key, argument]) =>
      responseJsonValue(argument, `${path}.arguments.${key}`));
  }
  responseJsonValue(record.defaultValue, `${path}.defaultValue`);
}

function decodeFlowMappingRule(value: unknown, path: string) {
  const record = responseRecord(value, path);
  responseString(record.mappingId, `${path}.mappingId`);
  responseInteger(record.mappingVersion, `${path}.mappingVersion`);
  responseNullableEnum(
    record.mappingKind,
    `${path}.mappingKind`,
    ["FIELD", "TABLE_COLUMN", "APPEND_COLUMNS"],
  );
  if (record.inputs !== null) {
    responseArray(record.inputs, `${path}.inputs`).forEach((input, index) =>
      decodeFlowMappingInput(input, `${path}.inputs[${index}]`));
  }
  if (record.target !== null) {
    decodeFlowMappingEndpoint(record.target, `${path}.target`);
  }
  if (record.calculation !== null) {
    decodeFlowMappingCalculation(record.calculation, `${path}.calculation`);
  }
  responseNullableString(record.conceptCode, `${path}.conceptCode`);
  responseNullableEnum(
    record.evaluationGrain,
    `${path}.evaluationGrain`,
    ["FLOW_INSTANCE", "SOURCE_REPORT", "TABLE_ROW"],
  );
  responseNullableEnum(
    record.errorPolicy,
    `${path}.errorPolicy`,
    ["BLOCK_APPLY", "SKIP_RULE", "USE_DEFAULT"],
  );
}

function decodeDynamicFlowLineage(value: unknown, path: string) {
  const record = responseRecord(value, path);
  responseNullableString(record.originFamilyId, `${path}.originFamilyId`);
  responseNullableString(record.originVersionId, `${path}.originVersionId`);
}

export function decodeDynamicFlowPermissionMetadata(
  value: unknown,
  path = "response",
): DynamicFlowPermissionMetadata {
  const record = responseRecord(value, path);
  responseBoolean(record.canRead, `${path}.canRead`);
  responseBoolean(record.canManage, `${path}.canManage`);
  responseBoolean(record.executeGrant, `${path}.executeGrant`);
  responseBoolean(record.definitionLockable, `${path}.definitionLockable`);
  if (record.executionEligibility !== "BLOCKED_UNTIL_TARGET_PHASE") {
    throw new DynamicFlowResponseContractError(
      `${path}.executionEligibility`,
      "BLOCKED_UNTIL_TARGET_PHASE",
    );
  }
  if (
    record.executionBlockedReason !== null &&
    record.executionBlockedReason !== "TARGET_PHASE_NOT_IMPLEMENTED"
  ) {
    throw new DynamicFlowResponseContractError(
      `${path}.executionBlockedReason`,
      "TARGET_PHASE_NOT_IMPLEMENTED or null",
    );
  }
  if (
    record.blockedUntilPhase !== null &&
    record.blockedUntilPhase !== "P5" &&
    record.blockedUntilPhase !== "P6" &&
    record.blockedUntilPhase !== "P7"
  ) {
    throw new DynamicFlowResponseContractError(
      `${path}.blockedUntilPhase`,
      "P5, P6, P7, or null",
    );
  }
  if (responseBoolean(record.canExecute, `${path}.canExecute`)) {
    throw new DynamicFlowResponseContractError(`${path}.canExecute`, "false during P4");
  }
  return value as DynamicFlowPermissionMetadata;
}

export function hasDynamicFlowPermissionMetadata(
  value: unknown,
): value is DynamicFlowPermissionMetadata {
  try {
    decodeDynamicFlowPermissionMetadata(value);
    return true;
  } catch (error) {
    if (error instanceof DynamicFlowResponseContractError) return false;
    throw error;
  }
}

function requireTrustedDynamicFlowCatalogPin(
  catalogVersion: string,
  catalogSemanticHash: string,
  path: string,
  allowHistoricalCatalog: boolean,
) {
  const isCurrentCatalog =
    catalogVersion === DYNAMIC_FLOW_CATALOG_VERSION &&
    catalogSemanticHash === DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256;
  const historicalHash =
    DYNAMIC_FLOW_HISTORICAL_CATALOG_PINS[
      catalogVersion as keyof typeof DYNAMIC_FLOW_HISTORICAL_CATALOG_PINS
    ];
  const isKnownHistoricalCatalog =
    allowHistoricalCatalog &&
    historicalHash !== undefined &&
    catalogSemanticHash === historicalHash;
  if (isCurrentCatalog || isKnownHistoricalCatalog) return;

  const versionIsKnown =
    catalogVersion === DYNAMIC_FLOW_CATALOG_VERSION ||
    (allowHistoricalCatalog && historicalHash !== undefined);
  throw new DynamicFlowResponseContractError(
    versionIsKnown ? `${path}.catalogSemanticHash` : `${path}.catalogVersion`,
    allowHistoricalCatalog
      ? `${DYNAMIC_FLOW_CATALOG_VERSION}/${DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256} or an exact historical pin`
      : `${DYNAMIC_FLOW_CATALOG_VERSION}/${DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256}`,
  );
}

function decodeDynamicFlowCatalogMetadata(
  value: unknown,
  path: string,
  allowUntrustedMigration = false,
  allowHistoricalCatalog = false,
) {
  const record = responseRecord(value, path);
  if (allowUntrustedMigration) {
    if (record.schemaVersion !== null) responseInteger(record.schemaVersion, `${path}.schemaVersion`);
    if (record.adapterVersion !== null) responseInteger(record.adapterVersion, `${path}.adapterVersion`);
    responseNullableString(record.catalogVersion, `${path}.catalogVersion`);
    responseNullableString(record.catalogSemanticHash, `${path}.catalogSemanticHash`);
    return;
  }
  if (record.schemaVersion !== DYNAMIC_FLOW_DEFINITION_SCHEMA_VERSION) {
    throw new DynamicFlowResponseContractError(`${path}.schemaVersion`, "2");
  }
  responseInteger(record.adapterVersion, `${path}.adapterVersion`);
  const catalogVersion = responseString(record.catalogVersion, `${path}.catalogVersion`);
  const catalogSemanticHash = responseString(
    record.catalogSemanticHash,
    `${path}.catalogSemanticHash`,
  );
  requireTrustedDynamicFlowCatalogPin(
    catalogVersion,
    catalogSemanticHash,
    path,
    allowHistoricalCatalog,
  );
}

export function decodeFlowDefinitionSnapshotV2(
  value: unknown,
  path = "response.payload",
  allowUnpinnedMigration = false,
  allowHistoricalCatalog = false,
): FlowDefinitionSnapshotV2 {
  const record = responseRecord(value, path);
  if (allowUnpinnedMigration) {
    if (record.schemaVersion !== null) responseInteger(record.schemaVersion, `${path}.schemaVersion`);
  } else if (record.schemaVersion !== DYNAMIC_FLOW_DEFINITION_SCHEMA_VERSION) {
    throw new DynamicFlowResponseContractError(`${path}.schemaVersion`, "2");
  }
  responseString(record.archetypeId, `${path}.archetypeId`);
  responseString(record.entryStepId, `${path}.entryStepId`);
  if (allowUnpinnedMigration) {
    responseNullableString(record.catalogVersion, `${path}.catalogVersion`);
    responseNullableString(record.catalogSemanticHash, `${path}.catalogSemanticHash`);
  } else {
    const catalogVersion = responseString(record.catalogVersion, `${path}.catalogVersion`);
    const catalogSemanticHash = responseString(
      record.catalogSemanticHash,
      `${path}.catalogSemanticHash`,
    );
    requireTrustedDynamicFlowCatalogPin(
      catalogVersion,
      catalogSemanticHash,
      path,
      allowHistoricalCatalog,
    );
  }

  responseArray(record.formNodes, `${path}.formNodes`).forEach((item, index) => {
    const form = responseRecord(item, `${path}.formNodes[${index}]`);
    responseString(form.formNodeId, `${path}.formNodes[${index}].formNodeId`);
    if (
      form.role !== "ROOT" &&
      form.role !== "CHILD" &&
      form.role !== "REVIEWER"
    ) {
      throw new DynamicFlowResponseContractError(
        `${path}.formNodes[${index}].role`,
        "ROOT, CHILD, or REVIEWER",
      );
    }
    responseString(
      form.dynamicFormTemplateId,
      `${path}.formNodes[${index}].dynamicFormTemplateId`,
    );
    if (allowUnpinnedMigration) {
      responseNullableString(
        form.dynamicFormFamilyId,
        `${path}.formNodes[${index}].dynamicFormFamilyId`,
      );
      if (form.dynamicFormVersionNo !== null) {
        responseInteger(
          form.dynamicFormVersionNo,
          `${path}.formNodes[${index}].dynamicFormVersionNo`,
        );
      }
      responseNullableString(
        form.dynamicFormSchemaHash,
        `${path}.formNodes[${index}].dynamicFormSchemaHash`,
      );
      responseNullableString(
        form.dynamicFormSnapshotHash,
        `${path}.formNodes[${index}].dynamicFormSnapshotHash`,
      );
    } else {
      responseString(form.dynamicFormFamilyId, `${path}.formNodes[${index}].dynamicFormFamilyId`);
      responseInteger(
        form.dynamicFormVersionNo,
        `${path}.formNodes[${index}].dynamicFormVersionNo`,
      );
      responseString(
        form.dynamicFormSchemaHash,
        `${path}.formNodes[${index}].dynamicFormSchemaHash`,
      );
      responseString(
        form.dynamicFormSnapshotHash,
        `${path}.formNodes[${index}].dynamicFormSnapshotHash`,
      );
    }
  });

  responseArray(record.nodes, `${path}.nodes`).forEach((item, index) => {
    const node = responseRecord(item, `${path}.nodes[${index}]`);
    responseString(node.nodeId, `${path}.nodes[${index}].nodeId`);
    responseString(node.nodeCode, `${path}.nodes[${index}].nodeCode`);
    if (node.nodeKind !== "FORM_STEP" && node.nodeKind !== "GATEWAY" && node.nodeKind !== "FINAL") {
      throw new DynamicFlowResponseContractError(
        `${path}.nodes[${index}].nodeKind`,
        "FORM_STEP, GATEWAY, or FINAL",
      );
    }
  });
  responseArray(record.edges, `${path}.edges`);
  responseArray(record.actorPolicies, `${path}.actorPolicies`);
  responseArray(record.fieldPolicies, `${path}.fieldPolicies`).forEach((policy, index) =>
    decodeFlowFieldPolicy(policy, `${path}.fieldPolicies[${index}]`));
  responseArray(record.tableColumnPolicies, `${path}.tableColumnPolicies`).forEach((policy, index) =>
    decodeFlowTableColumnPolicy(policy, `${path}.tableColumnPolicies[${index}]`));
  responseArray(record.mappingRules, `${path}.mappingRules`).forEach((rule, index) =>
    decodeFlowMappingRule(rule, `${path}.mappingRules[${index}]`));

  for (const ownerField of [
    "resultOwnerStepId",
    "resultOwnerFormNodeId",
    "statisticsOwnerStepId",
    "statisticsOwnerFormNodeId",
  ] as const) {
    responseNullableString(record[ownerField], `${path}.${ownerField}`);
  }
  responseRecord(record.rollbackPolicy, `${path}.rollbackPolicy`);
  responseRecord(record.finalResultPolicy, `${path}.finalResultPolicy`);
  responseRecord(record.statisticProfile, `${path}.statisticProfile`);
  return value as FlowDefinitionSnapshotV2;
}

function decodeDynamicFlowVersionCommon(value: unknown, path: string) {
  const record = responseRecord(value, path);
  responseString(record.id, `${path}.id`);
  responseString(record.templateId, `${path}.templateId`);
  responseString(record.familyId, `${path}.familyId`);
  responseNullableString(record.rootDynamicFormTemplateId, `${path}.rootDynamicFormTemplateId`);
  responseNullableString(record.dynamicFormTemplateId, `${path}.dynamicFormTemplateId`);
  responseInteger(record.versionNo, `${path}.versionNo`);
  if (record.status !== "DRAFT" && record.status !== "LOCKED" && record.status !== "ARCHIVED") {
    throw new DynamicFlowResponseContractError(`${path}.status`, "DRAFT, LOCKED, or ARCHIVED");
  }
  responseInteger(record.draftRevision, `${path}.draftRevision`);
  responseString(record.payloadHash, `${path}.payloadHash`);
  responseNullableEnum(
    record.contributionPolicy,
    `${path}.contributionPolicy`,
    ["EXCLUDE", "INCLUDE"],
  );
  responseNullableString(record.contributionPolicyHash, `${path}.contributionPolicyHash`);
  responseNullableString(record.contributionWarning, `${path}.contributionWarning`);
  responseBoolean(record.isUsed, `${path}.isUsed`);
  decodeDynamicFlowPermissionMetadata(record, path);
  if (record.migrationState !== "CANONICAL" && record.migrationState !== "REQUIRES_REVIEW") {
    throw new DynamicFlowResponseContractError(
      `${path}.migrationState`,
      "CANONICAL or REQUIRES_REVIEW",
    );
  }
  const allowHistoricalCatalog =
    record.migrationState === "CANONICAL" &&
    (record.status === "LOCKED" || record.status === "ARCHIVED");
  decodeDynamicFlowCatalogMetadata(
    record,
    path,
    record.migrationState === "REQUIRES_REVIEW",
    allowHistoricalCatalog,
  );
  decodeDynamicFlowLineage(record.lineage, `${path}.lineage`);
  for (const nullableField of [
    "lockedAtUtc",
    "lockedByUserId",
    "archivedAtUtc",
    "archivedByUserId",
  ] as const) {
    responseNullableString(record[nullableField], `${path}.${nullableField}`);
  }
  responseString(record.createdAtUtc, `${path}.createdAtUtc`);
  responseString(record.updatedAtUtc, `${path}.updatedAtUtc`);
  return record;
}

export function decodeDynamicFlowTemplateVersionDetail(
  value: unknown,
  path = "response",
): DynamicFlowTemplateVersionDetailDto {
  const record = decodeDynamicFlowVersionCommon(value, path);
  const payload = decodeFlowDefinitionSnapshotV2(
    record.payload,
    `${path}.payload`,
    record.status === "DRAFT" || record.migrationState === "REQUIRES_REVIEW",
    record.migrationState === "CANONICAL" &&
      (record.status === "LOCKED" || record.status === "ARCHIVED"),
  );
  if (
    record.migrationState === "CANONICAL" &&
    record.status !== "DRAFT" &&
    (payload.catalogVersion !== record.catalogVersion ||
      payload.catalogSemanticHash !== record.catalogSemanticHash)
  ) {
    throw new DynamicFlowResponseContractError(
      `${path}.payload.catalogVersion`,
      "the exact version-level catalog pin",
    );
  }
  return value as DynamicFlowTemplateVersionDetailDto;
}

export function decodeDynamicFlowTemplateVersionSummary(
  value: unknown,
  path = "response",
): DynamicFlowTemplateVersionSummaryDto {
  decodeDynamicFlowVersionCommon(value, path);
  return value as DynamicFlowTemplateVersionSummaryDto;
}

export function decodeDynamicFlowTemplateFamily(
  value: unknown,
  path = "response",
): DynamicFlowTemplateFamilyDto {
  const record = responseRecord(value, path);
  responseString(record.id, `${path}.id`);
  responseString(record.familyId, `${path}.familyId`);
  responseString(record.code, `${path}.code`);
  responseString(record.name, `${path}.name`);
  responseNullableString(record.description, `${path}.description`);
  responseNullableString(record.rootDynamicFormTemplateId, `${path}.rootDynamicFormTemplateId`);
  responseNullableString(record.dynamicFormTemplateId, `${path}.dynamicFormTemplateId`);
  if (record.status !== "DRAFT" && record.status !== "ACTIVE" && record.status !== "ARCHIVED") {
    throw new DynamicFlowResponseContractError(`${path}.status`, "DRAFT, ACTIVE, or ARCHIVED");
  }
  responseInteger(record.familyRevision, `${path}.familyRevision`);
  responseNullableString(record.ownerUserId, `${path}.ownerUserId`);
  responseNullableString(record.ownerUnitId, `${path}.ownerUnitId`);
  decodeDynamicFlowPermissionMetadata(record, path);
  decodeDynamicFlowLineage(record.lineage, `${path}.lineage`);
  responseNullableString(record.currentVersionId, `${path}.currentVersionId`);
  if (record.currentVersionNo !== null) {
    responseInteger(record.currentVersionNo, `${path}.currentVersionNo`);
  }
  responseNullableString(record.currentVersionHash, `${path}.currentVersionHash`);
  if (record.currentVersion !== null) {
    decodeDynamicFlowTemplateVersionDetail(record.currentVersion, `${path}.currentVersion`);
  }
  if (record.draftVersion !== null) {
    decodeDynamicFlowTemplateVersionDetail(record.draftVersion, `${path}.draftVersion`);
  }
  responseArray(record.versions, `${path}.versions`).forEach((item, index) =>
    decodeDynamicFlowTemplateVersionSummary(item, `${path}.versions[${index}]`),
  );
  responseBoolean(record.hasLockedVersion, `${path}.hasLockedVersion`);
  for (const nullableField of ["archivedAtUtc", "archivedByUserId"] as const) {
    responseNullableString(record[nullableField], `${path}.${nullableField}`);
  }
  responseBoolean(record.isDeleted, `${path}.isDeleted`);
  responseString(record.createdAtUtc, `${path}.createdAtUtc`);
  responseString(record.updatedAtUtc, `${path}.updatedAtUtc`);
  return value as DynamicFlowTemplateFamilyDto;
}

export function decodeDynamicFlowTemplateFamilyPage(
  value: unknown,
): PagedResult<DynamicFlowTemplateFamilyDto> {
  const record = responseRecord(value, "response");
  responseInteger(record.totalRows, "response.totalRows");
  responseInteger(record.page, "response.page");
  responseInteger(record.pageSize, "response.pageSize");
  responseArray(record.rows, "response.rows").forEach((row, index) =>
    decodeDynamicFlowTemplateFamily(row, `response.rows[${index}]`),
  );
  return value as PagedResult<DynamicFlowTemplateFamilyDto>;
}

export function decodeDynamicFlowTemplateDiff(value: unknown): DynamicFlowTemplateDiffDto {
  const record = responseRecord(value, "response");
  responseString(record.familyId, "response.familyId");
  responseString(record.fromVersionId, "response.fromVersionId");
  responseString(record.toVersionId, "response.toVersionId");
  responseString(record.fromPayloadHash, "response.fromPayloadHash");
  responseString(record.toPayloadHash, "response.toPayloadHash");
  responseArray(record.operations, "response.operations").forEach((item, index) => {
    const operation = responseRecord(item, `response.operations[${index}]`);
    if (operation.op !== "ADD" && operation.op !== "REMOVE" && operation.op !== "REPLACE") {
      throw new DynamicFlowResponseContractError(
        `response.operations[${index}].op`,
        "ADD, REMOVE, or REPLACE",
      );
    }
    responseString(operation.path, `response.operations[${index}].path`);
  });
  return value as DynamicFlowTemplateDiffDto;
}

export const dynamicFlowTemplateApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    searchDynamicFlowTemplates: b.mutation<
      PagedResult<DynamicFlowTemplateDto>,
      DynamicFlowTemplateSearchRequest
    >({
      query: (data) => ({
        url: "/dynamic-flow-templates/search",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicFlowTemplate", id: "SEARCH" }],
    }),

    getDynamicFlowTemplate: b.query<DynamicFlowTemplateDto, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-flow-templates/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [{ type: "DynamicFlowTemplate", id: arg.id }],
    }),

    createDynamicFlowTemplate: b.mutation<
      DynamicFlowTemplateDto,
      CreateDynamicFlowTemplateRequest
    >({
      query: (data) => ({
        url: "/dynamic-flow-templates",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicFlowTemplate", id: "SEARCH" }],
    }),

    updateDynamicFlowTemplate: b.mutation<
      DynamicFlowTemplateDto,
      { id: string; body: UpdateDynamicFlowTemplateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-flow-templates/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicFlowTemplate", id: "SEARCH" },
        { type: "DynamicFlowTemplate", id: arg.id },
      ],
    }),

    saveDynamicFlowTemplateVersionDraft: b.mutation<
      DynamicFlowTemplateVersionDto,
      { id: string; body: SaveDynamicFlowTemplateVersionDraftRequest }
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-flow-templates/${id}/versions/draft`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicFlowTemplate", id: "SEARCH" },
        { type: "DynamicFlowTemplate", id: arg.id },
      ],
    }),

    lockDynamicFlowTemplateVersion: b.mutation<
      DynamicFlowTemplateVersionDto,
      { versionId: string; body?: LockDynamicFlowTemplateVersionRequest }
    >({
      query: ({ versionId, body }) => ({
        url: `/dynamic-flow-templates/versions/${versionId}/lock`,
        method: "POST",
        data: body ?? {},
      }),
      invalidatesTags: [{ type: "DynamicFlowTemplate", id: "SEARCH" }],
    }),

    searchDynamicFlowTemplateFamilies: b.mutation<
      PagedResult<DynamicFlowTemplateFamilyDto>,
      SearchDynamicFlowTemplateFamiliesRequest
    >({
      query: (data) => ({
        url: "/dynamic-flow-templates/search",
        method: "POST",
        data,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateFamilyPage(response),
    }),

    getDynamicFlowTemplateFamily: b.query<
      DynamicFlowTemplateFamilyDto,
      { familyId: string }
    >({
      query: ({ familyId }) => ({
        url: `/dynamic-flow-templates/${familyId}`,
        method: "GET",
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateFamily(response),
      providesTags: (_result, _error, { familyId }) => [
        { type: "DynamicFlowTemplate", id: familyId },
      ],
    }),

    createDynamicFlowTemplateFamily: b.mutation<
      DynamicFlowTemplateFamilyDto,
      CreateDynamicFlowTemplateFamilyRequest
    >({
      query: (data) => ({
        url: "/dynamic-flow-templates",
        method: "POST",
        data,
        headers: { "Idempotency-Key": data.commandId },
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateFamily(response),
      invalidatesTags: (result) =>
        result ? [{ type: "DynamicFlowTemplate", id: "SEARCH" }] : [],
    }),

    updateDynamicFlowTemplateFamily: b.mutation<
      DynamicFlowTemplateFamilyDto,
      { familyId: string; body: UpdateDynamicFlowTemplateFamilyRequest }
    >({
      query: ({ familyId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}`,
        method: "PUT",
        data: body,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateFamily(response),
      invalidatesTags: (result, _error, { familyId }) =>
        result
          ? [
              { type: "DynamicFlowTemplate" as const, id: "SEARCH" },
              { type: "DynamicFlowTemplate" as const, id: familyId },
            ]
          : [],
    }),

    deleteDynamicFlowTemplateFamily: b.mutation<
      void,
      { familyId: string; body: DynamicFlowFamilyRevisionCommand }
    >({
      query: ({ familyId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}`,
        method: "DELETE",
        data: body,
      }),
      invalidatesTags: (_result, error, { familyId }) =>
        error
          ? []
          : [
              { type: "DynamicFlowTemplate" as const, id: "SEARCH" },
              { type: "DynamicFlowTemplate" as const, id: familyId },
            ],
    }),

    archiveDynamicFlowTemplateFamily: b.mutation<
      DynamicFlowTemplateFamilyDto,
      { familyId: string; body: DynamicFlowFamilyRevisionCommand }
    >({
      query: ({ familyId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}/archive`,
        method: "POST",
        data: body,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateFamily(response),
      invalidatesTags: (result, _error, { familyId }) =>
        result
          ? [
              { type: "DynamicFlowTemplate" as const, id: "SEARCH" },
              { type: "DynamicFlowTemplate" as const, id: familyId },
            ]
          : [],
    }),

    cloneDynamicFlowTemplateFamily: b.mutation<
      DynamicFlowTemplateFamilyDto,
      { familyId: string; body: CloneDynamicFlowTemplateFamilyRequest }
    >({
      query: ({ familyId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}/clone`,
        method: "POST",
        data: body,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateFamily(response),
      invalidatesTags: (result) =>
        result ? [{ type: "DynamicFlowTemplate", id: "SEARCH" }] : [],
    }),

    listDynamicFlowTemplateVersions: b.query<
      DynamicFlowTemplateVersionSummaryDto[],
      { familyId: string }
    >({
      query: ({ familyId }) => ({
        url: `/dynamic-flow-templates/${familyId}/versions`,
        method: "GET",
      }),
      transformResponse: (response: unknown) =>
        responseArray(response, "response").map((version, index) =>
          decodeDynamicFlowTemplateVersionSummary(version, `response[${index}]`),
        ),
      providesTags: (_result, _error, { familyId }) => [
        { type: "DynamicFlowTemplate", id: `${familyId}:VERSIONS` },
      ],
    }),

    getDynamicFlowTemplateVersion: b.query<
      DynamicFlowTemplateVersionDetailDto,
      { familyId: string; versionId: string }
    >({
      query: ({ familyId, versionId }) => ({
        url: `/dynamic-flow-templates/${familyId}/versions/${versionId}`,
        method: "GET",
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateVersionDetail(response),
      providesTags: (_result, _error, { familyId, versionId }) => [
        { type: "DynamicFlowTemplate", id: `${familyId}:${versionId}` },
      ],
    }),

    saveDynamicFlowTemplateVersionDraftP4: b.mutation<
      DynamicFlowTemplateVersionDetailDto,
      { familyId: string; versionId: string; body: SaveDynamicFlowTemplateDraftP4Request }
    >({
      query: ({ familyId, versionId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}/versions/${versionId}/draft`,
        method: "PUT",
        data: body,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateVersionDetail(response),
      invalidatesTags: (result, _error, { familyId, versionId }) =>
        result
          ? [
              { type: "DynamicFlowTemplate" as const, id: "SEARCH" },
              { type: "DynamicFlowTemplate" as const, id: familyId },
              { type: "DynamicFlowTemplate" as const, id: `${familyId}:VERSIONS` },
              { type: "DynamicFlowTemplate" as const, id: `${familyId}:${versionId}` },
            ]
          : [],
    }),

    lockDynamicFlowTemplateVersionP4: b.mutation<
      DynamicFlowTemplateVersionDetailDto,
      { familyId: string; versionId: string; body: LockDynamicFlowTemplateVersionP4Request }
    >({
      query: ({ familyId, versionId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}/versions/${versionId}/lock`,
        method: "POST",
        data: body,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateVersionDetail(response),
      invalidatesTags: (result, _error, { familyId, versionId }) =>
        result
          ? [
              { type: "DynamicFlowTemplate" as const, id: "SEARCH" },
              { type: "DynamicFlowTemplate" as const, id: familyId },
              { type: "DynamicFlowTemplate" as const, id: `${familyId}:VERSIONS` },
              { type: "DynamicFlowTemplate" as const, id: `${familyId}:${versionId}` },
            ]
          : [],
    }),

    reopenDynamicFlowTemplateVersion: b.mutation<
      DynamicFlowTemplateVersionDetailDto,
      { familyId: string; versionId: string; body: DynamicFlowFamilyRevisionCommand }
    >({
      query: ({ familyId, versionId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}/versions/${versionId}/reopen`,
        method: "POST",
        data: body,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateVersionDetail(response),
      invalidatesTags: (result, _error, { familyId, versionId }) =>
        result
          ? [
              { type: "DynamicFlowTemplate" as const, id: "SEARCH" },
              { type: "DynamicFlowTemplate" as const, id: familyId },
              { type: "DynamicFlowTemplate" as const, id: `${familyId}:VERSIONS` },
              { type: "DynamicFlowTemplate" as const, id: `${familyId}:${versionId}` },
            ]
          : [],
    }),

    diffDynamicFlowTemplateVersions: b.mutation<
      DynamicFlowTemplateDiffDto,
      { familyId: string; body: DiffDynamicFlowTemplateVersionsRequest }
    >({
      query: ({ familyId, body }) => ({
        url: `/dynamic-flow-templates/${familyId}/versions/diff`,
        method: "POST",
        data: body,
      }),
      transformResponse: (response: unknown) => decodeDynamicFlowTemplateDiff(response),
    }),
  }),
});

export const {
  useSearchDynamicFlowTemplatesMutation,
  useLazyGetDynamicFlowTemplateQuery,
  useCreateDynamicFlowTemplateMutation,
  useUpdateDynamicFlowTemplateMutation,
  useSaveDynamicFlowTemplateVersionDraftMutation,
  useLockDynamicFlowTemplateVersionMutation,
  useSearchDynamicFlowTemplateFamiliesMutation,
  useGetDynamicFlowTemplateFamilyQuery,
  useLazyGetDynamicFlowTemplateFamilyQuery,
  useCreateDynamicFlowTemplateFamilyMutation,
  useUpdateDynamicFlowTemplateFamilyMutation,
  useDeleteDynamicFlowTemplateFamilyMutation,
  useArchiveDynamicFlowTemplateFamilyMutation,
  useCloneDynamicFlowTemplateFamilyMutation,
  useListDynamicFlowTemplateVersionsQuery,
  useLazyListDynamicFlowTemplateVersionsQuery,
  useGetDynamicFlowTemplateVersionQuery,
  useLazyGetDynamicFlowTemplateVersionQuery,
  useSaveDynamicFlowTemplateVersionDraftP4Mutation,
  useLockDynamicFlowTemplateVersionP4Mutation,
  useReopenDynamicFlowTemplateVersionMutation,
  useDiffDynamicFlowTemplateVersionsMutation,
} = dynamicFlowTemplateApi;
