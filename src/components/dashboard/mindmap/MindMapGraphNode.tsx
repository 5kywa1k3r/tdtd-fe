import { memo, type MouseEvent } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import RemoveIcon from "@mui/icons-material/Remove";
import { Handle, Position, type NodeProps } from "reactflow";

import type {
  DashboardMindMapBucket,
  DashboardMindMapNodeDto,
  DashboardMindMapTemplateUserDto,
  DashboardStackedBarDto,
} from "../../../types/dashboardMindMap";
import type { SummaryAnchorPosition } from "./AssignmentMindNode";
import { UITextKey, uiText } from '../../../constants/uiText';

export type MindMapNodeKind = "work" | "assignment" | "template" | "user" | "report" | "loadMore" | "empty";
export type AssignmentBranchKind = "assignments" | "reports";

export type MindMapGraphChip = {
  label: string;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info";
  variant?: "filled" | "outlined";
};

export type MindMapStatusAccent = {
  color: string;
  background: string;
};

export type UserReportFilters = {
  statusBuckets: DashboardMindMapBucket[];
  fromDate: string;
  toDate: string;
};

export type MindMapGraphNodeData = {
  kind: MindMapNodeKind;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  chips?: MindMapGraphChip[];
  expanded?: boolean;
  focused?: boolean;
  loading?: boolean;
  assignment?: DashboardMindMapNodeDto;
  assignmentBranch?: AssignmentBranchKind | null;
  canOpenSummary?: boolean;
  userOptions?: DashboardMindMapTemplateUserDto[];
  userOptionsLoaded?: boolean;
  selectedUserIds?: string[];
  userSearchText?: string;
  reportFilters?: UserReportFilters;
  reportStatusOptions?: Array<{ value: DashboardMindMapBucket; label: string }>;
  stackedBar?: DashboardStackedBarDto;
  statusAccent?: MindMapStatusAccent;
  canResetReports?: boolean;
  loadMoreLabel?: string;
  onToggleWork?: () => void;
  onExpandAssignmentBranch?: (node: DashboardMindMapNodeDto, branch: AssignmentBranchKind) => void;
  onOpenSummary?: (node: DashboardMindMapNodeDto, anchorPosition: SummaryAnchorPosition) => void;
  onToggleGeneric?: () => void;
  onLoadMore?: () => void;
  onSelectedUsersChange?: (userIds: string[]) => void;
  onUserSearchTextChange?: (value: string) => void;
  onUserSearchFocus?: () => void;
  onReportFiltersChange?: (filters: UserReportFilters) => void;
  onResetReports?: () => void;
  onStackedBarSegmentClick?: (bucket: DashboardMindMapBucket) => void;
};

const ALL_VALUE = "__ALL__";

const DEFAULT_REPORT_STATUS_OPTIONS: Array<{ value: DashboardMindMapBucket; label: string }> = [
  { value: "PENDING", label: "Chưa bắt đầu" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "SUBMITTED", label: "Đã gửi" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "OVERDUE", label: "Quá hạn" },
];

function getNodeMinHeight(kind: MindMapNodeKind): number {
  switch (kind) {
    case "template":
      return 350;
    case "user":
      return 365;
    case "assignment":
      return 235;
    case "work":
      return 220;
    case "report":
      return 205;
    case "empty":
      return 132;
    case "loadMore":
      return 96;
    default:
      return 205;
  }
}

function normalizeBucket(key: string): DashboardMindMapBucket | null {
  const upper = key.toUpperCase();
  const allowed: DashboardMindMapBucket[] = [
    "ALL",
    "TODO",
    "DONE",
    "PENDING",
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "OVERDUE",
  ];
  return allowed.includes(upper as DashboardMindMapBucket) ? upper as DashboardMindMapBucket : null;
}

function CompactStackedBar(props: {
  bar?: DashboardStackedBarDto;
  onSegmentClick?: (bucket: DashboardMindMapBucket) => void;
}) {
  const { bar, onSegmentClick } = props;
  const total = Math.max(bar?.total ?? 0, 0);
  if (!bar || total <= 0) return null;

  return (
    <Stack spacing={0.55}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          {bar.label || "Tổng quan"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {total}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        sx={{
          overflow: "hidden",
          height: 10,
          borderRadius: 999,
          bgcolor: "rgba(226,232,240,0.72)",
          border: "1px solid rgba(148,163,184,0.24)",
        }}
      >
        {bar.segments.map((segment) => {
          const bucket = normalizeBucket(segment.key);
          const widthPercent = total > 0 ? (segment.value / total) * 100 : 0;
          const clickable = Boolean(bucket && segment.value > 0 && onSegmentClick);

          return (
            <Box
              key={segment.key}
              component={clickable ? "button" : "div"}
              title={`${segment.label}: ${segment.value}`}
              onClick={clickable ? (event: MouseEvent<HTMLElement>) => {
                event.stopPropagation();
                onSegmentClick?.(bucket!);
              } : undefined}
              sx={{
                flexBasis: `${Math.max(widthPercent, segment.value > 0 ? 7 : 0)}%`,
                flexGrow: segment.value,
                minWidth: segment.value > 0 ? 12 : 0,
                bgcolor: segment.color,
                border: 0,
                p: 0,
                cursor: clickable ? "pointer" : "default",
              }}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

function MindMapGraphNodeComponent(props: NodeProps<MindMapGraphNodeData>) {
  const { data } = props;

  const openSummary = (element: HTMLElement) => {
    if (!data.assignment || !data.onOpenSummary) return;
    const rect = element.getBoundingClientRect();
    data.onOpenSummary(data.assignment, {
      left: rect.right + 12,
      top: rect.top + rect.height / 2,
    });
  };

  const handleUserChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const nextValue = typeof value === "string" ? value.split(",") : value;
    data.onSelectedUsersChange?.(nextValue.includes(ALL_VALUE) ? [] : nextValue);
  };

  const handleReportStatusChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const nextValue = typeof value === "string" ? value.split(",") : value;
    const statusBuckets = nextValue.includes(ALL_VALUE)
      ? []
      : nextValue
        .map((item) => normalizeBucket(item))
        .filter((item): item is DashboardMindMapBucket => Boolean(item));

    data.onReportFiltersChange?.({
      statusBuckets,
      fromDate: data.reportFilters?.fromDate ?? "",
      toDate: data.reportFilters?.toDate ?? "",
    });
  };

  const updateReportDateFilter = (key: "fromDate" | "toDate", value: string) => {
    data.onReportFiltersChange?.({
      statusBuckets: data.reportFilters?.statusBuckets ?? [],
      fromDate: key === "fromDate" ? value : data.reportFilters?.fromDate ?? "",
      toDate: key === "toDate" ? value : data.reportFilters?.toDate ?? "",
    });
  };

  const isLoadMore = data.kind === "loadMore";
  const isEmpty = data.kind === "empty";
  const accentColor = data.kind === "work"
    ? "rgba(20,184,166,0.26)"
    : data.kind === "template"
      ? "rgba(245,158,11,0.28)"
      : data.kind === "user"
        ? "rgba(59,130,246,0.22)"
        : data.kind === "report"
          ? "rgba(34,197,94,0.18)"
          : isEmpty
            ? "rgba(148,163,184,0.16)"
            : "rgba(148,163,184,0.22)";

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 8, height: 8, background: "#cbd5e1", border: 0 }}
      />

      <Box
        onClick={(event) => {
          if (data.canOpenSummary) openSummary(event.currentTarget);
        }}
        sx={{
          width: isLoadMore ? 220 : 340,
          minHeight: getNodeMinHeight(data.kind),
          borderRadius: 4,
          border: "1px solid",
          borderColor: data.focused ? "primary.main" : data.statusAccent?.color ?? "rgba(148,163,184,0.35)",
          background:
            data.statusAccent
              ? `linear-gradient(180deg, ${data.statusAccent.background} 0%, rgba(255,255,255,0.98) 34%, rgba(248,250,252,0.96) 100%)`
              : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
          boxShadow: data.focused
            ? "0 24px 60px rgba(37,99,235,0.14)"
            : "0 18px 42px rgba(15,23,42,0.08)",
          overflow: "hidden",
          cursor: data.canOpenSummary ? "pointer" : "default",
          transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 24px 54px rgba(15,23,42,0.12)",
            borderColor: "rgba(59,130,246,0.45)",
          },
        }}
      >
        <Box sx={{ height: 6, bgcolor: accentColor }} />
        <Stack spacing={1.15} sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
            <Box sx={{ minWidth: 0 }}>
              {data.eyebrow ? (
                <Typography variant="caption" color="text.secondary" fontWeight={800}>
                  {data.eyebrow}
                </Typography>
              ) : null}
              <Typography
                variant="subtitle2"
                fontWeight={850}
                sx={{
                  mt: data.eyebrow ? 0.35 : 0,
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  overflow: "hidden",
                  WebkitLineClamp: data.kind === "report" ? 3 : 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {data.title}
              </Typography>
              {data.subtitle ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.35,
                    display: "-webkit-box",
                    overflow: "hidden",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {data.subtitle}
                </Typography>
              ) : null}
            </Box>

            {data.loading ? <CircularProgress size={18} /> : null}
          </Stack>

          {data.chips?.length ? (
            <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
              {data.chips.map((chip) => (
                <Chip
                  key={`${data.title}_${chip.label}`}
                  size="small"
                  label={chip.label}
                  color={chip.color ?? "default"}
                  variant={chip.variant ?? "outlined"}
                />
              ))}
            </Stack>
          ) : null}

          {data.stackedBar ? (
            <CompactStackedBar
              bar={data.stackedBar}
              onSegmentClick={data.onStackedBarSegmentClick}
            />
          ) : null}

          {isEmpty ? (
            <Stack
              direction="row"
              spacing={0.8}
              alignItems="flex-start"
              sx={{
                color: "text.secondary",
                px: 0.2,
              }}
            >
              <InfoOutlinedIcon fontSize="small" />
              <Typography variant="caption">
                {data.subtitle || "Không có dữ liệu trong nhánh này."}
              </Typography>
            </Stack>
          ) : null}

          {data.kind === "work" ? (
            <Button
              size="small"
              variant={data.expanded ? "outlined" : "contained"}
              startIcon={data.expanded ? <RemoveIcon /> : <AddIcon />}
              onClick={(event) => {
                event.stopPropagation();
                data.onToggleWork?.();
              }}
            >
              {data.expanded ? "Thu gọn gốc" : "Mở công việc đầu vào"}
            </Button>
          ) : null}

          {data.kind === "assignment" && data.assignment ? (
            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant={data.expanded && data.assignmentBranch === "assignments" ? "contained" : "outlined"}
                startIcon={<AccountTreeOutlinedIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onExpandAssignmentBranch?.(data.assignment!, "assignments");
                }}
              >
                Nhánh con
              </Button>
              <Button
                size="small"
                variant={data.expanded && data.assignmentBranch === "reports" ? "contained" : "outlined"}
                startIcon={<ArticleOutlinedIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onExpandAssignmentBranch?.(data.assignment!, "reports");
                }}
              >
                Báo cáo
              </Button>
              <Button
                size="small"
                variant="text"
                startIcon={<LaunchRoundedIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  openSummary(event.currentTarget);
                }}
              >
                Tổng quan
              </Button>
            </Stack>
          ) : null}

          {data.kind === "template" ? (
            <Stack spacing={0.8} className="nodrag nopan">
              <TextField
                className="nodrag nopan"
                size="small"
                label={uiText(UITextKey.TextTimUser)}
                value={data.userSearchText ?? ""}
                placeholder={uiText(UITextKey.TextUsernameHoacHoTen)}
                onFocus={() => data.onUserSearchFocus?.()}
                onChange={(event) => data.onUserSearchTextChange?.(event.target.value)}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              />
              <Select
                className="nodrag nopan"
                multiple
                size="small"
                displayEmpty
                value={data.selectedUserIds ?? []}
                onChange={handleUserChange}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                renderValue={(selected) => {
                  if (selected.length === 0) return "Tất cả người dùng";
                  return `${selected.length} người dùng được chọn`;
                }}
              >
                <MenuItem value={ALL_VALUE}>
                  <Checkbox checked={(data.selectedUserIds ?? []).length === 0} />
                  <ListItemText primary="Tất cả người dùng" />
                </MenuItem>
                <Divider />
                {(data.userOptions ?? []).length === 0 ? (
                  <MenuItem disabled>
                    <ListItemText
                      primary={data.userOptionsLoaded ? "Không có người dùng phù hợp" : "Tìm hoặc mở danh sách người dùng"}
                    />
                  </MenuItem>
                ) : null}
                {(data.userOptions ?? []).map((user) => (
                  <MenuItem key={user.assigneeUserId} value={user.assigneeUserId}>
                    <Checkbox checked={(data.selectedUserIds ?? []).includes(user.assigneeUserId)} />
                    <ListItemText
                      primary={user.assigneeFullName || user.assigneeUsername || user.assigneeUserId}
                      secondary={user.unitLabel}
                    />
                  </MenuItem>
                ))}
              </Select>
              <Button
                className="nodrag nopan"
                size="small"
                variant={data.expanded ? "outlined" : "contained"}
                startIcon={<Groups2OutlinedIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onToggleGeneric?.();
                }}
              >
                {data.expanded ? "Thu gọn người dùng" : "Mở người báo cáo"}
              </Button>
            </Stack>
          ) : null}

          {data.kind === "user" ? (
            <Stack spacing={0.8} className="nodrag nopan">
              <Select
                className="nodrag nopan"
                multiple
                size="small"
                displayEmpty
                value={data.reportFilters?.statusBuckets ?? []}
                onChange={handleReportStatusChange}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                renderValue={(selected) => {
                  if (selected.length === 0) return "Tất cả trạng thái";
                  return `${selected.length} trạng thái`;
                }}
              >
                <MenuItem value={ALL_VALUE}>
                  <Checkbox checked={(data.reportFilters?.statusBuckets ?? []).length === 0} />
                  <ListItemText primary="Chọn tất cả" />
                </MenuItem>
                <Divider />
                {(data.reportStatusOptions ?? DEFAULT_REPORT_STATUS_OPTIONS).map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={(data.reportFilters?.statusBuckets ?? []).includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>

              <Stack direction="row" spacing={0.75}>
                <TextField
                  className="nodrag nopan"
                  size="small"
                  type="date"
                  label={uiText(UITextKey.TextTuNgay)}
                  value={data.reportFilters?.fromDate ?? ""}
                  onChange={(event) => updateReportDateFilter("fromDate", event.target.value)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  className="nodrag nopan"
                  size="small"
                  type="date"
                  label={uiText(UITextKey.TextDenNgay)}
                  value={data.reportFilters?.toDate ?? ""}
                  onChange={(event) => updateReportDateFilter("toDate", event.target.value)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Stack>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Button
                  className="nodrag nopan"
                  size="small"
                  variant={data.expanded ? "outlined" : "contained"}
                  startIcon={data.expanded ? <RemoveIcon /> : <ArticleOutlinedIcon />}
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onToggleGeneric?.();
                  }}
                >
                  {data.expanded ? "Thu gọn báo cáo" : "Mở báo cáo"}
                </Button>
                {data.canResetReports ? (
                  <Button
                    className="nodrag nopan"
                    size="small"
                    variant="text"
                    onClick={(event) => {
                      event.stopPropagation();
                      data.onResetReports?.();
                    }}
                  >
                    Thu gọn danh sách
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ) : null}

          {isLoadMore ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={(event) => {
                event.stopPropagation();
                data.onLoadMore?.();
              }}
            >
              {data.loadMoreLabel ?? "Tải thêm"}
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 8, height: 8, background: "#94a3b8", border: 0 }}
      />
    </>
  );
}

export default memo(MindMapGraphNodeComponent);
