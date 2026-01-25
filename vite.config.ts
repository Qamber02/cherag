import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Enable source maps for better debugging
    sourcemap: false,

    // Use esbuild for minification (built-in, faster than terser)
    minify: 'esbuild',

    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - large libraries in their own bundle
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf': ['pdfjs-dist'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'vendor-export': ['jspdf', 'docx', 'mammoth'],
        },
      },
    },

    // Increase chunk size warning limit (after splitting vendors)
    chunkSizeWarningLimit: 600,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    exclude: ['pdfjs-dist'], // Large dependency, load on demand
  },

  // Server configuration for development
  server: {
    // Enable CORS
    // Enable CORS
    cors: true,
    // Proxy for API calls to avoid CORS
    proxy: {
      '/api/hf': {
        target: 'https://router.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hf/, ''),
        secure: true,
      }
    }
  },
})
