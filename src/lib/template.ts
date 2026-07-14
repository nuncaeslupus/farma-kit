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

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
