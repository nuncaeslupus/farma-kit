/// <reference types="vitest/config" />
import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vite';

// Every generated scanner page ({,ca/,eu/,gl/}lectores/**/index.html, from
// scripts/gen-scanners.mjs) is its own HTML entry, found on disk so adding a
// scanner needs no change here.
function scannerInputs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pre of ['', 'ca/', 'eu/', 'gl/']) {
    const dir = `${pre}lectores`;
    if (!existsSync(dir)) continue;
    out[`${pre}lectores`] = `${dir}/index.html`;
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (d.isDirectory()) out[`${pre}lectores/${d.name}`] = `${dir}/${d.name}/index.html`;
    }
  }
  return out;
}

// Absolute base for the GitHub Pages project site so runtime fetches
// (fonts, templates) resolve correctly even when the URL has no trailing
// slash. import.meta.env.BASE_URL === '/farma-kit/' at runtime.
export default defineConfig({
  base: '/farma-kit/',
  build: {
    rollupOptions: {
      // One HTML shell per language (index.html + {ca,eu,gl}/index.html) so
      // Google can index each version at its own URL instead of the single
      // Spanish shell the client-side language toggle can't change for a
      // crawler. Vite keeps each input's directory in the output, so e.g.
      // ca/index.html lands at dist/ca/index.html → served at /farma-kit/ca/.
      input: {
        main: 'index.html',
        ca: 'ca/index.html',
        eu: 'eu/index.html',
        gl: 'gl/index.html',
        faq: 'faq/index.html',
        caFaq: 'ca/faq/index.html',
        euFaq: 'eu/faq/index.html',
        glFaq: 'gl/faq/index.html',
        ...scannerInputs(),
      },
    },
  },
  test: {
    // jsdom for the applyLang DOM test; the pure-logic tests don't need it but
    // one environment for the whole suite is simpler than per-file overrides.
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
