import { defineConfig } from 'vite';

// Absolute base for the GitHub Pages project site so runtime fetches
// (fonts, templates) resolve correctly even when the URL has no trailing
// slash. import.meta.env.BASE_URL === '/farma-kit/' at runtime.
export default defineConfig({
  base: '/farma-kit/',
});
