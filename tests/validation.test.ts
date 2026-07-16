import { describe, test, expect } from 'vitest';
import { CP2PROV, titleCase, isNif, VAL, detectLang } from '../src/lib/validation';

describe('detectLang', () => {
  // The app serves all of Spain: a saved preference wins, otherwise only an
  // explicit Catalan locale gets Catalan and everything else defaults to Spanish.
  // This exact default flipped the wrong way in a past release — guard it.
  test.each([
    ['ca', 'es-ES', 'ca'],
    ['es', 'ca-ES', 'es'],
    [null, 'ca', 'ca'],
    [null, 'ca-ES', 'ca'],
    [null, 'CA-es', 'ca'],
    [null, 'es-ES', 'es'],
    [null, 'en-US', 'es'],
    [null, 'fr', 'es'],
    [null, '', 'es'],
    ['garbage', 'en-US', 'es'],
    // 'catalan-ish' locales that don't start with the ca token stay Spanish
    [null, 'car', 'es'],
    // navigator.language absent (odd webviews / test envs) → default, no throw
    [null, undefined, 'es'],
    [null, null, 'es'],
  ])('stored=%p nav=%p -> %p', (stored, nav, expected) => {
    expect(detectLang(stored, nav)).toBe(expected);
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
    ['maria del carmen', 'Maria Del Carmen'],
    ['CARRER MAJOR', 'Carrer Major'],
    ['  josep  ', 'Josep'],
    // Accented first letters — the ASCII \b\w version mangled these to "NúñEz".
    ['álvaro', 'Álvaro'],
    ['núñez', 'Núñez'],
    ['ÓSCAR', 'Óscar'],
    ['maria àngels', 'Maria Àngels'],
    ["l'hospitalet", "L'Hospitalet"],
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
