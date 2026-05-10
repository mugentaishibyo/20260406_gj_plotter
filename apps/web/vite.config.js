import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/20260406_gj_plotter/',
  root: resolve(__dirname),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
