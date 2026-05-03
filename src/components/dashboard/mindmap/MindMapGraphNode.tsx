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

export type MindMapNodeKind = "work" | "assignment" | "template" | "user" | "report" | "loadMore";
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
  onReportFiltersChange?: (filters: UserReportFilters) => void;
  onResetReports?: () => void;
  onStackedBarSegmentClick?: (bucket: DashboardMindMapBucket) => void;
};

const ALL_VALUE = "__ALL__";

const DEFAULT_REPORT_STATUS_OPTIONS: Array<{ value: DashboardMindMapBucket; label: string }> = [
  { value: "PENDING", label: "Chua mo" },
  { value: "DRAFT", label: "Ban nhap" },
  { value: "SUBMITTED", label: "Da gui" },
  { value: "APPROVED", label: "Da duyet" },
  { value: "OVERDUE", label: "Qua han" },
];

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
          {bar.label || "Tong quan"}
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
  const accentColor = data.kind === "work"
    ? "rgba(20,184,166,0.26)"
    : data.kind === "template"
      ? "rgba(245,158,11,0.28)"
      : data.kind === "user"
        ? "rgba(59,130,246,0.22)"
        : data.kind === "report"
          ? "rgba(34,197,94,0.18)"
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
              {data.expanded ? "Thu gon root" : "Mo root assignment"}
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
                Nhanh con
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
                Report
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
                Tong quan
              </Button>
            </Stack>
          ) : null}

          {data.kind === "template" ? (
            <Stack spacing={0.8}>
              <TextField
                size="small"
                label="Tim user"
                value={data.userSearchText ?? ""}
                placeholder="Username hoac ho ten"
                onChange={(event) => data.onUserSearchTextChange?.(event.target.value)}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              />
              {data.userOptions?.length ? (
                <Select
                  multiple
                  size="small"
                  displayEmpty
                  value={data.selectedUserIds ?? []}
                  onChange={handleUserChange}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  renderValue={(selected) => {
                    if (selected.length === 0) return "Chon tat ca user";
                    return `${selected.length} user duoc chon`;
                  }}
                >
                  <MenuItem value={ALL_VALUE}>
                    <Checkbox checked={(data.selectedUserIds ?? []).length === 0} />
                    <ListItemText primary="Chon tat ca" />
                  </MenuItem>
                  <Divider />
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
              ) : null}
              <Button
                size="small"
                variant={data.expanded ? "outlined" : "contained"}
                startIcon={<Groups2OutlinedIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onToggleGeneric?.();
                }}
              >
                {data.expanded ? "Thu gon user" : "Mo user bao cao"}
              </Button>
            </Stack>
          ) : null}

          {data.kind === "user" ? (
            <Stack spacing={0.8}>
              <Select
                multiple
                size="small"
                displayEmpty
                value={data.reportFilters?.statusBuckets ?? []}
                onChange={handleReportStatusChange}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                renderValue={(selected) => {
                  if (selected.length === 0) return "Tat ca trang thai";
                  return `${selected.length} trang thai`;
                }}
              >
                <MenuItem value={ALL_VALUE}>
                  <Checkbox checked={(data.reportFilters?.statusBuckets ?? []).length === 0} />
                  <ListItemText primary="Chon tat ca" />
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
                  size="small"
                  type="date"
                  label="Tu ngay"
                  value={data.reportFilters?.fromDate ?? ""}
                  onChange={(event) => updateReportDateFilter("fromDate", event.target.value)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Den ngay"
                  value={data.reportFilters?.toDate ?? ""}
                  onChange={(event) => updateReportDateFilter("toDate", event.target.value)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Stack>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant={data.expanded ? "outlined" : "contained"}
                  startIcon={data.expanded ? <RemoveIcon /> : <ArticleOutlinedIcon />}
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onToggleGeneric?.();
                  }}
                >
                  {data.expanded ? "Thu gon report" : "Mo report"}
                </Button>
                {data.canResetReports ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={(event) => {
                      event.stopPropagation();
                      data.onResetReports?.();
                    }}
                  >
                    Thu gon list
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
              {data.loadMoreLabel ?? "Tai them"}
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
