/* Greedy word-wrap for single-cell text fields. Kept separate from generate.ts
   (which pulls in pdf-lib/fontkit) so it stays a pure, unit-testable function:
   width is supplied via `measure`, not a live font. */

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
  const fits = (s: string) => measure(s) <= maxWidth;
  const lines: string[] = [];
  let cur = '';

  // Emit whole chunks of an over-long word; return the trailing remainder to
  // keep filling the current line. A char that overflows on its own is still
  // emitted (can't be split further) rather than looping forever.
  const breakWord = (word: string): string => {
    let chunk = '';
    for (const ch of word) {
      if (chunk && !fits(chunk + ch)) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    return chunk;
  };

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = cur ? cur + ' ' + word : word;
    if (fits(candidate)) {
      cur = candidate;
      continue;
    }
    if (cur) {
      lines.push(cur);
      cur = '';
    }
    cur = fits(word) ? word : breakWord(word);
  }
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
  const lines: string[] = [];
  let cur = '';
  const flush = () => {
    if (cur) {
      lines.push(cur);
      cur = '';
    }
  };
  const place = (tok: string): boolean => {
    const cand = cur ? cur + ' ' + tok : tok;
    if (!fits(cand)) return false;
    cur = cand;
    return true;
  };

  // surname words — breakable
  for (const w of surnames.split(/\s+/).filter(Boolean)) {
    if (place(w)) continue;
    flush();
    if (fits(w)) {
      cur = w;
    } else {
      for (const ch of w) {
        if (cur && !fits(cur + ch)) {
          lines.push(cur);
          cur = ch;
        } else {
          cur += ch;
        }
      }
    }
  }

  // name — one atomic unit: attach to the current line, else drop it whole to the
  // next line; only wrap it if it is itself wider than the box.
  if (name && !place(name)) {
    flush();
    if (fits(name)) {
      cur = name;
    } else {
      const nl = wrapLines(measure, name, maxWidth);
      lines.push(...nl.slice(0, -1));
      cur = nl[nl.length - 1] ?? '';
    }
  }
  flush();
  return lines;
}
