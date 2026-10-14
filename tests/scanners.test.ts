import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs data module shared with scripts/gen-scanners.mjs
import { SCANNERS, T, LANGS } from '../scripts/scanners/data.mjs';

type Code = { bcid: string; data: string; key: string; fnc3?: boolean };
type Scanner = { slug: string; steps: Code[]; options: Code[] };

const hex = (s: string) => Array.from(s, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

describe('scanner configuration codes', () => {
  // Decoded from the codes scanned on the real devices. A change here means a
  // configuration code changed: re-test it on the scanner before updating.
  it('payloads match the tested codes byte for byte', () => {
    const got = Object.fromEntries(
      (SCANNERS as Scanner[]).map((s) => [s.slug, [...s.steps, ...s.options].map((c) => `${c.bcid}${c.fnc3 ? '+fnc3' : ''}:${hex(c.data)}`)]),
    );
    expect(got).toEqual({
      'honeywell-voyager-1472g': [
        'code128+fnc3:444546414c542e', // DEFALT.
        'code128+fnc3:4b424443545931302e', // KBDCTY10.
        'code128+fnc3:5041505450522e', // PAPTPR.
        'code128+fnc3:5653554643522e', // VSUFCR.
        'code128+fnc3:4b4244434153332e', // KBDCAS3.
        'code128+fnc3:4b4244434153322e', // KBDCAS2.
        'code128+fnc3:4b4244434153302e', // KBDCAS0.
        'code128+fnc3:4245504c564c312e', // BEPLVL1. (user guide)
        'code128+fnc3:4245504c564c332e', // BEPLVL3. (user guide)
        'code128+fnc3:5041504848462e', // PAPHHF.
      ],
      'tera-d5100': [
        'code128:252553706563436f64653933',
        'code128:252553706563436f64653433',
        'code128:252553706563436f64653943',
        'qrcode:8057534d30323030303030332e',
        'qrcode:4057534d30373036333130303b30373135323130303b',
        'code128:252553706563436f64653935', // low beep (manual)
        'code128:252553706563436f64653937', // high/normal beep (manual)
        'qrcode:8057534d30323030303030302e', // manual trigger mode (manual)
      ],
    });
  });

  it('every step has copy in every language', () => {
    for (const lang of LANGS as string[]) {
      for (const s of SCANNERS as Scanner[]) {
        for (const c of [...s.steps, ...s.options]) expect(T[lang].s[c.key], `${lang}/${c.key}`).toHaveLength(2);
      }
    }
  });
});
