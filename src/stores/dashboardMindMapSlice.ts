import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { WORK_TYPE, type WorkTypeCore } from "../types/work";
import type { DashboardMindMapBucket } from "../types/dashboardMindMap";

type MindMapViewport = {
  x: number;
  y: number;
  zoom: number;
};

type DrawerState = {
  open: boolean;
  nodeId: string | null;
  bucket: DashboardMindMapBucket;
};

export type DashboardMindMapState = {
  selectedWorkType: WorkTypeCore;
  selectedWorkId: string;
  expandedNodeIds: string[];
  focusedNodeId: string | null;
  summaryNodeId: string | null;
  unitDrawer: DrawerState;
  reportDrawer: DrawerState;
  viewport: MindMapViewport;
};

const initialDrawerState: DrawerState = {
  open: false,
  nodeId: null,
  bucket: "ALL",
};

const initialState: DashboardMindMapState = {
  selectedWorkType: WORK_TYPE.TASK,
  selectedWorkId: "",
  expandedNodeIds: [],
  focusedNodeId: null,
  summaryNodeId: null,
  unitDrawer: initialDrawerState,
  reportDrawer: initialDrawerState,
  viewport: { x: 0, y: 0, zoom: 0.9 },
};

const dashboardMindMapSlice = createSlice({
  name: "dashboardMindMap",
  initialState,
  reducers: {
    setSelectedWorkType(state, action: PayloadAction<WorkTypeCore>) {
      state.selectedWorkType = action.payload;
    },
    setSelectedWork(state, action: PayloadAction<string>) {
      state.selectedWorkId = action.payload;
      state.expandedNodeIds = [];
      state.focusedNodeId = null;
      state.summaryNodeId = null;
      state.unitDrawer = { ...initialDrawerState };
      state.reportDrawer = { ...initialDrawerState };
      state.viewport = { x: 0, y: 0, zoom: 0.9 };
    },
    toggleExpandedNode(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.expandedNodeIds.includes(id)) {
        state.expandedNodeIds = state.expandedNodeIds.filter((x) => x !== id);
        return;
      }

      state.expandedNodeIds.push(id);
    },
    setExpandedNodes(state, action: PayloadAction<string[]>) {
      state.expandedNodeIds = Array.from(new Set(action.payload));
    },
    setFocusedNode(state, action: PayloadAction<string | null>) {
      state.focusedNodeId = action.payload;
    },
    openSummary(state, action: PayloadAction<string>) {
      state.summaryNodeId = action.payload;
      state.focusedNodeId = action.payload;
    },
    closeSummary(state) {
      state.summaryNodeId = null;
    },
    openUnitDrawer(
      state,
      action: PayloadAction<{ nodeId: string; bucket: DashboardMindMapBucket }>,
    ) {
      state.unitDrawer = { open: true, nodeId: action.payload.nodeId, bucket: action.payload.bucket };
    },
    closeUnitDrawer(state) {
      state.unitDrawer = { ...initialDrawerState };
    },
    openReportDrawer(
      state,
      action: PayloadAction<{ nodeId: string; bucket: DashboardMindMapBucket }>,
    ) {
      state.reportDrawer = { open: true, nodeId: action.payload.nodeId, bucket: action.payload.bucket };
    },
    closeReportDrawer(state) {
      state.reportDrawer = { ...initialDrawerState };
    },
    setViewport(state, action: PayloadAction<MindMapViewport>) {
      state.viewport = action.payload;
    },
    resetMindMapState() {
      return initialState;
    },
  },
});

export const {
  setSelectedWorkType,
  setSelectedWork,
  toggleExpandedNode,
  setExpandedNodes,
  setFocusedNode,
  openSummary,
  closeSummary,
  openUnitDrawer,
  closeUnitDrawer,
  openReportDrawer,
  closeReportDrawer,
  setViewport,
  resetMindMapState,
} = dashboardMindMapSlice.actions;

export default dashboardMindMapSlice.reducer;
