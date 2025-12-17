/**
 * Chuẩn hoá chuỗi tiếng Việt để search:
 * - Bỏ dấu
 * - lowerCase
 * - trim
 */
export const normalizeVi = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
