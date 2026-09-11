import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  UsersTable,
  type AdminUserRow,
} from "../../src/components/admin/UsersTable";

const manager: AdminUserRow = {
  id: "manager-01",
  username: "reviewer-manager",
  fullName: "Reviewer Manager",
  unitId: "unit-01",
  unitShortName: "Unit 01",
  unitSymbol: "U01",
  unitCode: "U01",
  positionCode: "SPECIALIST",
  positionName: "Specialist",
  isDeleted: false,
  roles: ["MANAGER_LEVEL"],
};

function renderTable(meRoles: string[], row: AdminUserRow = manager) {
  render(
    <UsersTable
      rows={[row]}
      canUpdate
      canDelete
      meId="owner-01"
      meRoles={meRoles}
      page={0}
      pageSize={10}
      totalRows={1}
      sortField="username"
      sortDirection="asc"
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onSortChange={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onResetPassword={vi.fn()}
    />,
  );
}

describe("P11 UsersTable role precedence", () => {
  it("allows a dual-role SYSTEM_ADMIN owner to disable a MANAGER_LEVEL reviewer", () => {
    renderTable(["ADMIN", "SYSTEM_ADMIN"]);

    expect(screen.getByRole("button", {
      name: "Ngừng dùng người dùng reviewer-manager",
    })).toBeEnabled();
  });

  it("preserves ADMIN-only row authorization semantics", () => {
    renderTable(["ADMIN"]);
    expect(screen.getByRole("button", {
      name: "Ngừng dùng người dùng reviewer-manager",
    })).toBeDisabled();

    const systemAdmin = {
      ...manager,
      id: "system-admin-02",
      username: "other-system-admin",
      roles: ["SYSTEM_ADMIN"],
    };
    renderTable(["ADMIN"], systemAdmin);
    expect(screen.getByRole("button", {
      name: "Ngừng dùng người dùng other-system-admin",
    })).toBeEnabled();
  });
});
