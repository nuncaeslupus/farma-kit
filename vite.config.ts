/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

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
