import { describe, test, expect } from 'vitest';
import { I18N, applyLang } from '../src/lib/i18n';

describe('I18N dictionary', () => {
  test('ca and es define exactly the same keys', () => {
    // A key present in one language but not the other renders blank/stale for the
    // other half of the users — the kind of drift that has slipped through before.
    expect(Object.keys(I18N.es).sort()).toEqual(Object.keys(I18N.ca).sort());
  });

  test('no value is left empty', () => {
    for (const lang of ['ca', 'es'] as const)
      for (const [k, v] of Object.entries(I18N[lang]))
        if (typeof v === 'string') expect(v, `${lang}.${k}`).not.toBe('');
  });

  test('pages_fmt renders the range and count per language', () => {
    const ca = I18N.ca.pages_fmt as (a: string, b: string, n: string) => string;
    const es = I18N.es.pages_fmt as (a: string, b: string, n: string) => string;
    expect(ca('1', '50', '50')).toBe('Del full 1 al 50 <span class="dim">· 50 fulls</span>');
    expect(es('1', '50', '50')).toBe('De la hoja 1 a la 50 <span class="dim">· 50 hojas</span>');
  });
});

describe('applyLang', () => {
  test('fills [data-i18n] text and [data-i18n-ph] placeholders', () => {
    document.body.innerHTML = `
      <h1 data-i18n="instr"></h1>
      <input data-i18n-ph="colegiPh" />`;
    applyLang(document.body, 'es');
    expect(document.querySelector('h1')!.textContent).toBe(I18N.es.instr);
    expect(document.querySelector('input')!.getAttribute('placeholder')).toBe(I18N.es.colegiPh);
    expect(document.documentElement.lang).toBe('es');

    applyLang(document.body, 'ca');
    expect(document.querySelector('h1')!.textContent).toBe(I18N.ca.instr);
    expect(document.documentElement.lang).toBe('ca');
  });

  test('appTitle is injected as HTML, not escaped text', () => {
    document.body.innerHTML = `<div data-i18n="appTitle"></div>`;
    applyLang(document.body, 'ca');
    // The string contains markup (<span>, <br>); it must land as real elements.
    expect(document.querySelector('div')!.querySelector('span')).not.toBeNull();
  });
});
