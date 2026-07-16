import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import type { Field, Template } from '../template';
import { embedFont, registerFonts } from './fonts';
import { wrapLines, wrapTitular, fitWrapped } from './wrap';

// Font floor for shrink-to-fit: below this a coupon sheet is unreadable anyway,
// so we stop shrinking and accept minimal overflow rather than vanishing text.
const MIN_FONT_SIZE = 4;

/**
 * Build the filled PDF entirely client-side — one page per entry in `pages`
 * (each a key→value map). When `basePdf` is given the data is drawn over the
 * official sheet (a visual test); for real printing pass none and print the
 * data-only overlay onto physical paper.
 */
export async function generatePdf(
  tpl: Template,
  pages: Record<string, string>[],
  basePdf?: ArrayBuffer | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  registerFonts(doc);
  const baseDoc = basePdf ? await PDFDocument.load(basePdf) : null;
  const cache = new Map<string, PDFFont>();

  for (const pageData of pages) {
    let page: PDFPage;
    if (baseDoc) {
      const [pg] = await doc.copyPages(baseDoc, [0]);
      doc.addPage(pg);
      page = pg;
    } else {
      page = doc.addPage([tpl.sheet.w, tpl.sheet.h]);
    }
    for (const f of tpl.fields) {
      const font = await embedFont(doc, f.style.font, f.style.bold, f.style.italic, cache);
      // NEVER fall back to f.sample: samples are the editor's preview placeholders,
      // so a field the caller omitted — the stamp data when the user did not ask
      // for it — would print a stranger's name, NIF and address onto a real
      // official sheet. Callers wanting samples pass them in; the editor does.
      drawField(page, tpl.sheet.h, font, f, pageData[f.key] ?? '');
    }
  }
  return doc.save();
}

function drawField(page: PDFPage, sheetH: number, font: PDFFont, f: Field, value: string): void {
  if (f.cells > 1) drawMultiCellField(page, sheetH, font, f, value);
  else drawSingleCellField(page, sheetH, font, f, value);
}

// Fixed character grid (up/month/year/page): one glyph per cell, never wrapped.
function drawMultiCellField(
  page: PDFPage,
  sheetH: number,
  font: PDFFont,
  f: Field,
  value: string,
): void {
  const size = f.style.size;
  const ascent = font.heightAtSize(size, { descender: false });
  const full = font.heightAtSize(size);
  const descent = full - ascent;
  const boxBottom = sheetH - (f.box.y + f.box.h); // pdf-lib origin is bottom-left
  const boxTop = sheetH - f.box.y;

  let baseline: number;
  switch (f.style.valign) {
    case 'top':
      baseline = boxTop - ascent;
      break;
    case 'bottom':
      baseline = boxBottom + descent;
      break;
    case 'baseline':
      baseline = boxBottom;
      break;
    default: // middle
      baseline = boxBottom + (f.box.h - full) / 2 + descent;
  }

  const n = f.cells;
  const cellW = f.box.w / n; // equal subdivision, no gap
  const chars = [...String(value)];
  for (let i = 0; i < n; i++) {
    const str = chars[i] ?? '';
    if (str === '') continue;
    const cellX = f.box.x + i * cellW;
    const tw = font.widthOfTextAtSize(str, size);
    let x = cellX;
    if (f.style.halign === 'center') x = cellX + (cellW - tw) / 2;
    else if (f.style.halign === 'right') x = cellX + cellW - tw;
    page.drawText(str, { x, y: baseline, size, font, color: rgb(0, 0, 0) });
  }
}

// Single text field: wrap to the box width so long values break onto new lines,
// and shrink the font if the wrapped block is taller than the box, so text never
// spills into the field below. Values that already fit keep their configured size.
function drawSingleCellField(
  page: PDFPage,
  sheetH: number,
  font: PDFFont,
  f: Field,
  value: string,
): void {
  const str = String(value);
  if (str === '') return;

  const wrapAt = (sz: number): string[] => {
    const measure = (s: string) => font.widthOfTextAtSize(s, sz);
    return f.key === 'titular'
      ? wrapTitular(measure, str, f.box.w) // surnames above, name below
      : wrapLines(measure, str, f.box.w);
  };
  const { size: fitSize, lines } = fitWrapped({
    startSize: f.style.size,
    minSize: MIN_FONT_SIZE,
    step: 0.5,
    boxH: f.box.h,
    wrapAt,
    lineHeightAt: (sz) => font.heightAtSize(sz),
  });
  if (lines.length === 0) return;

  const ascent = font.heightAtSize(fitSize, { descender: false });
  const full = font.heightAtSize(fitSize);
  const descent = full - ascent;
  const lineH = full;
  const blockH = lines.length * lineH;
  const boxBottom = sheetH - (f.box.y + f.box.h);
  const boxTop = sheetH - f.box.y;

  let firstBaseline: number;
  switch (f.style.valign) {
    case 'top':
      firstBaseline = boxTop - ascent;
      break;
    case 'bottom':
      firstBaseline = boxBottom + descent + (lines.length - 1) * lineH;
      break;
    case 'baseline':
      // last line's baseline sits on the box bottom, earlier lines stack above it
      firstBaseline = boxBottom + (lines.length - 1) * lineH;
      break;
    default: // middle
      firstBaseline = boxTop - (f.box.h - blockH) / 2 - ascent;
  }

  lines.forEach((line, i) => {
    const tw = font.widthOfTextAtSize(line, fitSize);
    let x = f.box.x;
    if (f.style.halign === 'center') x = f.box.x + (f.box.w - tw) / 2;
    else if (f.style.halign === 'right') x = f.box.x + f.box.w - tw;
    page.drawText(line, { x, y: firstBaseline - i * lineH, size: fitSize, font, color: rgb(0, 0, 0) });
  });
}
