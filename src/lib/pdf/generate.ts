import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import type { Field, Template } from '../template';
import { embedFont, registerFonts } from './fonts';

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
      drawField(page, tpl.sheet.h, font, f, pageData[f.key] ?? f.sample ?? '');
    }
  }
  return doc.save();
}

function drawField(page: PDFPage, sheetH: number, font: PDFFont, f: Field, value: string): void {
  const n = f.cells > 1 ? f.cells : 1;
  const cellW = f.box.w / n; // equal subdivision, no gap
  const chars = n > 1 ? [...String(value)] : [String(value)];
  const size = f.style.size;

  // font metrics for vertical placement
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

  for (let i = 0; i < n; i++) {
    const str = chars[i] ?? '';
    if (str === '') continue;
    const cellX = f.box.x + i * cellW;
    const tw = font.widthOfTextAtSize(str, size);
    const align = f.style.halign; // applies within each cell (multi) or the whole box (single)
    let x = cellX;
    if (align === 'center') x = cellX + (cellW - tw) / 2;
    else if (align === 'right') x = cellX + cellW - tw;
    page.drawText(str, { x, y: baseline, size, font, color: rgb(0, 0, 0) });
  }
}
