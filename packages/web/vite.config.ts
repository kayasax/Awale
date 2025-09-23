import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When deploying to GitHub Pages project site the app is served from /Awale/
// Set base accordingly so built asset URLs include the subpath.
const repoBase = process.env.BUILD_BASE || '/Awale/';

export default defineConfig({
  base: repoBase,
  plugins: [react()],
  css: { postcss: { plugins: [] } }
});
