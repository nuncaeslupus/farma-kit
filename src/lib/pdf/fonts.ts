import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont } from 'pdf-lib';
import type { FontFamily } from '../template';

/* Vendored IBM Plex (public/fonts/*.woff) — no CDN at runtime. fontkit reads
   .woff (not .woff2). Four styles per family: regular/bold/italic/bold-italic. */
const FAMILY: Record<FontFamily, string> = {
  mono: 'ibm-plex-mono',
  sans: 'ibm-plex-sans',
  serif: 'ibm-plex-serif',
};

export const FONT_CSS: Record<FontFamily, string> = {
  mono: "'IBM Plex Mono', monospace",
  sans: "'IBM Plex Sans', sans-serif",
  serif: "'IBM Plex Serif', serif",
};

function fileFor(family: FontFamily, bold: boolean, italic: boolean): string {
  const weight = bold ? '700' : '400';
  const style = italic ? 'italic' : 'normal';
  return `${FAMILY[family]}-latin-${weight}-${style}.woff`;
}

const bytesCache = new Map<string, Promise<ArrayBuffer>>();
function loadBytes(file: string): Promise<ArrayBuffer> {
  let p = bytesCache.get(file);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}fonts/${file}`).then((r) => {
      if (!r.ok) throw new Error(`font ${file} (${r.status})`);
      return r.arrayBuffer();
    });
    bytesCache.set(file, p);
  }
  return p;
}

export function registerFonts(doc: PDFDocument): void {
  doc.registerFontkit(fontkit);
}

/** Embed (family, bold, italic) into `doc`, caching per document. */
export async function embedFont(
  doc: PDFDocument,
  family: FontFamily,
  bold: boolean,
  italic: boolean,
  cache: Map<string, PDFFont>,
): Promise<PDFFont> {
  const file = fileFor(family, bold, italic);
  const hit = cache.get(file);
  if (hit) return hit;
  const bytes = await loadBytes(file);
  const font = await doc.embedFont(bytes, { subset: true });
  cache.set(file, font);
  return font;
}
