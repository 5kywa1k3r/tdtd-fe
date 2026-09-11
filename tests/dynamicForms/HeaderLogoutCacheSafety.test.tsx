import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/components/notifications/NotificationBell", () => ({
  default: () => null,
}));

import { baseApi } from "../../src/api/base/baseApi";
import {
  dynamicFormApi,
  type DynamicFormDetail,
} from "../../src/api/dynamicFormApi";
import { UITextKey, uiText } from "../../src/constants/uiText";
import { useAppSelector } from "../../src/hooks";
import { Header } from "../../src/layouts/Header";
import { AuthEventBoundary } from "../../src/routes/appRoutes";
import authReducer, { setAuthenticated } from "../../src/stores/authSlice";
import {
  getMeSnapshot,
  getTokenFromStorage,
  setMeSnapshot,
  setTokenToActiveStorage,
} from "../../src/stores/authStorage";
import { ThemeProviderCustom } from "../../src/theme/ThemeProviderCustom";
import { performLogout } from "../../src/utils/AuthEvents";

const FORM_ID = "owner-sensitive-form";
const SENSITIVE_FORM: DynamicFormDetail = {
  id: FORM_ID,
  code: "DF-OWNER-SECRET",
  name: "Biểu mẫu chỉ chủ sở hữu được xem",
  description: null,
  tagCodes: [],
  schemaVersion: 1,
  versionNo: 1,
  familyId: FORM_ID,
  previousVersionId: null,
  clonedFromVersionId: null,
  lineageStatus: "ROOT",
  revision: 1,
  isActive: true,
  isPublished: false,
  createdByUserId: "owner-1",
  createdByUsername: "owner",
  createdAtUtc: "2026-07-22T00:00:00Z",
  updatedAtUtc: "2026-07-22T00:00:00Z",
  canMutate: true,
  canClone: true,
  canViewByCloneGrant: false,
  publishedSchemaHash: null,
  actions: {
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canPublish: true,
    canCreateVersion: false,
    canViewHistory: true,
    canClone: true,
    canImport: true,
    canUpdateStatistics: true,
  },
  schema: { sections: [], fields: [], blocks: [] },
  sectionsJson: "[]",
  fieldsJson: "[]",
  excelBlockJson: null,
  blocksJson: "[]",
  excelBlockDynamicExcelTemplateId: null,
  publishedSchemaSnapshotJson: null,
};

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

async function seedOwnerSession(store: ReturnType<typeof makeStore>) {
  setTokenToActiveStorage("owner-token");
  setMeSnapshot({
    id: "owner-1",
    username: "owner",
    fullName: "Owner",
    roles: [],
  });
  store.dispatch(setAuthenticated(true));
  await store.dispatch(
    dynamicFormApi.util.upsertQueryData(
      "getDynamicForm",
      { id: FORM_ID },
      SENSITIVE_FORM,
    ),
  );
}

function cachedSensitiveForm(store: ReturnType<typeof makeStore>) {
  return dynamicFormApi.endpoints.getDynamicForm.select({ id: FORM_ID })(
    store.getState(),
  ).data;
}

function renderLogoutHarness(
  store: ReturnType<typeof makeStore>,
  content: React.ReactNode,
) {
  return render(
    <Provider store={store}>
      <ThemeProviderCustom>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<AuthEventBoundary />}>
              <Route path="/" element={content} />
              <Route path="/login" element={<LoginCacheProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProviderCustom>
    </Provider>,
  );
}

async function expectSessionAndCacheCleared(store: ReturnType<typeof makeStore>) {
  await screen.findByText("No owner cache");
  await waitFor(() => {
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(cachedSensitiveForm(store)).toBeUndefined();
    expect(getTokenFromStorage()).toBeNull();
    expect(getMeSnapshot()).toBeNull();
  });
}

function LoginCacheProbe() {
  const cachedOwnerForm = useAppSelector((state) =>
    dynamicFormApi.endpoints.getDynamicForm.select({ id: FORM_ID })(state),
  ).data;
  return <div>{cachedOwnerForm?.name ?? "No owner cache"}</div>;
}

function BootstrapUnauthorized() {
  useEffect(() => {
    performLogout();
  }, []);
  return <div>Authenticating existing session</div>;
}

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("account handoff cache safety", () => {
  it("clears owner RTK Query data when logout is initiated from Header", async () => {
    const store = makeStore();
    await seedOwnerSession(store);
    expect(cachedSensitiveForm(store)?.code).toBe("DF-OWNER-SECRET");

    renderLogoutHarness(store, <Header />);
    fireEvent.click(
      screen.getByRole("button", { name: "Mở menu tài khoản" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: uiText(UITextKey.TextDangXuat),
      }),
    );

    await expectSessionAndCacheCleared(store);
  });

  it("clears owner cache when bootstrap /me returns 401 before MainLayout mounts", async () => {
    const store = makeStore();
    await seedOwnerSession(store);
    expect(cachedSensitiveForm(store)?.name).toBe(
      "Biểu mẫu chỉ chủ sở hữu được xem",
    );

    renderLogoutHarness(store, <BootstrapUnauthorized />);

    await expectSessionAndCacheCleared(store);
    act(() => {
      setTokenToActiveStorage("outsider-token");
      store.dispatch(setAuthenticated(true));
    });
    expect(screen.getByText("No owner cache")).toBeInTheDocument();
    expect(cachedSensitiveForm(store)).toBeUndefined();
  });

  it("mounts exactly one listener at route root and none inside MainLayout", () => {
    const appRoutesSource = readFileSync(
      path.resolve(process.cwd(), "src/routes/appRoutes.tsx"),
      "utf8",
    );
    const mainLayoutSource = readFileSync(
      path.resolve(process.cwd(), "src/layouts/MainLayout.tsx"),
      "utf8",
    );
    expect(appRoutesSource.match(/<AuthListener\s*\/>/g) ?? []).toHaveLength(1);
    expect(appRoutesSource.match(/element:\s*<AuthEventBoundary\s*\/>/g) ?? [])
      .toHaveLength(1);
    expect(mainLayoutSource.match(/<AuthListener\s*\/>/g) ?? []).toHaveLength(0);
  });
});
