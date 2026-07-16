import { describe, test, expect } from 'vitest';
import { slug, defaultStyle, FIELD_PRESETS } from '../src/lib/template';

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
