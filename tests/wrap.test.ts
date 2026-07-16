import { describe, test, expect } from 'vitest';
import { wrapLines, wrapTitular, fitWrapped } from '../src/lib/pdf/wrap';

// Deterministic stand-in for a font: every character is 1 unit wide, so maxWidth
// is effectively "characters per line" and the tests read clearly.
const measure = (s: string) => s.length;

describe('wrapLines', () => {
  test('short text stays on one line', () => {
    expect(wrapLines(measure, 'hello world', 20)).toEqual(['hello world']);
  });

  test('wraps on whitespace, never exceeding maxWidth', () => {
    const lines = wrapLines(measure, 'the quick brown fox jumps', 10);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(10);
    expect(lines.join(' ')).toBe('the quick brown fox jumps');
  });

  test('breaks a single word longer than the box by character', () => {
    const lines = wrapLines(measure, 'supercalifragilistic', 6);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(6);
    expect(lines.join('')).toBe('supercalifragilistic');
  });

  test('mixes word-wrap and char-break', () => {
    const lines = wrapLines(measure, 'ab verylongtoken cd', 5);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(5);
  });

  test('empty / whitespace-only yields no lines', () => {
    expect(wrapLines(measure, '', 10)).toEqual([]);
    expect(wrapLines(measure, '   ', 10)).toEqual([]);
  });

  test('a single character always emits even if narrower than one glyph', () => {
    expect(wrapLines(measure, 'x', 0)).toEqual(['x']);
  });
});

describe('wrapTitular', () => {
  test('keeps it on one line when it fits', () => {
    expect(wrapTitular(measure, 'GARCIA, ANA', 20)).toEqual(['GARCIA, ANA']);
  });

  test('breaks at the comma: surnames above, name below', () => {
    // 'RUBINAT I PERFUMAT, AMADEU' is 26 chars; force a break at width 20.
    expect(wrapTitular(measure, 'RUBINAT I PERFUMAT, AMADEU', 20)).toEqual([
      'RUBINAT I PERFUMAT,',
      'AMADEU',
    ]);
  });

  test('long surnames wrap further, name stays below', () => {
    const lines = wrapTitular(measure, "ESPECTRE I FONOLLOSA DE L'EDIFICI, ROBERT ANDREU", 18);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(18);
    // the name ends up on the last line, intact
    expect(lines[lines.length - 1]).toBe('ROBERT ANDREU');
    // the comma stays attached to the surnames block, not the name
    expect(lines.some((l) => l.endsWith(','))).toBe(true);
  });

  test('falls back to plain word-wrap when there is no comma', () => {
    expect(wrapTitular(measure, 'SINGLENAME HERE', 8)).toEqual(wrapLines(measure, 'SINGLENAME HERE', 8));
  });
});

describe('fitWrapped', () => {
  // Model a font where char width and line height both scale linearly with size.
  const makeWrapAt =
    (text: string, boxW: number) =>
    (size: number): string[] =>
      wrapLines((s) => s.length * size, text, boxW);

  test('keeps the start size when the block already fits', () => {
    const { size, lines } = fitWrapped({
      startSize: 8,
      minSize: 4,
      step: 0.5,
      boxH: 100,
      wrapAt: makeWrapAt('short text', 100),
      lineHeightAt: (s) => s,
    });
    expect(size).toBe(8);
    expect(lines).toEqual(['short text']);
  });

  test('shrinks until the wrapped block fits the box height', () => {
    // At size 8 this needs several lines and overflows a short box; shrinking both
    // narrows the glyphs (fewer lines) and lowers each line, so it converges.
    const text = 'one two three four five six seven eight';
    const boxW = 40;
    const { size, lines } = fitWrapped({
      startSize: 8,
      minSize: 4,
      step: 0.5,
      boxH: 20,
      wrapAt: makeWrapAt(text, boxW),
      lineHeightAt: (s) => s,
    });
    expect(size).toBeLessThan(8);
    expect(size).toBeGreaterThanOrEqual(4);
    expect(lines.length * size).toBeLessThanOrEqual(20);
  });

  test('never goes below the floor even if it still overflows', () => {
    const { size } = fitWrapped({
      startSize: 8,
      minSize: 4,
      step: 0.5,
      boxH: 1, // impossibly short
      wrapAt: makeWrapAt('impossible to fit anywhere', 10),
      lineHeightAt: (s) => s,
    });
    expect(size).toBe(4);
  });
});
