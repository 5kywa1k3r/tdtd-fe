import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UnitFieldRevision, UnitFieldValue } from '../types/dynamicReport';
import {
  api_listRevisions,
  api_listUnitValues,
  api_upsertUnitFieldValue,
} from '../services/dynamicReportApi';

interface UnitReportState {
  values: UnitFieldValue[]; // current unit + version loaded
  revisions: UnitFieldRevision[];
  loading: boolean;
}

const initialState: UnitReportState = {
  values: [],
  revisions: [],
  loading: false,
};

export const fetchUnitValues = createAsyncThunk(
  'unitReport/fetchValues',
  async (p: { workId: string; schemaVersionId: string; unitId: string }) =>
    api_listUnitValues(p.workId, p.schemaVersionId, p.unitId),
);

export const fetchFieldRevisions = createAsyncThunk(
  'unitReport/fetchRevisions',
  async (p: { workId: string; schemaVersionId: string; unitId: string; fieldKey: string }) =>
    api_listRevisions(p.workId, p.schemaVersionId, p.unitId, p.fieldKey),
);

export const upsertUnitFieldValue = createAsyncThunk(
  'unitReport/upsertValue',
  async (p: {
    workId: string;
    value: UnitFieldValue;
    revision: Omit<UnitFieldRevision, 'id'|'changedAt'|'workId'|'schemaVersionId'|'unitId'|'fieldKey'> & {
      oldValue?: any;
      newValue?: any;
    };
  }) => api_upsertUnitFieldValue(p.workId, p.value, p.revision as any),
);

const slice = createSlice({
  name: 'unitReport',
  initialState,
  reducers: {
    clearRevisions(state) { state.revisions = []; },
    setValues(state, action: PayloadAction<UnitFieldValue[]>) { state.values = action.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchUnitValues.pending, (s) => { s.loading = true; });
    b.addCase(fetchUnitValues.fulfilled, (s, a) => { s.loading = false; s.values = a.payload; });
    b.addCase(fetchUnitValues.rejected, (s) => { s.loading = false; });

    b.addCase(fetchFieldRevisions.pending, (s) => { s.loading = true; });
    b.addCase(fetchFieldRevisions.fulfilled, (s, a) => { s.loading = false; s.revisions = a.payload; });
    b.addCase(fetchFieldRevisions.rejected, (s) => { s.loading = false; });

    b.addCase(upsertUnitFieldValue.pending, (s) => { s.loading = true; });
    b.addCase(upsertUnitFieldValue.fulfilled, (s) => { s.loading = false; });
    b.addCase(upsertUnitFieldValue.rejected, (s) => { s.loading = false; });
  },
});

export const { clearRevisions, setValues } = slice.actions;
export default slice.reducer;
