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
export function validateTemplate(tpl: unknown): string[] {
  // `unknown`, not Template: this runs on freshly-parsed JSON from a file the user
  // picked, where any field may be missing or the wrong type. Claiming Template
  // here would be a lie that costs a TypeError on the first junk value.
  const t = (tpl ?? {}) as Partial<Template>;
  const errs: string[] = [];
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  if (typeof t.name !== 'string' || !t.name.trim()) errs.push('Colegio (name) is required.');
  // cn is optional — a colegio may have no code — but a present one must be well formed.
  if (t.cn !== undefined && (typeof t.cn !== 'string' || !isValidCn(t.cn)))
    errs.push(
      `National Code "${String(t.cn)}" must be 6 digits with an optional check digit (140663 or 140663.7).`,
    );

  const w = num(t.sheet?.w);
  const h = num(t.sheet?.h);
  if (!(w > 0) || !(h > 0)) errs.push('Sheet size must be positive.');

  const fields = Array.isArray(t.fields) ? t.fields : [];
  if (!fields.length) errs.push('Template has no fields.');

  const seen = new Set<string>();
  for (const f of fields) {
    if (!f || typeof f !== 'object') {
      errs.push('A field is not an object.');
      continue;
    }
    const key = typeof f.key === 'string' ? f.key.trim() : '';
    const at = key || '(blank key)';
    if (!key) errs.push('A field has a blank key.');
    else if (seen.has(key)) errs.push(`Duplicate field key "${key}".`);
    else seen.add(key);

    const bw = num(f.box?.w);
    const bh = num(f.box?.h);
    if (!(bw > 0) || !(bh > 0)) errs.push(`Field "${at}": box must have positive width and height.`);
    if (!(num(f.style?.size) > 0)) errs.push(`Field "${at}": font size must be positive.`);
    if (!(num(f.cells) >= 1)) errs.push(`Field "${at}": cells must be at least 1.`);
    // A box off the sheet simply never prints — always a mistake.
    if (w > 0 && h > 0 && f.box) {
      const x = num(f.box.x);
      const y = num(f.box.y);
      if (x < 0 || y < 0 || x + bw > w || y + bh > h)
        errs.push(`Field "${at}": box falls outside the ${Math.round(w)}×${Math.round(h)} sheet.`);
    }
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
