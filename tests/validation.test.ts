import { describe, test, expect } from 'vitest';
import { CP2PROV, titleCase, isNif, VAL, langFromPath, pageRangeExceeds } from '../src/lib/validation';

// The path is the ONLY language signal (/ = es, /ca/, /eu/, /gl/ the others) —
// there is no stored preference or navigator.language detection anymore: both
// used to override the root URL, so a link to the Spanish version could render
// another language anyway.
describe('langFromPath', () => {
  test.each([
    ['/farma-kit/ca/', 'ca'],
    ['/farma-kit/ca', 'ca'],
    ['/farma-kit/ca/index.html', 'ca'],
    ['/farma-kit/eu/', 'eu'],
    ['/farma-kit/eu/index.html', 'eu'],
    ['/farma-kit/gl/', 'gl'],
    ['/farma-kit/gl/index.html', 'gl'],
    ['/farma-kit/', 'es'],
    ['/farma-kit/index.html', 'es'],
    // must not false-positive on words that merely start with a locale code
    ['/farma-kit/casa/', 'es'],
    ['/farma-kit/global/', 'es'],
    // anchored: a locale segment in a hosting prefix must not match
    ['/ca/farma-kit/', 'es'],
    ['/eu/farma-kit/', 'es'],
  ])('%p -> %p', (path, expected) => {
    expect(langFromPath(path)).toBe(expected);
  });
});

describe('isNif (DNI/NIE checksum)', () => {
  test.each([
    ['12345678Z', true],
    ['12345678z', true], // lowercase accepted
    ['12345678A', false], // wrong check letter
    ['X1234567L', true],
    ['X1234567A', false],
    ['Z1234567', false], // missing check letter
    ['ABC', false],
    ['', false],
  ])('isNif(%p) -> %p', (input, expected) => {
    expect(isNif(input)).toBe(expected);
  });
});

describe('CP2PROV', () => {
  test('maps known prefixes', () => {
    expect(CP2PROV['08']).toBe('Barcelona');
    expect(CP2PROV['28']).toBe('Madrid');
    expect(CP2PROV['01']).toBe('Araba / Álava');
  });

  test('covers every 01–52 prefix with no gaps', () => {
    const missing: string[] = [];
    for (let i = 1; i <= 52; i++) {
      const key = String(i).padStart(2, '0');
      if (!CP2PROV[key]) missing.push(key);
    }
    expect(missing).toEqual([]);
    expect(CP2PROV['00']).toBeUndefined();
    expect(CP2PROV['53']).toBeUndefined();
  });
});

describe('titleCase', () => {
  test.each([
    ['CARRER MAJOR', 'Carrer Major'],
    ['  josep  ', 'Josep'],
    // Accented first letters — the ASCII \b\w version mangled these to "NúñEz".
    ['álvaro', 'Álvaro'],
    ['núñez', 'Núñez'],
    ['ÓSCAR', 'Óscar'],
    ['maria àngels', 'Maria Àngels'],
    ["l'hospitalet", "L'Hospitalet"],
    // Particles ("de", "del", "la", "i"…) stay lowercase mid-name across the four
    // languages served — but a leading article still capitalizes.
    ['maria del carmen', 'Maria del Carmen'],
    ['sant boi de llobregat', 'Sant Boi de Llobregat'],
    ['mollet del vallès', 'Mollet del Vallès'],
    ['carrer de la pau', 'Carrer de la Pau'],
    ['vilanova i la geltrú', 'Vilanova i la Geltrú'],
    ["sant joan d'alacant", "Sant Joan d'Alacant"], // elided article: d' lower, noun caps
    ['a coruña', 'A Coruña'], // leading Galician article — stays capitalized
    ['o barco de valdeorras', 'O Barco de Valdeorras'],
    ['', ''],
  ])('titleCase(%p) -> %p', (input, expected) => {
    expect(titleCase(input)).toBe(expected);
  });
});

describe('VAL field rules', () => {
  const ok = (key: string, v: string) => VAL[key].test!(v);

  test('up is exactly 5 digits', () => {
    expect(ok('up', '10000')).toBe(true);
    expect(ok('up', '999')).toBe(false);
    expect(ok('up', '100000')).toBe(false);
  });

  test('full/num are naturals >= 1', () => {
    expect(ok('num', '1')).toBe(true);
    expect(ok('num', '0')).toBe(false);
    expect(ok('num', '')).toBe(false);
    expect(ok('num', '-3')).toBe(false);
  });

  test('mes must be ISO YYYY-MM', () => {
    // Load-bearing: month/year are sliced out of this by position, and
    // Firefox/Safari render type="month" as a free text box. "2026-7" would
    // silently print month "7" instead of "07".
    for (const good of ['2026-07', '2026-01', '2026-12', '1999-10']) expect(ok('mes', good)).toBe(true);
    for (const bad of [
      '2026-7', // single-digit month
      '2026-00',
      '2026-13',
      '26-07', // 2-digit year
      '07-2026', // reversed
      '2026/07',
      'julio 2026',
      '2026-07-01',
      '',
    ])
      expect(ok('mes', bad), bad).toBe(false);
  });

  test('cp accepts 01–52 prefixes only', () => {
    for (const good of ['08001', '52999', '01000']) expect(ok('cp', good)).toBe(true);
    for (const bad of ['00123', '53000', '8001', '']) expect(ok('cp', bad)).toBe(false);
  });

  test('optional (segell) fields are flagged so they can be gated off', () => {
    for (const k of ['cognoms', 'nom', 'nif', 'cp', 'adreca', 'poblacio', 'provincia'])
      expect(VAL[k].segell).toBe(true);
    for (const k of ['up', 'full', 'num']) expect(VAL[k].segell).toBeUndefined();
  });
});

describe('pageRangeExceeds', () => {
  test('fits within the comb', () => {
    expect(pageRangeExceeds(1, 9999, 4)).toBe(false);
    expect(pageRangeExceeds(9999, 1, 4)).toBe(false);
    expect(pageRangeExceeds(1, 1, 4)).toBe(false);
  });

  test('overflows the comb', () => {
    expect(pageRangeExceeds(2, 9999, 4)).toBe(true);
    expect(pageRangeExceeds(9999, 2, 4)).toBe(true);
    // start alone can't reach here via the input filter (maxlength 4), but the
    // function itself must still report it — it has no opinion on the caller.
    expect(pageRangeExceeds(10000, 1, 4)).toBe(true);
  });

  test('respects other cell counts', () => {
    expect(pageRangeExceeds(1, 99, 2)).toBe(false);
    expect(pageRangeExceeds(1, 100, 2)).toBe(true);
  });
});
