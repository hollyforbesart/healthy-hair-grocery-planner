import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Three pages: the planner (index.html), the public sign-in page (access.html)
 * and the usage dashboard (stats.html, which holds no planner data).
 * Anything that contains the planner's data or code goes in /assets, which the
 * access lock protects; the access page's own files go in /public-assets.
 */
const isPlannerChunk = (chunk: { name: string; moduleIds?: string[] }) =>
  chunk.name === 'index' || (chunk.moduleIds ?? []).some((id) => id.includes('/src/data/') || id.includes('/src/steps/'));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { index: 'index.html', access: 'access.html', stats: 'stats.html' },
      output: {
        entryFileNames: (chunk) => (isPlannerChunk(chunk) ? 'assets/[name]-[hash].js' : 'public-assets/[name]-[hash].js'),
        chunkFileNames: (chunk) => (isPlannerChunk(chunk) ? 'assets/[name]-[hash].js' : 'public-assets/[name]-[hash].js'),
        assetFileNames: (asset) => ((asset.names ?? []).some((n) => n.startsWith('index')) ? 'assets/[name]-[hash][extname]' : 'public-assets/[name]-[hash][extname]'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
