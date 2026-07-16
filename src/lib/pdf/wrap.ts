/* Greedy word-wrap for single-cell text fields. Kept separate from generate.ts
   (which pulls in pdf-lib/fontkit) so it stays a pure, unit-testable function:
   width is supplied via `measure`, not a live font. */

const words = (s: string): string[] => s.split(/\s+/).filter(Boolean);

/**
 * The shared greedy packer. Fills lines with `list`, starting from `cur`, and
 * returns the completed lines plus the still-open last line — leaving it open is
 * what lets wrapTitular append the name to the trailing surname line.
 * A word wider than maxWidth is split by character; a single char that overflows
 * on its own is still emitted (can't be split further) rather than looping forever.
 */
function pack(
  measure: (s: string) => number,
  list: string[],
  maxWidth: number,
  cur = '',
): { lines: string[]; cur: string } {
  const fits = (s: string) => measure(s) <= maxWidth;
  const lines: string[] = [];
  for (const word of list) {
    const candidate = cur ? cur + ' ' + word : word;
    if (fits(candidate)) {
      cur = candidate;
      continue;
    }
    if (cur) {
      lines.push(cur);
      cur = '';
    }
    if (fits(word)) {
      cur = word;
      continue;
    }
    for (const ch of word) {
      if (cur && !fits(cur + ch)) {
        lines.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
  }
  return { lines, cur };
}

/**
 * Break `text` into lines that each measure <= `maxWidth`. Wraps on whitespace;
 * a single word wider than maxWidth is split by character so nothing can overflow
 * horizontally. Returns [] for empty/whitespace-only input.
 */
export function wrapLines(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const { lines, cur } = pack(measure, words(text), maxWidth);
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Largest size in [minSize, startSize] (stepping down by `step`) whose wrapped
 * block fits within `boxH`, with the lines produced at that size. Measurement is
 * injected (`wrapAt` / `lineHeightAt`) so this stays pure and unit-testable.
 * If nothing fits down to minSize, returns minSize's result (best effort).
 */
export function fitWrapped(opts: {
  startSize: number;
  minSize: number;
  step: number;
  boxH: number;
  wrapAt: (size: number) => string[];
  lineHeightAt: (size: number) => number;
}): { size: number; lines: string[] } {
  let size = opts.startSize;
  let lines = opts.wrapAt(size);
  while (size > opts.minSize && lines.length * opts.lineHeightAt(size) > opts.boxH) {
    size = Math.max(opts.minSize, +(size - opts.step).toFixed(4));
    lines = opts.wrapAt(size);
  }
  return { size, lines };
}

/**
 * Titular ("SURNAMES, NAME") wrap, in as few lines as possible while keeping the
 * NAME (everything after the comma) on a single line:
 *   - fits on one line  → one line ("TOUS PUIG, PERE").
 *   - surnames fill a line, name doesn't fit after them → name drops whole to the
 *     next line ("SURNAMES," / "PERE PAU" — never "…PERE" / "PAU").
 *   - surnames must break AND the name fits after the trailing surname words →
 *     surnames split, the tail shares its line with the name ("PUIG DE LA" /
 *     "GRAN, ANNA").
 * Surname words too wide are character-broken; a name wider than the box is the
 * only case that wraps the name itself.
 */
export function wrapTitular(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  // Trim, and drop any space before the comma, so stray whitespace can't offset the
  // one-line result or strand the comma when the surnames part is split.
  text = text.trim().replace(/\s+,/g, ',');
  if (measure(text) <= maxWidth) return [text];
  const i = text.indexOf(',');
  if (i < 0) return wrapLines(measure, text, maxWidth);
  const surnames = text.slice(0, i + 1).trim(); // keeps the comma
  const name = text.slice(i + 1).trim();
  const fits = (s: string) => measure(s) <= maxWidth;

  // Pack the surname words, leaving the last line open so the name can join it.
  const { lines, cur } = pack(measure, words(surnames), maxWidth);
  let tail = cur;

  // The name is one atomic unit: append it to the open line, else drop it whole to
  // the next line. Only a name wider than the box itself gets wrapped.
  if (name) {
    const joined = tail ? tail + ' ' + name : name;
    if (fits(joined)) {
      tail = joined;
    } else {
      if (tail) lines.push(tail);
      if (fits(name)) {
        tail = name;
      } else {
        const nl = wrapLines(measure, name, maxWidth);
        lines.push(...nl.slice(0, -1));
        tail = nl[nl.length - 1] ?? '';
      }
    }
  }
  if (tail) lines.push(tail);
  return lines;
}
