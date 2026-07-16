/* Pure, DOM-free pharmacy-form logic. Lives apart from generator-app.ts (a Lit
   component that registers a custom element and touches the DOM on import) so this
   can be imported — by the component AND by tests — with no side effects. The
   errors this file guards against (NIF checksum, CP→province, the Spanish/Catalan
   default) are exactly the class that has slipped through before. */

import type { Lang } from './i18n';

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

export const titleCase = (s: string): string =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();

export function isNif(v: string): boolean {
  v = (v || '').toUpperCase();
  const L = 'TRWAGMYFPDXBNJZSQVHLCKE';
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^(\d{8})([A-Z])$/))) return L[+m[1] % 23] === m[2];
  if ((m = v.match(/^([XYZ])(\d{7})([A-Z])$/)))
    return L[+(({ X: '0', Y: '1', Z: '2' } as Record<string, string>)[m[1]] + m[2]) % 23] === m[3];
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
 * UI language on load. A saved 'ca'/'es' preference wins; otherwise the app
 * serves all of Spain, so ONLY an explicit Catalan browser locale gets Catalan —
 * everything else (Spanish, English, unset…) defaults to Spanish.
 */
export function detectLang(stored: string | null, navLang: string): Lang {
  if (stored === 'ca' || stored === 'es') return stored;
  return /^ca\b/i.test(navLang) ? 'ca' : 'es';
}
