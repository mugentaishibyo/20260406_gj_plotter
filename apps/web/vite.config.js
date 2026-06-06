import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  base: './',
  root: resolve(__dirname),
  build: {
    outDir: '../../docs',
    emptyOutDir: true,
  },
});
