import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { dashboardApi } from './mock-api/dashboardApi.ts';

export default defineConfig({
  plugins: [react(), dashboardApi()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'mock-api/**/*.test.ts'],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
