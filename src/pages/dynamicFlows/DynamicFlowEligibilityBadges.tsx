import { Chip, Stack } from "@mui/material";

import type { DynamicFlowPermissionMetadata } from "../../api/dynamicFlowTemplateApi";

export function DynamicFlowEligibilityBadges({
  metadata,
}: {
  metadata: DynamicFlowPermissionMetadata;
}) {
  const blockedLabel = metadata.blockedUntilPhase
    ? `Thực thi bị chặn đến ${metadata.blockedUntilPhase}`
    : "Thực thi bị chặn";

  return (
    <Stack
      direction="row"
      gap={0.75}
      flexWrap="wrap"
      data-testid="dynamic-flow-permission-badges"
    >
      <Chip
        size="small"
        color={metadata.canRead ? "success" : "default"}
        variant="outlined"
        label={metadata.canRead ? "Có quyền xem" : "Không có quyền xem"}
      />
      <Chip
        size="small"
        color={metadata.canManage ? "success" : "default"}
        variant="outlined"
        label={metadata.canManage ? "Có quyền quản lý" : "Chỉ đọc"}
      />
      <Chip
        size="small"
        color={metadata.executeGrant ? "info" : "default"}
        variant="outlined"
        label={metadata.executeGrant ? "Có cấp quyền thực thi" : "Chưa có cấp quyền thực thi"}
      />
      <Chip
        size="small"
        color={metadata.definitionLockable ? "success" : "default"}
        variant="outlined"
        label={metadata.definitionLockable ? "Snapshot khóa đã được xác nhận" : "Khóa sẽ được backend kiểm tra"}
      />
      <Chip size="small" color="warning" label={blockedLabel} />
    </Stack>
  );
}
