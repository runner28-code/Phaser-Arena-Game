import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020'
  },
  server: {
    host: true,
    port: 3000
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.svg', '**/*.mp3', '**/*.wav']
});