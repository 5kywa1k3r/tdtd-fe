import type { HeaderCell } from "./types";

function span(x?: any) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

// Fortune/Luckysheet hay để text ở v/m/value...
function getCellText(v: any): string {
  const pick = (x: any) => (x == null ? "" : String(x));
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return pick(v).trim();

  // common
  if (v.m != null) return pick(v.m).trim();
  if (v.v != null) return pick(v.v).trim();
  if (v.ct?.s != null) return pick(v.ct.s).trim();

  return "";
}

export function extractMasterCells(sheet: any): HeaderCell[] {
  const out: HeaderCell[] = [];

  // 1) Map text from celldata
  const textAt = new Map<string, string>();
  const celldata = sheet?.celldata ?? [];
  for (const it of celldata) {
    // Fortune data thường { r, c, v }
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    const txt = getCellText(it?.v);
    if (txt) textAt.set(`${r}:${c}`, txt);
  }

  // 2) Merge masters from config.merge
  const merge = sheet?.config?.merge ?? {};
  for (const k of Object.keys(merge)) {
    const m = merge[k];
    // luckysheet merge object varies
    const r = Number(m?.r ?? m?.row ?? m?.r0);
    const c = Number(m?.c ?? m?.col ?? m?.c0);
    const rs = span(m?.rs ?? m?.rowspan ?? m?.rowSpan ?? m?.rows);
    const cs = span(m?.cs ?? m?.colspan ?? m?.colSpan ?? m?.cols);

    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;

    out.push({
      r,
      c,
      rowSpan: rs,
      colSpan: cs,
      text: textAt.get(`${r}:${c}`) ?? "",
    });
  }

  // 3) Add non-merged cells that have text (as 1x1 master)
  //    (Không add cell rỗng để khỏi nặng; validate sẽ bắt cell thiếu owner là trống)
  for (const [key, txt] of textAt.entries()) {
    const [rS, cS] = key.split(":");
    const r = Number(rS);
    const c = Number(cS);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;

    // nếu cell này là merge master đã add ở bước 2 thì skip
    const isMergeMaster = out.some((x) => x.r === r && x.c === c && (x.rowSpan ?? 1) > 1 || (x.colSpan ?? 1) > 1);
    if (isMergeMaster) continue;

    out.push({ r, c, rowSpan: 1, colSpan: 1, text: txt });
  }

  return out;
}
