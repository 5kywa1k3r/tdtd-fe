import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type SchemaVersion } from '../types/dynamicReport';
import {
  api_listSchemaVersions,
  api_migrateValues,
  api_publishSchemaVersion,
} from '../services/dynamicReportApi';

interface DynamicSchemaState {
  versions: SchemaVersion[];
  draft: SchemaVersion | null;
  activeVersionId?: string;
  loading: boolean;
  error?: string;
}

const initialState: DynamicSchemaState = {
  versions: [],
  draft: null,
  loading: false,
};

export const fetchSchemaVersions = createAsyncThunk(
  'dynamicSchema/fetchVersions',
  async (workId: string) => api_listSchemaVersions(workId),
);

export const publishSchema = createAsyncThunk(
  'dynamicSchema/publish',
  async ({ workId, draft }: { workId: string; draft: SchemaVersion }) =>
    api_publishSchemaVersion(workId, draft),
);

export const migrateSchemaValues = createAsyncThunk(
  'dynamicSchema/migrate',
  async (p: { workId: string; fromVersionId: string; toVersionId: string; fieldKeys: string[] }) =>
    api_migrateValues(p.workId, p.fromVersionId, p.toVersionId, p.fieldKeys),
);

const slice = createSlice({
  name: 'dynamicSchema',
  initialState,
  reducers: {
    setDraft(state, action: PayloadAction<SchemaVersion>) {
      state.draft = action.payload;
    },
    setActiveVersion(state, action: PayloadAction<string | undefined>) {
      state.activeVersionId = action.payload;
    },
    retireField(state, action: PayloadAction<{ fieldKey: string }>) {
      if (!state.draft) return;
      const f = state.draft.fields[action.payload.fieldKey];
      if (!f) return;
      state.draft.fields[action.payload.fieldKey] = {
        ...f,
        isActive: false,
        retiredAt: new Date().toISOString(),
      };
    },
    upsertField(state, action: PayloadAction<{ fieldKey: string; next: any }>) {
      if (!state.draft) return;
      state.draft.fields[action.payload.fieldKey] = action.payload.next;
    },
    upsertSection(state, action: PayloadAction<any>) {
      if (!state.draft) return;
      const s = action.payload;
      const idx = state.draft.sections.findIndex(x => x.id === s.id);
      if (idx >= 0) state.draft.sections[idx] = s;
      else state.draft.sections.push(s);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchSchemaVersions.pending, (s) => { s.loading = true; s.error = undefined; });
    b.addCase(fetchSchemaVersions.fulfilled, (s, a) => {
      s.loading = false;
      s.versions = a.payload;
      s.activeVersionId = a.payload.at(-1)?.id;
      // nếu chưa có draft thì khởi tạo draft theo active (hoặc rỗng)
      if (!s.draft) {
      const active = a.payload.at(-1);
      if (active) {
          const draft = JSON.parse(JSON.stringify(active));
          draft.id = 'draft';
          s.draft = draft;
      }
      }
    });
    b.addCase(fetchSchemaVersions.rejected, (s, a) => { s.loading = false; s.error = a.error.message; });

    b.addCase(publishSchema.pending, (s) => { s.loading = true; });
    b.addCase(publishSchema.fulfilled, (s, a) => {
      s.loading = false;
      s.versions = [...s.versions, a.payload];
      s.activeVersionId = a.payload.id;

      // clone ra biến cục bộ trước
      const draft = JSON.parse(JSON.stringify(a.payload));
      draft.id = 'draft';

      s.draft = draft;
    });
    b.addCase(publishSchema.rejected, (s, a) => { s.loading = false; s.error = a.error.message; });

    b.addCase(migrateSchemaValues.pending, (s) => { s.loading = true; });
    b.addCase(migrateSchemaValues.fulfilled, (s) => { s.loading = false; });
    b.addCase(migrateSchemaValues.rejected, (s, a) => { s.loading = false; s.error = a.error.message; });
  },
});

export const { setDraft, setActiveVersion, retireField, upsertField, upsertSection } = slice.actions;
export default slice.reducer;
