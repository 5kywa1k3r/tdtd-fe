import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { type SupplementWindow } from '../types/dynamicReport';
import {
  api_closeSupplementWindow,
  api_listSupplementWindows,
  api_openSupplementWindow,
} from '../services/dynamicReportApi';

interface SupplementState {
  windows: SupplementWindow[];
  loading: boolean;
}

const initialState: SupplementState = {
  windows: [],
  loading: false,
};

export const fetchSupplementWindows = createAsyncThunk(
  'supplement/fetch',
  async (workId: string) => api_listSupplementWindows(workId),
);

export const openSupplementWindow = createAsyncThunk(
  'supplement/open',
  async (p: { workId: string; win: Omit<SupplementWindow,'id'|'openedAt'|'status'> }) =>
    api_openSupplementWindow(p.workId, p.win),
);

export const closeSupplementWindow = createAsyncThunk(
  'supplement/close',
  async (p: { workId: string; windowId: string }) =>
    api_closeSupplementWindow(p.workId, p.windowId),
);

const slice = createSlice({
  name: 'supplement',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSupplementWindows.pending, (s) => { s.loading = true; });
    b.addCase(fetchSupplementWindows.fulfilled, (s, a) => { s.loading = false; s.windows = a.payload; });
    b.addCase(fetchSupplementWindows.rejected, (s) => { s.loading = false; });

    b.addCase(openSupplementWindow.fulfilled, (s, a) => { s.windows = [a.payload, ...s.windows]; });
    b.addCase(closeSupplementWindow.fulfilled, (s) => { s.loading = false; });
  },
});

export default slice.reducer;
