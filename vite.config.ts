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
          // React Core - critical for startup
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // UI Libraries - used across most pages
          'vendor-ui': ['lucide-react', 'framer-motion'],

          // Supabase - needed for auth/data
          'vendor-supabase': ['@supabase/supabase-js'],

          // PDF/DOCX parsers are lazy-loaded in code, but we can explicit them here if we want 
          // to ensure they are definitely separate. However, minimal chunks is usually better.
          // Leaving them out of manualChunks usually lets Vite create a dynamic import chunk.
          // We will remove 'vendor-export' and 'vendor-pdf' to let them be dynamic chunks.
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
