import { defineConfig } from 'vite';

// base './' keeps asset URLs relative so it works under the GitHub Pages
// subpath (nuncaeslupus.github.io/farma-kit/) without extra config.
export default defineConfig({
  base: './',
});
