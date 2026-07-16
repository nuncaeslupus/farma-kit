/* Template model — the geometry a colegio's sheet needs to be filled.
 *
 * OPEN BY DESIGN: fields are not a fixed enum. Each field carries its own
 * `key` (data binding) and `label` (UI). Colegios we don't know yet may need
 * fields we can't foresee, so the editor can add arbitrary custom fields; the
 * list below is only a convenience of the currently-known ones.
 */

export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom' | 'baseline';
export type FontFamily = 'mono' | 'sans' | 'serif';

export interface FieldStyle {
  font: FontFamily;
  size: number;
  bold: boolean;
  italic: boolean;
  halign: HAlign;
  valign: VAlign;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Field {
  key: string; // data binding key — arbitrary, not constrained to a known set
  label: string; // human label in the UI
  box: Box; // points, top-left origin (converted to pdf-lib's origin at draw time)
  cells: number; // 1 = single box; >1 = equally subdivided, one char per cell (e.g. UP)
  style: FieldStyle;
  sample?: string; // placeholder / preview text
}

export interface Template {
  name: string; // template id → templates/<slug>.json; mapped to colegios by a registry
  sheet: { w: number; h: number };
  fields: Field[];
  // Per-colegio config (forward-compatible; all optional). A colegio's sheet may
  // carry a different national code, and some may not offer the stamp section.
  cn?: string; // National Code printed on the official sheet (e.g. "140663" for Catalunya)
  segell?: boolean; // whether the stamp ("segell") data section applies — default true
}

export interface FieldPreset {
  key: string;
  label: string;
  cells: number;
  font: FontFamily;
  sample: string;
}

/* Currently-known fields. A CONVENIENCE, not a constraint — "Custom field…"
   in the editor covers anything a future colegio introduces. */
export const FIELD_PRESETS: FieldPreset[] = [
  { key: 'up', label: 'UP', cells: 5, font: 'mono', sample: '10000' },
  { key: 'month', label: 'Month', cells: 2, font: 'mono', sample: '07' },
  { key: 'year', label: 'Year', cells: 2, font: 'mono', sample: '26' },
  { key: 'page', label: 'Page number', cells: 4, font: 'mono', sample: '0001' },
  { key: 'titular', label: 'Titular', cells: 1, font: 'sans', sample: 'GARCÍA LÓPEZ, MARÍA' },
  { key: 'nif', label: 'NIF', cells: 1, font: 'sans', sample: '12345678Z' },
  { key: 'address', label: 'Address', cells: 1, font: 'sans', sample: 'Carrer Exemple, 12' },
  { key: 'cpCity', label: 'CP City', cells: 1, font: 'sans', sample: '08001  Barcelona' },
  { key: 'province', label: 'Province', cells: 1, font: 'sans', sample: 'BARCELONA' },
];

export function defaultStyle(font: FontFamily = 'sans'): FieldStyle {
  return { font, size: 12, bold: false, italic: false, halign: 'left', valign: 'middle' };
}

/** National Code as printed on the sheet: six digits, optional check digit — 140663 or 140663.7. */
export const CN_RE = /^\d{6}(\.\d)?$/;

export function isValidCn(cn: string): boolean {
  return CN_RE.test(cn);
}

/**
 * Structural problems with a template, as human-readable messages ([] = valid).
 * Deliberately small: it only catches what silently breaks the app or the printed
 * sheet — a mistyped code, a duplicate/blank key, a box that can't print. It is
 * NOT a style guide.
 */
export function validateTemplate(tpl: Template): string[] {
  const errs: string[] = [];
  if (!tpl.name?.trim()) errs.push('Colegio (name) is required.');
  // cn is optional — a colegio may have no code — but a present one must be well formed.
  if (tpl.cn !== undefined && !isValidCn(tpl.cn))
    errs.push(`National Code "${tpl.cn}" must be 6 digits with an optional check digit (140663 or 140663.7).`);

  const w = tpl.sheet?.w ?? 0;
  const h = tpl.sheet?.h ?? 0;
  if (!(w > 0) || !(h > 0)) errs.push('Sheet size must be positive.');
  if (!tpl.fields?.length) errs.push('Template has no fields.');

  const seen = new Set<string>();
  for (const f of tpl.fields ?? []) {
    const at = f.key?.trim() || '(blank key)';
    if (!f.key?.trim()) errs.push('A field has a blank key.');
    else if (seen.has(f.key)) errs.push(`Duplicate field key "${f.key}".`);
    else seen.add(f.key);

    if (!(f.box?.w > 0) || !(f.box?.h > 0)) errs.push(`Field "${at}": box must have positive width and height.`);
    if (!(f.style?.size > 0)) errs.push(`Field "${at}": font size must be positive.`);
    if (!(f.cells >= 1)) errs.push(`Field "${at}": cells must be at least 1.`);
    // A box off the sheet simply never prints — always a mistake.
    if (w > 0 && h > 0 && f.box)
      if (f.box.x < 0 || f.box.y < 0 || f.box.x + f.box.w > w || f.box.y + f.box.h > h)
        errs.push(`Field "${at}": box falls outside the ${Math.round(w)}×${Math.round(h)} sheet.`);
  }
  return errs;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
