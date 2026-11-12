// @vitest-environment node
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { generatePdf, UnsupportedCharsError } from '../src/lib/pdf/generate';
import type { Field, Template } from '../src/lib/template';

// Real fonts and the shipped template, read from disk: the layout arithmetic is
// only meaningful against real glyph metrics.
const tpl = JSON.parse(readFileSync('public/templates/catalunya.json', 'utf8')) as Template;
beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const buf = readFileSync(`public/fonts/${url.slice(url.lastIndexOf('/') + 1)}`);
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    };
  });
});

type Item = { str: string; x: number; y: number; w: number };
async function readBack(bytes: Uint8Array): Promise<Item[][]> {
  const pdf = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages: Item[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent();
    pages.push(
      items
        .filter((i): i is typeof i & { str: string } => 'str' in i && i.str.trim() !== '')
        .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })),
    );
  }
  return pages;
}
// A field's box in PDF space (origin bottom-left, y up).
const box = (f: Field) => ({
  l: f.box.x,
  r: f.box.x + f.box.w,
  b: tpl.sheet.h - f.box.y - f.box.h,
  t: tpl.sheet.h - f.box.y,
});
const field = (k: string) => tpl.fields.find((f) => f.key === k)!;
const full = {
  up: '12345',
  month: '07',
  year: '26',
  page: '0042',
  titular: 'PUIG, PERE',
  nif: '12345678Z',
  address: 'Carrer Major 1',
  cpCity: '08001  Barcelona',
  province: 'BARCELONA',
};

describe('generatePdf layout', () => {
  test('every printed item lands inside a field box, one page per entry, y axis not flipped', async () => {
    const pages = await readBack(await generatePdf(tpl, [full, { ...full, page: '0043' }]));
    expect(pages).toHaveLength(2);
    for (const items of pages) {
      expect(items.length).toBeGreaterThan(10);
      for (const it of items) {
        const f = tpl.fields.find((g) => {
          const r = box(g);
          return it.x >= r.l - 0.01 && it.x <= r.r && it.y >= r.b - 0.01 && it.y <= r.t;
        });
        expect(f, `"${it.str}" at ${it.x.toFixed(1)},${it.y.toFixed(1)} is outside every field box`).toBeDefined();
        expect(it.x + it.w, it.str).toBeLessThanOrEqual(box(f!).r + 0.5);
      }
      // 'up' sits at the top of the sheet, 'address' below it.
      const upY = items.find((i) => i.str === '1')!.y;
      expect(upY).toBeGreaterThan(items.find((i) => i.str.startsWith('Carrer'))!.y);
      expect(upY).toBeGreaterThan(tpl.sheet.h - 100);
    }
  });

  test('multi-cell fields print one glyph per cell, centred in it', async () => {
    const [items] = await readBack(await generatePdf(tpl, [full]));
    const up = field('up');
    const r = box(up);
    const cellW = up.box.w / up.cells;
    const glyphs = items.filter((i) => i.str.length === 1 && i.x >= r.l && i.x < r.r && i.y >= r.b && i.y <= r.t);
    expect(glyphs.map((g) => g.str).join('')).toBe('12345');
    glyphs.forEach((g, i) => expect(g.x + g.w / 2).toBeCloseTo(up.box.x + i * cellW + cellW / 2, 0));
  });

  test('right-aligned and left-aligned single cells hug their box edge', async () => {
    const [items] = await readBack(await generatePdf(tpl, [full]));
    const prov = field('province');
    const p = items.find((i) => i.str === 'BARCELONA')!;
    expect(p.x + p.w).toBeCloseTo(prov.box.x + prov.box.w, 0);
    expect(items.find((i) => i.str.startsWith('08001'))!.x).toBeCloseTo(field('cpCity').box.x, 0);
  });

  test('omitted fields print nothing (never the editor samples)', async () => {
    const [items] = await readBack(await generatePdf(tpl, [{ up: '12345' }]));
    expect(items.map((i) => i.str).join('')).toBe('12345');
  });

  test('a value that does not fit the cells throws instead of truncating', async () => {
    await expect(generatePdf(tpl, [{ page: '12345' }])).rejects.toThrow(/does not fit the 4 cells/);
  });
});

describe('characters the font cannot draw', () => {
  test('are refused with the field and the characters, not printed as blanks', async () => {
    const err = await generatePdf(tpl, [{ titular: 'ŁUKASZ, ANNA', address: 'Carrer ő' }]).catch((e) => e);
    expect(err).toBeInstanceOf(UnsupportedCharsError);
    expect(err.field).toBe('titular');
    expect(err.chars).toEqual(['Ł']);
  });

  test('accented Latin letters of es/ca/eu/gl are supported', async () => {
    await expect(
      generatePdf(tpl, [{ titular: 'NÚÑEZ ÀNGELS, ÓSCAR', address: "Carrer d'Ü·Ï ç ñ ¿" }]),
    ).resolves.toBeInstanceOf(Uint8Array);
  });
});
