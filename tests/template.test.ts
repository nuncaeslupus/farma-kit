import { describe, test, expect } from 'vitest';
import {
  slug,
  defaultStyle,
  FIELD_PRESETS,
  isValidCn,
  validateTemplate,
  type Template,
} from '../src/lib/template';
import catalunya from '../public/templates/catalunya.json';

describe('slug', () => {
  // slug() is the join between a colegio's display name and its template file
  // (templateMap[slug(name)]) — a change here silently unlinks templates.
  test.each([
    ['Barcelona', 'barcelona'],
    ['Illes Balears', 'illes-balears'],
    ['Araba / Álava', 'araba-alava'],
    ['A Coruña', 'a-coruna'],
    ['Santa Cruz de Tenerife', 'santa-cruz-de-tenerife'],
    ['  Lleida  ', 'lleida'],
  ])('slug(%p) -> %p', (input, expected) => {
    expect(slug(input)).toBe(expected);
  });
});

describe('defaultStyle', () => {
  test('defaults to sans, size 12, no emphasis', () => {
    expect(defaultStyle()).toEqual({
      font: 'sans',
      size: 12,
      bold: false,
      italic: false,
      halign: 'left',
      valign: 'middle',
    });
  });

  test('honours the requested font family', () => {
    expect(defaultStyle('mono').font).toBe('mono');
  });
});

describe('FIELD_PRESETS', () => {
  test('preset keys are unique', () => {
    const keys = FIELD_PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('isValidCn', () => {
  // Six digits, optional single check digit: 140663 / 140663.7.
  test.each(['140663', '000000', '999999', '140663.7', '140663.0'])('accepts %p', (cn) => {
    expect(isValidCn(cn)).toBe(true);
  });

  test.each([
    ['14066', 'five digits'],
    ['1406633', 'seven digits'],
    ['140663.', 'trailing dot'],
    ['140663.77', 'two check digits'],
    ['140663.7.8', 'two dots'],
    ['.140663', 'leading dot'],
    ['14066a', 'letter'],
    ['140663,7', 'comma instead of dot'],
    ['140-663', 'dash'],
    [' 140663', 'leading space'],
    ['140663 ', 'trailing space'],
    ['', 'empty'],
  ])('rejects %p (%s)', (cn) => {
    expect(isValidCn(cn)).toBe(false);
  });
});

describe('validateTemplate', () => {
  const ok = (): Template => ({
    name: 'Catalunya',
    cn: '140663',
    sheet: { w: 595, h: 842 },
    fields: [
      {
        key: 'up',
        label: 'UP',
        box: { x: 10, y: 10, w: 80, h: 18 },
        cells: 5,
        style: defaultStyle('mono'),
        sample: '12345',
      },
    ],
  });

  test('a good template has no errors', () => {
    expect(validateTemplate(ok())).toEqual([]);
  });

  test('cn is optional', () => {
    const t = ok();
    delete t.cn;
    expect(validateTemplate(t)).toEqual([]);
  });

  test('a malformed cn is reported', () => {
    const t = ok();
    t.cn = '1406';
    expect(validateTemplate(t).join(' ')).toMatch(/National Code/);
  });

  test('name is required', () => {
    const t = ok();
    t.name = '  ';
    expect(validateTemplate(t).join(' ')).toMatch(/Template name is required/);
  });

  test('duplicate field keys are reported', () => {
    const t = ok();
    t.fields = [t.fields[0], { ...t.fields[0] }];
    expect(validateTemplate(t).join(' ')).toMatch(/Duplicate field key "up"/);
  });

  test('a blank field key is reported', () => {
    const t = ok();
    t.fields[0].key = '';
    expect(validateTemplate(t).join(' ')).toMatch(/blank key/);
  });

  test('a box off the sheet is reported', () => {
    const t = ok();
    t.fields[0].box.x = 560; // 560 + 80 > 595
    expect(validateTemplate(t).join(' ')).toMatch(/outside the .* sheet/);
  });

  test('a box flush to the edge survives float drift', () => {
    // Box coords come from dragging, so a right-aligned box can land on
    // 595.2800000001 > 595.28. A failed check blocks export, so a false reject
    // would lock the user out of a perfectly good template.
    const t = ok();
    t.sheet = { w: 595.28, h: 841.89 };
    t.fields[0].box = { x: 1e-10, y: 0, w: 595.28, h: 20 };
    expect(1e-10 + 595.28 > 595.28).toBe(true); // the drift is real
    expect(validateTemplate(t)).toEqual([]); // but must not be reported
  });

  test('the epsilon does not hide a genuinely off-sheet box', () => {
    const t = ok();
    t.sheet = { w: 595.28, h: 841.89 };
    t.fields[0].box = { x: 500, y: 0, w: 100, h: 20 }; // 600 — over by ~4.7pt
    expect(validateTemplate(t).join(' ')).toMatch(/outside the .* sheet/);
  });

  test('non-positive sizes are reported', () => {
    const t = ok();
    t.fields[0].box.w = 0;
    t.fields[0].style.size = 0;
    const e = validateTemplate(t).join(' ');
    expect(e).toMatch(/positive width and height/);
    expect(e).toMatch(/font size must be positive/);
  });

  test('an empty template is reported', () => {
    const t = ok();
    t.fields = [];
    expect(validateTemplate(t).join(' ')).toMatch(/no fields/);
  });

  test('the shipped catalunya.json is valid', () => {
    // Guards the real template that drives printing — a bad edit fails CI.
    expect(validateTemplate(catalunya as Template)).toEqual([]);
  });

  // It runs on freshly-parsed JSON the user picked, so junk must come back as
  // errors — never as a TypeError the caller then reports as "unreadable JSON".
  describe('malformed input is reported, not thrown', () => {
    test.each([
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['a string', 'nope'],
      ['an empty object', {}],
      ['name as a number', { name: 7, sheet: { w: 595, h: 842 }, fields: [] }],
      ['fields not an array', { name: 'X', sheet: { w: 595, h: 842 }, fields: 'nope' }],
      ['a null field', { name: 'X', sheet: { w: 595, h: 842 }, fields: [null] }],
      ['sheet sizes as strings', { name: 'X', sheet: { w: '595', h: '842' }, fields: [] }],
    ])('%s', (_label, input) => {
      const errs = validateTemplate(input);
      expect(Array.isArray(errs)).toBe(true);
      expect(errs.length).toBeGreaterThan(0);
    });

    test('non-finite sheet sizes are reported (JSON allows 1e309 -> Infinity)', () => {
      expect(validateTemplate({ name: 'X', sheet: { w: 1e309, h: 1e309 }, fields: [] }).join(' ')).toMatch(
        /Sheet size must be positive/,
      );
    });

    test('a numeric cn is reported, not coerced into looking valid', () => {
      const errs = validateTemplate({ name: 'X', cn: 140663, sheet: { w: 595, h: 842 }, fields: [] });
      expect(errs.join(' ')).toMatch(/National Code/);
    });
  });
});
