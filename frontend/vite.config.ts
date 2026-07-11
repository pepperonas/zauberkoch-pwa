/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ZK_API_PROXY: override for docker-compose (http://backend:8742)
      '/api': { target: process.env.ZK_API_PROXY ?? 'http://localhost:8742', changeOrigin: false },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
