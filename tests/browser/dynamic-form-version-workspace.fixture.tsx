import { Button, CssBaseline, Stack, Tooltip, Typography } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";

import type {
  DynamicFormActionCapabilities,
  DynamicFormRow,
  DynamicFormVersionHistoryResp,
} from "../../src/api/dynamicFormApi";
import DynamicFormVersionHistoryPanel from "../../src/features/dynamicForms/components/DynamicFormVersionHistoryPanel";
import DynamicFormVersionStrip from "../../src/features/dynamicForms/components/DynamicFormVersionStrip";
import { ThemeProviderCustom } from "../../src/theme/ThemeProviderCustom";

const capabilities = (
  overrides: Partial<DynamicFormActionCapabilities> = {},
): DynamicFormActionCapabilities => ({
  canRead: true,
  canUpdate: false,
  canDelete: false,
  canPublish: false,
  canCreateVersion: true,
  canViewHistory: true,
  canClone: true,
  canImport: false,
  canUpdateStatistics: true,
  ...overrides,
});

const version = (overrides: Partial<DynamicFormRow> = {}): DynamicFormRow => ({
  id: "form-v3",
  code: "FORM_TONG_HOP_2026",
  name: "Biểu mẫu tổng hợp kết quả thực hiện nhiệm vụ",
  description: null,
  tagCodes: ["BAO_CAO"],
  schemaVersion: 3,
  versionNo: 3,
  familyId: "family-4e9a-8db0-2026",
  previousVersionId: "form-v2-long-identity",
  clonedFromVersionId: null,
  lineageStatus: "VERSION",
  revision: 7,
  isActive: true,
  isPublished: true,
  createdByUserId: "owner-1",
  createdByUsername: "nguyen.van.a",
  createdAtUtc: "2026-07-22T01:30:00Z",
  canMutate: true,
  canClone: true,
  canViewByCloneGrant: false,
  publishedSchemaHash: "ad9b1b5f34b8c009619c21698914071cd52ef7a82c18b5424ad8f6e5f011dc42",
  actions: capabilities(),
  ...overrides,
});

const current = version();

type FixtureState = "eligible" | "newer-draft" | "no-create-capability";

function readFixtureState(): FixtureState {
  const candidate = new URLSearchParams(window.location.search).get("state");
  return candidate === "newer-draft" || candidate === "no-create-capability"
    ? candidate
    : "eligible";
}

function buildHistory(
  selectedCurrent: DynamicFormRow,
  state: FixtureState,
): DynamicFormVersionHistoryResp {
  const earlierVersions = [
    version({
      id: "form-v2",
      versionNo: 2,
      name: "Biểu mẫu tổng hợp kết quả – bản đã công bố trước",
      previousVersionId: "form-v1",
      publishedSchemaHash: "5fc21cb97aeb6d7a909f82d1aef25575",
      createdAtUtc: "2026-06-15T03:15:00Z",
    }),
    version({
      id: "form-v1-hidden",
      versionNo: 1,
      name: "Phiên bản lịch sử không được cấp quyền đọc",
      previousVersionId: null,
      publishedSchemaHash: "921b530bc789e3f0",
      createdAtUtc: "2026-05-01T08:00:00Z",
      actions: capabilities({ canRead: false }),
    }),
  ];
  const versions =
    state === "newer-draft"
      ? [
          version({
            id: "form-v4-draft",
            versionNo: 4,
            name: "Bản nháp kế tiếp đang chờ hoàn thiện",
            previousVersionId: selectedCurrent.id,
            publishedSchemaHash: null,
            isPublished: false,
            revision: 1,
            createdAtUtc: "2026-07-22T02:00:00Z",
            actions: capabilities({
              canUpdate: true,
              canDelete: true,
              canPublish: true,
              canCreateVersion: false,
              canImport: true,
            }),
          }),
          selectedCurrent,
          ...earlierVersions,
        ]
      : [selectedCurrent, ...earlierVersions];

  return {
    familyId: selectedCurrent.familyId,
    code: selectedCurrent.code,
    versions,
  };
}

function Fixture() {
  const state = readFixtureState();
  const selectedCurrent =
    state === "no-create-capability"
      ? version({ actions: capabilities({ canCreateVersion: false }) })
      : current;
  const history = buildHistory(selectedCurrent, state);
  const latestVersion = history.versions[0];
  const canCreateFromCurrent =
    selectedCurrent.actions.canCreateVersion &&
    latestVersion.id === selectedCurrent.id &&
    latestVersion.isPublished;

  return (
    <ThemeProviderCustom>
      <CssBaseline />
      <Stack
        spacing={1.5}
        sx={{ p: { xs: 1, sm: 2, lg: 3 }, maxWidth: 1440, mx: "auto", minWidth: 0 }}
        data-ui-fixture="dynamic-form-version-workspace"
        data-fixture-state={state}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
        >
          <div>
            <Typography variant="h5" component="h1" fontWeight={850}>
              Không gian phiên bản biểu mẫu
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phân biệt phiên bản kế tiếp với bản sao độc lập và giữ thao tác theo capability.
            </Typography>
          </div>
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            {selectedCurrent.actions.canUpdateStatistics && (
              <Button variant="outlined">Cập nhật thống kê</Button>
            )}
            {selectedCurrent.actions.canClone && (
              <Button variant="outlined">Sao chép thành biểu mẫu mới</Button>
            )}
            {selectedCurrent.actions.canCreateVersion && (
              <Tooltip
                title={
                  canCreateFromCurrent
                    ? ""
                    : "Đã có bản nháp kế tiếp; chỉ phiên bản công bố mới nhất được tạo phiên bản mới."
                }
              >
                <span>
                  <Button variant="contained" disabled={!canCreateFromCurrent}>
                    Tạo phiên bản mới
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        <DynamicFormVersionStrip form={selectedCurrent} />
        <DynamicFormVersionHistoryPanel
          history={history}
          currentVersionId={selectedCurrent.id}
          onOpenVersion={() => undefined}
        />
      </Stack>
    </ThemeProviderCustom>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Fixture />
  </React.StrictMode>,
);
