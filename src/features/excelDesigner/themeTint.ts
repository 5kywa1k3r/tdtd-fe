// trộn 2 màu hex theo tỉ lệ (0..1)
function mixHex(a: string, b: string, t: number) {
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");

  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab = parseInt(ah.slice(4, 6), 16);

  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb = parseInt(bh.slice(4, 6), 16);

  const rr = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
  const rg = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
  const rb = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");

  return `#${rr}${rg}${rb}`;
}

/**
 * Tạo màu highlight nhạt theo theme:
 * - Lấy primary.main và pha mạnh với trắng để luôn nhạt (kể cả dark mode)
 */
export function getHeaderBgHex(primaryMain: string) {
  // pha 88% trắng -> rất nhạt, không thể ra đen
  return mixHex(primaryMain, "#FFFFFF", 0.88);
}
