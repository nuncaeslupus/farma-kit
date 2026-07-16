/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Absolute base for the GitHub Pages project site so runtime fetches
// (fonts, templates) resolve correctly even when the URL has no trailing
// slash. import.meta.env.BASE_URL === '/farma-kit/' at runtime.
export default defineConfig({
  base: '/farma-kit/',
  test: {
    // jsdom for the applyLang DOM test; the pure-logic tests don't need it but
    // one environment for the whole suite is simpler than per-file overrides.
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
