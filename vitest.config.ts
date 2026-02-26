import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types/**',
        '**/__tests__/**',
      ],
    },
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
