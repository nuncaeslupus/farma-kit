/* Pure, DOM-free pharmacy-form logic. Lives apart from generator-app.ts (a Lit
   component that registers a custom element and touches the DOM on import) so this
   can be imported — by the component AND by tests — with no side effects. The
   errors this file guards against (NIF checksum, CP→province, the Catalan-path
   match) are exactly the class that has slipped through before. */

/* CP first-two-digits → province. Drives instant client-side province autofill. */
export const CP2PROV: Record<string, string> = {
  '01': 'Araba / Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería',
  '05': 'Ávila', '06': 'Badajoz', '07': 'Illes Balears', '08': 'Barcelona',
  '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón',
  '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca',
  '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
  '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia',
  '35': 'Las Palmas', '36': 'Pontevedra', '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia',
  '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel',
  '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia',
  '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

// Toponym/name particles kept lowercase when they sit BETWEEN words, across the
// four languages this app serves (Spanish, Catalan, Galician, Basque): the city
// is "Sant Boi de Llobregat", not "…De Llobregat". A particle as the FIRST word
// still capitalizes, since there it heads the name ("La Rioja", "A Coruña").
const PARTICLES = new Set([
  'de', 'del', 'dels', 'des', 'da', 'do', 'das', 'dos',
  'la', 'les', 'las', 'los', 'lo', 'el', 'els',
  'e', 'y', 'i', 'a', 'o', 'as', 'os',
  'eta',
]);

// Unicode-aware: \b\w is ASCII-only, so accented Spanish/Catalan names (Núñez,
// Óscar, Àngels) capitalized wrong ("NúñEz"). Match the first letter at a string
// start or after any non-letter/non-number instead.
const capWord = (w: string): string =>
  w.replace(/(?<=^|[^\p{L}\p{N}])\p{L}/gu, (c) => c.toUpperCase());

export const titleCase = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      if (i === 0) return capWord(w); // first word heads the name — always caps
      if (PARTICLES.has(w)) return w; // "de", "la", "i"… stay lowercase mid-name
      // Catalan/Galician elided article: "d'aro" → "d'Aro" (lowercase d, cap noun)
      if (/^[dl]'\p{L}/u.test(w)) return w[0] + capWord(w).slice(1);
      return capWord(w);
    })
    .join(' ');

const NIE_PREFIX: Record<string, string> = { X: '0', Y: '1', Z: '2' };

export function isNif(v: string): boolean {
  v = (v || '').toUpperCase();
  const L = 'TRWAGMYFPDXBNJZSQVHLCKE';
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^(\d{8})([A-Z])$/))) return L[+m[1] % 23] === m[2];
  if ((m = v.match(/^([XYZ])(\d{7})([A-Z])$/)))
    return L[+(NIE_PREFIX[m[1]] + m[2]) % 23] === m[3];
  return false;
}

export type ValRule = {
  id: string;
  segell?: boolean;
  msg?: string;
  test?: (v: string) => boolean;
};

export const VAL: Record<string, ValRule> = {
  up: { id: 'up', msg: 'errUp', test: (v) => /^\d{5}$/.test(v) },
  // The month/year printed on the sheet are sliced out of this value by position,
  // so the ISO shape is load-bearing. type="month" guarantees it in Chrome, but
  // Firefox/Safari fall back to a free text box — "2026-7" would print month "7".
  mes: { id: 'mes', msg: 'errMes', test: (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v) },
  full: { id: 'full', msg: 'errNat', test: (v) => /^\d+$/.test(v) && +v >= 1 },
  num: { id: 'num', msg: 'errNat', test: (v) => /^\d+$/.test(v) && +v >= 1 },
  cognoms: { id: 'cognoms', segell: true },
  nom: { id: 'nom', segell: true },
  nif: { id: 'nif', segell: true, msg: 'errNif', test: isNif },
  cp: { id: 'cp', segell: true, msg: 'errCp', test: (v) => /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(v) },
  adreca: { id: 'adreca', segell: true },
  poblacio: { id: 'poblacio', segell: true },
  provincia: { id: 'provincia', segell: true },
};

/**
 * True when the run's last sheet number (start + count - 1) cannot fit the page
 * comb's fixed cell count. padStart never shortens, and the PDF grid draws one
 * glyph per cell, so an overflowing number would silently print truncated —
 * wrong AND duplicated sequential numbers on official sheets. Callers refuse to
 * generate instead.
 */
export function pageRangeExceeds(start: number, count: number, cells: number): boolean {
  return start + count - 1 >= 10 ** cells;
}

/**
 * True when a URL path is the Catalan entry point: /ca, /ca/ or /ca/index.html
 * at the END of the path (a direct hit GitHub Pages serves), but not /casa —
 * and anchored, so a "ca" segment anywhere else in a hosting prefix can never
 * match. This is the ONLY language signal: / is Spanish, /ca/ is Catalan. A
 * stored preference (and navigator.language detection) used to override the
 * root URL, which made the crawlable link to the Spanish version render
 * Catalan anyway.
 */
export function isCatalanPath(pathname: string): boolean {
  return /\/ca(\/|\/index\.html)?$/.test(pathname);
}
