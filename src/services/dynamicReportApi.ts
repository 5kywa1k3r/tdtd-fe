import type {
  AggregationSelection,
  SchemaVersion,
  SupplementWindow,
  UnitFieldRevision,
  UnitFieldValue,
} from '../types/dynamicReport';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2);

const db = {
  versions: new Map<string, SchemaVersion[]>(), // workId -> versions
  values: new Map<string, UnitFieldValue[]>(),  // workId -> values
  revisions: new Map<string, UnitFieldRevision[]>(), // workId -> revisions
  windows: new Map<string, SupplementWindow[]>(), // workId -> windows
};

export async function api_listSchemaVersions(workId: string): Promise<SchemaVersion[]> {
  await sleep(150);
  return db.versions.get(workId) ?? [];
}

export async function api_publishSchemaVersion(workId: string, draft: SchemaVersion): Promise<SchemaVersion> {
  await sleep(250);
  const versions = db.versions.get(workId) ?? [];
  const nextNo = versions.length ? Math.max(...versions.map(v => v.versionNo)) + 1 : 1;

  const published: SchemaVersion = {
    ...draft,
    id: uid(),
    versionNo: nextNo,
    createdAt: nowISO(),
  };

  db.versions.set(workId, [...versions, published]);
  return published;
}

export async function api_migrateValues(
  workId: string,
  fromVersionId: string,
  toVersionId: string,
  fieldKeys: string[],
): Promise<void> {
  await sleep(300);
  const values = db.values.get(workId) ?? [];

  const from = values.filter(v => v.schemaVersionId === fromVersionId && fieldKeys.includes(v.fieldKey));
  const migrated: UnitFieldValue[] = from.map(v => ({
    ...v,
    schemaVersionId: toVersionId,
    updatedAt: nowISO(),
  }));

  db.values.set(workId, [...values, ...migrated]);
}

export async function api_listUnitValues(workId: string, schemaVersionId: string, unitId: string) {
  await sleep(150);
  const values = db.values.get(workId) ?? [];
  return values.filter(v => v.schemaVersionId === schemaVersionId && v.unitId === unitId);
}

export async function api_upsertUnitFieldValue(workId: string, payload: UnitFieldValue, revision: Omit<UnitFieldRevision, 'id'|'changedAt'>) {
  await sleep(200);
  const values = db.values.get(workId) ?? [];
  const idx = values.findIndex(v =>
    v.schemaVersionId === payload.schemaVersionId &&
    v.unitId === payload.unitId &&
    v.fieldKey === payload.fieldKey
  );
  const next = { ...payload, updatedAt: nowISO() };
  if (idx >= 0) values[idx] = next;
  else values.push(next);
  db.values.set(workId, values);

  const revisions = db.revisions.get(workId) ?? [];
  revisions.unshift({
    id: uid(),
    changedAt: nowISO(),
    ...revision,
    workId,
    schemaVersionId: payload.schemaVersionId,
    unitId: payload.unitId,
    fieldKey: payload.fieldKey,
    oldValue: revision.oldValue,
    newValue: revision.newValue,
  });
  db.revisions.set(workId, revisions);
}

export async function api_listRevisions(workId: string, schemaVersionId: string, unitId: string, fieldKey: string) {
  await sleep(150);
  const revisions = db.revisions.get(workId) ?? [];
  return revisions.filter(r =>
    r.schemaVersionId === schemaVersionId &&
    r.unitId === unitId &&
    r.fieldKey === fieldKey
  );
}

export async function api_openSupplementWindow(workId: string, win: Omit<SupplementWindow, 'id'|'openedAt'|'status'>) {
  await sleep(200);
  const windows = db.windows.get(workId) ?? [];
  const created: SupplementWindow = {
    ...win,
    id: uid(),
    openedAt: nowISO(),
    status: 'OPEN',
  };
  db.windows.set(workId, [created, ...windows]);
  return created;
}

export async function api_closeSupplementWindow(workId: string, windowId: string) {
  await sleep(200);
  const windows = db.windows.get(workId) ?? [];
  const idx = windows.findIndex(w => w.id === windowId);
  if (idx >= 0) {
    windows[idx] = { ...windows[idx], status: 'CLOSED', closedAt: nowISO() };
    db.windows.set(workId, windows);
  }
}

export async function api_listSupplementWindows(workId: string) {
  await sleep(150);
  return db.windows.get(workId) ?? [];
}

/** Tổng hợp: trả về values đã “hợp nhất” theo fieldKey (mock logic) */
export async function api_aggregate(selection: AggregationSelection) {
  await sleep(250);
  const values = db.values.get(selection.workId) ?? [];
  // Demo: chỉ trả về list raw theo versionIds và fieldKeys (engine thật bệ hạ gắn sau)
  return values.filter(v =>
    selection.versionIds.includes(v.schemaVersionId) &&
    selection.fieldKeys.includes(v.fieldKey)
  );
}
