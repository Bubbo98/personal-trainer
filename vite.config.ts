/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // REACT_APP_ kept so the env vars already set on Vercel keep working
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: {
    port: 3000,
    // Same-origin /api in development too, like on Vercel
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: {
    // Vercel's static build serves this folder (vercel.json distDir)
    outDir: 'build',
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
