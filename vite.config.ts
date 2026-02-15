/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import output from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), output()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      host: 'localhost',
      port: 3000,
    },
    watch: {
      usePolling: true,
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  }
} as any)
