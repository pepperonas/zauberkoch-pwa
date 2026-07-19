/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Single source of truth for the app version: the service-worker cache name
// (`zauberkoch-vN`), bumped on every release. Injected at build time so the
// footer always matches the deployed shell without a second place to maintain.
function appVersion(): string {
  try {
    const sw = readFileSync(fileURLToPath(new URL('./public/sw.js', import.meta.url)), 'utf8');
    return sw.match(/zauberkoch-(v\d+)/)?.[1] ?? 'dev';
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  plugins: [react()],
  server: {
    proxy: {
      // ZK_API_PROXY: override for docker-compose (http://backend:8742)
      '/api': { target: process.env.ZK_API_PROXY ?? 'http://localhost:8742', changeOrigin: false },
    },
  },
  preview: {
    proxy: {
      '/api': { target: process.env.ZK_API_PROXY ?? 'http://localhost:8742', changeOrigin: false },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      // Honest project-wide numbers: measure ALL source files, not just the
      // ones a test happens to import. UI pages/features are E2E territory —
      // unit coverage focuses on lib/state/i18n logic.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/vite-env.d.ts'],
    },
  },
});
