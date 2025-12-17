// src/features/work/store/workSlice.ts
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type {
  WorkState,
  ParentWork,
  CommonAttributes,
  ReportingUnitRow,
  ReportingUnitDetail,
  WorkUiMode,
} from '../../types/work';

const initialCommon: CommonAttributes = {
  name: '',
  fromDate: '',
  toDate: '',
  basis: '',
  priority: 'NORMAL',
  directingLeader: '',
  unitIds: [],
  scheduleType: '',
  scheduleConfig: {},
};

const initialState: WorkState = {
  parentWork: null,
  showHeader: true,
  mode: 'VIEW',
  templates: [],

  uiMode: 'TREE',

  commonAttributes: initialCommon,

  children: [],
  workList: [],

  reportingUnits: [],
  selectedUnitDetail: null,

  loading: false,
  error: undefined,
};

const workSlice = createSlice({
  name: 'work',
  initialState,
  reducers: {
    // set nhiệm vụ hiện tại (cha hoặc con)
    setParentWork(state, action: PayloadAction<ParentWork | null>) {
      state.parentWork = action.payload;
    },

    toggleHeader(state) {
      state.showHeader = !state.showHeader;
    },

    setMode(state, action: PayloadAction<WorkState['mode']>) {
      state.mode = action.payload;
    },

    // giao diện tree/detail
    setUiMode(state, action: PayloadAction<WorkUiMode>) {
      state.uiMode = action.payload;
    },

    // danh sách work con
    setChildren(state, action: PayloadAction<ParentWork[]>) {
      state.children = action.payload;
    },

    // danh sách work cho WorkListPage (có thể được giao từ nhiều thằng)
    setWorkList(state, action: PayloadAction<ParentWork[]>) {
      state.workList = action.payload;
    },

    // form thuộc tính chung (khi thêm work con / cấu hình)
    resetCommonAttributes(state) {
      state.commonAttributes = initialCommon;
    },
    updateCommonAttributes(state, action: PayloadAction<Partial<CommonAttributes>>) {
      state.commonAttributes = {
        ...state.commonAttributes,
        ...action.payload,
      };
    },

    // báo cáo đơn vị
    setReportingUnits(state, action: PayloadAction<ReportingUnitRow[]>) {
      state.reportingUnits = action.payload;
    },
    updateUnitStatus(
      state,
      action: PayloadAction<{ id: string; status?: ReportingUnitRow['status']; hasDifficulties?: boolean }>
    ) {
      state.reportingUnits = state.reportingUnits.map((u) =>
        u.id === action.payload.id ? { ...u, ...action.payload } : u
      );
    },

    setSelectedUnitDetail(state, action: PayloadAction<ReportingUnitDetail | null>) {
      state.selectedUnitDetail = action.payload;
    },
    updateSelectedUnitDetail(state, action: PayloadAction<Partial<ReportingUnitDetail>>) {
      if (!state.selectedUnitDetail) return;
      state.selectedUnitDetail = {
        ...state.selectedUnitDetail,
        ...action.payload,
      };
    },
  },
});

export const {
  setParentWork,
  toggleHeader,
  setMode,
  setUiMode,
  setChildren,
  setWorkList,
  resetCommonAttributes,
  updateCommonAttributes,
  setReportingUnits,
  updateUnitStatus,
  setSelectedUnitDetail,
  updateSelectedUnitDetail,
} = workSlice.actions;

export default workSlice.reducer;