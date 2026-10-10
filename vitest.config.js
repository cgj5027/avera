import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { 'npm:@base44/sdk@0.8.52':new URL('./tests/backendSdk.js', import.meta.url).pathname, 'base44:runtime':new URL('./tests/backendRuntime.js', import.meta.url).pathname, '@': new URL('./src', import.meta.url).pathname } },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.js'] },
});
