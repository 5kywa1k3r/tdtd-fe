import { CssBaseline, Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import type {
  DynamicFormActionCapabilities,
  DynamicFormRow,
} from "../../src/api/dynamicFormApi";
import { DynamicFormListStatePanel } from "../../src/features/dynamicForms/components/DynamicFormListStatePanel";
import { DynamicFormListTable } from "../../src/features/dynamicForms/components/DynamicFormListTable";
import { ThemeProviderCustom } from "../../src/theme/ThemeProviderCustom";

type FixtureState = "list" | "loading" | "empty" | "forbidden" | "error";

const actions = (
  overrides: Partial<DynamicFormActionCapabilities> = {},
): DynamicFormActionCapabilities => ({
  canRead: true,
  canUpdate: true,
  canDelete: true,
  canPublish: true,
  canCreateVersion: false,
  canViewHistory: true,
  canClone: true,
  canImport: true,
  canUpdateStatistics: true,
  ...overrides,
});

const rows: DynamicFormRow[] = [
  {
    id: "draft-owner",
    code: "FORM_OWNER_DRAFT",
    name: "Biểu mẫu dự thảo của chủ sở hữu",
    tagCodes: ["NOI_BO"],
    schemaVersion: 1,
    versionNo: 2,
    familyId: "family-owner",
    previousVersionId: "owner-v1",
    clonedFromVersionId: null,
    lineageStatus: "VERSION",
    revision: 1,
    isActive: true,
    isPublished: false,
    createdByUserId: "owner-1",
    createdByUsername: "owner",
    createdAtUtc: "2026-07-21T08:00:00.000Z",
    canMutate: true,
    canClone: true,
    canViewByCloneGrant: false,
    publishedSchemaHash: null,
    actions: actions(),
  },
  {
    id: "published-owner",
    code: "FORM_PUBLISHED",
    name: "Biểu mẫu đã công bố",
    tagCodes: ["BAO_CAO"],
    schemaVersion: 1,
    versionNo: 4,
    familyId: "family-published",
    previousVersionId: "published-v3",
    clonedFromVersionId: null,
    lineageStatus: "VERSION",
    revision: 1,
    isActive: true,
    isPublished: true,
    createdByUserId: "owner-1",
    createdByUsername: "owner",
    createdAtUtc: "2026-07-20T08:00:00.000Z",
    canMutate: true,
    canClone: true,
    canViewByCloneGrant: false,
    publishedSchemaHash: "e2a4b19bcbdd43baed2a4b19bcbdd43baed2a4b19bcbdd43baed2a4b19bcbd",
    actions: actions({
      canUpdate: false,
      canDelete: false,
      canPublish: false,
      canCreateVersion: true,
      canImport: false,
    }),
  },
  {
    id: "clone-grant",
    code: "FORM_CLONE_GRANT",
    name: "Biểu mẫu được cấp quyền sao chép",
    tagCodes: [],
    schemaVersion: 1,
    versionNo: 1,
    familyId: "family-clone-grant",
    previousVersionId: null,
    clonedFromVersionId: "source-version",
    lineageStatus: "CLONE",
    revision: 1,
    isActive: true,
    isPublished: false,
    createdByUserId: "owner-2",
    createdByUsername: "other-owner",
    createdAtUtc: "2026-07-19T08:00:00.000Z",
    canMutate: false,
    canClone: true,
    canViewByCloneGrant: true,
    publishedSchemaHash: null,
    actions: actions({
      canUpdate: false,
      canDelete: false,
      canPublish: false,
      canCreateVersion: false,
      canViewHistory: false,
      canImport: false,
      canUpdateStatistics: false,
    }),
  },
];

const noop = () => undefined;

function readFixtureState(): FixtureState {
  const candidate = new URLSearchParams(window.location.search).get("state");
  return candidate === "loading" ||
    candidate === "empty" ||
    candidate === "forbidden" ||
    candidate === "error"
    ? candidate
    : "list";
}

function Fixture() {
  const state = readFixtureState();
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    document.documentElement.dataset.retryCount = String(retryCount);
  }, [retryCount]);

  return (
    <ThemeProviderCustom>
      <CssBaseline />
      <Stack spacing={2} sx={{ p: { xs: 1, md: 3 } }} data-ui-fixture="dynamic-form-list">
        <div>
          <Typography variant="h5" component="h1">
            Biểu mẫu động
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fixture rà bố cục, trạng thái tải và quyền thao tác của danh sách biểu mẫu.
          </Typography>
        </div>

        {state === "list" ? (
          <DynamicFormListTable
            rows={rows}
            total={rows.length}
            page={0}
            pageSize={10}
            onPageChange={noop}
            onPageSizeChange={noop}
            sortField="createdAtUtc"
            sortDirection="desc"
            onSortChange={noop}
            onPreview={noop}
            onView={noop}
            onEdit={noop}
            onPublish={noop}
            onClone={noop}
            onDelete={noop}
          />
        ) : (
          <DynamicFormListStatePanel
            state={state}
            onRetry={state === "error" || state === "forbidden" ? () => setRetryCount((value) => value + 1) : undefined}
          />
        )}
      </Stack>
    </ThemeProviderCustom>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Fixture />
  </React.StrictMode>,
);
