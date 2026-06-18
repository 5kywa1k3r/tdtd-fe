export type Values1DCellValue = string | string[] | number | boolean | null;

export type CompressedValues1DPayload = {
  values1DCompressed: true;
  values1DCompression: "NULL_RUNS";
  values1DLength: number;
  values1D: Values1DCellValue[];
  values1DCompressedIndexes: number[];
  values1DCompressedCounts: number[];
};

const NULL_RUN_COMPRESSION_KIND = "NULL_RUNS";
export const VALUES1D_COMPRESSION_MIN_LENGTH = 251;
const MIN_NULL_RUN_LENGTH = 8;

function isCompressibleBlank(value: Values1DCellValue | undefined): boolean {
  return value == null;
}

type CompressionRun = {
  start: number;
  endExclusive: number;
  compressedIndex: number;
  removedThrough: number;
};

function normalizeCount(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

function readNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0)
    : [];
}

function buildCompressionRuns(
  length: number,
  compressedLength: number,
  indexes: number[],
  counts: number[],
): CompressionRun[] | null {
  if (indexes.length === 0 || indexes.length !== counts.length) return null;

  const runs: CompressionRun[] = [];
  let removedBefore = 0;
  let previousEnd = 0;

  for (let runIndex = 0; runIndex < indexes.length; runIndex += 1) {
    const start = indexes[runIndex];
    const count = counts[runIndex];
    const endExclusive = start + count;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(count) ||
      start < previousEnd ||
      start < 0 ||
      start >= length ||
      count <= 0 ||
      endExclusive > length
    ) {
      return null;
    }

    const compressedIndex = start - removedBefore;
    if (compressedIndex < 0 || compressedIndex >= compressedLength) return null;

    removedBefore += count - 1;
    runs.push({
      start,
      endExclusive,
      compressedIndex,
      removedThrough: removedBefore,
    });
    previousEnd = endExclusive;
  }

  return length - removedBefore === compressedLength ? runs : null;
}

function findRunAtOrBefore(runs: CompressionRun[], index: number): CompressionRun | null {
  let lo = 0;
  let hi = runs.length - 1;
  let match: CompressionRun | null = null;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const run = runs[mid];
    if (run.start <= index) {
      match = run;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return match;
}

export type Values1DReader = {
  length: number;
  compressed: boolean;
  get(index: number): Values1DCellValue;
  toArray(): Values1DCellValue[];
};

function buildReader(values: Values1DCellValue[], length: number, runs: CompressionRun[] | null): Values1DReader {
  const safeLength = Math.max(0, Math.floor(length));
  const activeRuns = runs ?? [];

  const mapIndex = (index: number): { compressedIndex: number; inCompressedRun: boolean } => {
    const run = findRunAtOrBefore(activeRuns, index);
    if (!run) return { compressedIndex: index, inCompressedRun: false };
    if (index < run.endExclusive) return { compressedIndex: run.compressedIndex, inCompressedRun: true };
    return { compressedIndex: index - run.removedThrough, inCompressedRun: false };
  };
  const get = (index: number): Values1DCellValue => {
    if (!Number.isInteger(index) || index < 0 || index >= safeLength) return null;
    const mapped = mapIndex(index);
    if (mapped.inCompressedRun) return null;
    return values[mapped.compressedIndex] ?? null;
  };

  return {
    length: safeLength,
    compressed: activeRuns.length > 0,
    get,
    toArray() {
      return Array.from({ length: safeLength }, (_, index) => get(index));
    },
  };
}

export function createValues1DReader(payload: unknown): Values1DReader {
  if (Array.isArray(payload)) {
    return buildReader(payload as Values1DCellValue[], payload.length, null);
  }
  if (!payload || typeof payload !== "object") return buildReader([], 0, null);

  const record = payload as Record<string, unknown>;
  if (
    record.values1DCompressed !== true ||
    record.values1DCompression !== NULL_RUN_COMPRESSION_KIND ||
    !Array.isArray(record.values1D)
  ) {
    return buildReader([], 0, null);
  }

  const values = record.values1D as Values1DCellValue[];
  const length = normalizeCount(record.values1DLength) ?? values.length;
  const indexes = readNumberArray(record.values1DCompressedIndexes);
  const counts = readNumberArray(record.values1DCompressedCounts);
  const runs = buildCompressionRuns(length, values.length, indexes, counts);
  return buildReader(values, runs ? length : values.length, runs);
}

function buildCompressedPayload(values: Values1DCellValue[]): CompressedValues1DPayload | null {
  if (values.length < VALUES1D_COMPRESSION_MIN_LENGTH) return null;

  const compressed: Values1DCellValue[] = [];
  const indexes: number[] = [];
  const counts: number[] = [];

  for (let index = 0; index < values.length;) {
    if (!isCompressibleBlank(values[index])) {
      compressed.push(values[index]);
      index += 1;
      continue;
    }

    let end = index + 1;
    while (end < values.length && isCompressibleBlank(values[end])) end += 1;
    const runLength = end - index;
    if (runLength >= MIN_NULL_RUN_LENGTH) {
      indexes.push(index);
      counts.push(runLength);
      compressed.push(null);
    } else {
      for (let cursor = index; cursor < end; cursor += 1) compressed.push(null);
    }
    index = end;
  }

  if (indexes.length === 0) return null;

  return {
    values1DCompressed: true,
    values1DCompression: NULL_RUN_COMPRESSION_KIND,
    values1DLength: values.length,
    values1D: compressed,
    values1DCompressedIndexes: indexes,
    values1DCompressedCounts: counts,
  };
}

export function encodeValues1DPayload(values: Values1DCellValue[]): Values1DCellValue[] | CompressedValues1DPayload {
  const dense = Array.isArray(values) ? values : [];
  const payload = buildCompressedPayload(dense);
  if (!payload) return dense;

  const denseSize = JSON.stringify(dense).length;
  const compressedSize = JSON.stringify(payload).length;
  return compressedSize < denseSize ? payload : dense;
}

export function stringifyValues1DPayload(values: Values1DCellValue[]): string {
  return JSON.stringify(encodeValues1DPayload(values));
}

export function decodeValues1DPayload(payload: unknown): Values1DCellValue[] {
  return createValues1DReader(payload).toArray();
}

export function parseValues1DJson(json?: string | null): Values1DCellValue[] {
  if (!json?.trim()) return [];
  try {
    return decodeValues1DPayload(JSON.parse(json));
  } catch {
    return [];
  }
}

export function readTableBlockValues1D(block: unknown): Values1DCellValue[] | null {
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const record = block as Record<string, unknown>;
  if (!Array.isArray(record.values1D)) return null;

  return createTableBlockValues1DReader(block).toArray();
}

export function createTableBlockValues1DReader(block: unknown): Values1DReader {
  if (!block || typeof block !== "object" || Array.isArray(block)) return buildReader([], 0, null);
  const record = block as Record<string, unknown>;
  if (!Array.isArray(record.values1D)) return buildReader([], 0, null);

  if (
    record.values1DCompressed === true &&
    record.values1DCompression === NULL_RUN_COMPRESSION_KIND
  ) {
    return createValues1DReader({
      values1DCompressed: true,
      values1DCompression: NULL_RUN_COMPRESSION_KIND,
      values1DLength: record.values1DLength,
      values1D: record.values1D,
      values1DCompressedIndexes: record.values1DCompressedIndexes,
      values1DCompressedCounts: record.values1DCompressedCounts,
    });
  }

  return buildReader(record.values1D as Values1DCellValue[], record.values1D.length, null);
}

export function getTableBlockValues1DLength(block: unknown): number {
  return createTableBlockValues1DReader(block).length;
}

export function attachCompressedValues1D<T extends object>(
  block: T,
  values: Values1DCellValue[],
): T & Record<string, unknown> {
  const payload = encodeValues1DPayload(values);
  const next = Object.assign({}, block) as Record<string, unknown>;
  delete next.values1DCompressed;
  delete next.values1DCompression;
  delete next.values1DLength;
  delete next.values1DCompressedIndexes;
  delete next.values1DCompressedCounts;

  if (Array.isArray(payload)) {
    next.values1D = payload;
    return next as T & Record<string, unknown>;
  }

  next.values1D = payload.values1D;
  next.values1DCompressed = true;
  next.values1DCompression = payload.values1DCompression;
  next.values1DLength = payload.values1DLength;
  next.values1DCompressedIndexes = payload.values1DCompressedIndexes;
  next.values1DCompressedCounts = payload.values1DCompressedCounts;
  return next as T & Record<string, unknown>;
}
