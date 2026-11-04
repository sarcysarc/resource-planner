import { defineConfig } from 'vitest/config';
import { stressPlugin } from './stress/plugin.ts';

export default defineConfig({
  base: './',
  // Dev server only: saves OCR scans of the local screenshots (ADR 0016).
  plugins: [stressPlugin()],
  build: {
    rollupOptions: {
      // The service worker is its own entry with a fixed name at the root, so its
      // scope covers the whole app (ADR 0010).
      input: { main: 'index.html', sw: 'src/sw.ts' },
      output: { entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js') },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/sw.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
