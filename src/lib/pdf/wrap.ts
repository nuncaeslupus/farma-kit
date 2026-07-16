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
    size = Math.max(opts.minSize, +(size - opts.step).toFixed(2));
    lines = opts.wrapAt(size);
  }
  return { size, lines };
}

/**
 * Titular ("SURNAMES, NAME") wrap. If it fits on one line it stays one line;
 * otherwise it breaks at the first comma — surnames above, name below — and each
 * part is word-wrapped in turn, so a very long surname still can't overflow.
 */
export function wrapTitular(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  // Drop any space before the comma so "SURNAMES , NAME" can't strand the comma
  // on its own line when the surnames part is split.
  text = text.replace(/\s+,/g, ',');
  if (measure(text) <= maxWidth) return [text];
  const i = text.indexOf(',');
  if (i < 0) return wrapLines(measure, text, maxWidth);
  const surnames = text.slice(0, i + 1).trim(); // keep the comma with the surnames
  const name = text.slice(i + 1).trim();
  return [
    ...wrapLines(measure, surnames, maxWidth),
    ...(name ? wrapLines(measure, name, maxWidth) : []),
  ];
}
