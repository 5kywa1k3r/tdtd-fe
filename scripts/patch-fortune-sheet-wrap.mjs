import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fortuneCoreFiles = [
  "node_modules/@fortune-sheet/core/dist/index.esm.js",
  "node_modules/@fortune-sheet/core/dist/index.js",
].map((file) => resolve(repoRoot, file));
const nodeModulesRoot = resolve(repoRoot, "node_modules");
const viteCacheDir = resolve(nodeModulesRoot, ".vite");
const viteCacheMarker = resolve(nodeModulesRoot, ".fortune-wrap-patch-cache-v2");

const wrapHelperOriginal = `function checkWordByteLength(value) {
  return Math.ceil(value.charCodeAt(0).toString(2).length / 8);
}`;

const wrapHelperPatched = `function checkWordByteLength(value) {
  if (!value) return 1;
  // Fortune uses this helper as a line-break detector. Keep character-based
  // wrapping for CJK/full-width scripts, but let Vietnamese/Latin text wrap by words.
  return /[\\u3040-\\u30FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uAC00-\\uD7AF\\uF900-\\uFAFF\\uFE30-\\uFFA0]/.test(value) ? 2 : 1;
}`;

const heightBreakOriginal = `                parsedTextHeight += preTextHeight;
                if (parsedTextHeight >= cellHeight) break;`;

const heightBreakPatched = `                parsedTextHeight += preTextHeight;
                // Keep parsing all wrapped text; canvas clipping/row height controls visibility.`;

const patches = [
  {
    name: "word-break-helper",
    original: wrapHelperOriginal,
    patched: wrapHelperPatched,
  },
];

const restorePatches = [
  {
    name: "plain-text-height-break",
    original: heightBreakPatched,
    restored: heightBreakOriginal,
  },
];

let patchedCount = 0;

function isInside(parent, child) {
  const relativePath = relative(parent, child);
  return relativePath === "" || (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath));
}

for (const file of fortuneCoreFiles) {
  if (!existsSync(file)) {
    console.warn(`[fortune-wrap-patch] skipped missing file: ${file}`);
    continue;
  }

  const source = readFileSync(file, "utf8");
  let nextSource = source;

  for (const patch of restorePatches) {
    if (!nextSource.includes(patch.original)) continue;

    nextSource = nextSource.split(patch.original).join(patch.restored);
    patchedCount += 1;
    console.log(`[fortune-wrap-patch] restored ${patch.name}: ${file}`);
  }

  for (const patch of patches) {
    if (nextSource.includes(patch.patched)) {
      console.log(`[fortune-wrap-patch] already patched ${patch.name}: ${file}`);
      continue;
    }

    if (!nextSource.includes(patch.original)) {
      throw new Error(
        `[fortune-wrap-patch] Fortune core changed; expected ${patch.name} target was not found in ${file}`,
      );
    }

    nextSource = nextSource.split(patch.original).join(patch.patched);
    patchedCount += 1;
    console.log(`[fortune-wrap-patch] patched ${patch.name}: ${file}`);
  }

  if (nextSource !== source) {
    writeFileSync(file, nextSource, "utf8");
  }
}

if (patchedCount === 0) {
  console.log("[fortune-wrap-patch] no changes needed");
}

const shouldRefreshViteCache = patchedCount > 0 || !existsSync(viteCacheMarker);

if (shouldRefreshViteCache && existsSync(viteCacheDir)) {
  if (!isInside(nodeModulesRoot, viteCacheDir)) {
    throw new Error(`[fortune-wrap-patch] refusing to remove unexpected Vite cache path: ${viteCacheDir}`);
  }

  try {
    rmSync(viteCacheDir, { recursive: true, force: true });
    console.log(`[fortune-wrap-patch] removed Vite dependency cache: ${viteCacheDir}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[fortune-wrap-patch] could not remove Vite dependency cache. Stop the dev server and rerun npm install or npm run dev -- --force. Reason: ${message}`,
    );
  }
} else if (!shouldRefreshViteCache && existsSync(viteCacheDir)) {
  console.log("[fortune-wrap-patch] kept existing Vite dependency cache");
}

writeFileSync(viteCacheMarker, "v2\n", "utf8");
