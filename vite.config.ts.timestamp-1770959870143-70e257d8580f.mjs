// vite.config.ts
import { defineConfig } from "file:///C:/Users/HALA-MADRID/Desktop/Cherag/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/HALA-MADRID/Desktop/Cherag/node_modules/@vitejs/plugin-react/dist/index.js";
import output from "file:///C:/Users/HALA-MADRID/Desktop/Cherag/node_modules/vite-plugin-compression/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), output()],
  build: {
    // Enable source maps for better debugging
    sourcemap: false,
    // Use esbuild for minification (built-in, faster than terser)
    minify: "esbuild",
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // React Core - critical for startup
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI Libraries - used across most pages
          "vendor-ui": ["lucide-react", "framer-motion"],
          // Supabase - needed for auth/data
          "vendor-supabase": ["@supabase/supabase-js"]
          // PDF/DOCX parsers are lazy-loaded in code, but we can explicit them here if we want 
          // to ensure they are definitely separate. However, minimal chunks is usually better.
          // Leaving them out of manualChunks usually lets Vite create a dynamic import chunk.
          // We will remove 'vendor-export' and 'vendor-pdf' to let them be dynamic chunks.
        }
      }
    },
    // Increase chunk size warning limit (after splitting vendors)
    chunkSizeWarningLimit: 600
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js"],
    exclude: ["pdfjs-dist"]
    // Large dependency, load on demand
  },
  // Server configuration for development
  server: {
    // Enable CORS
    // Enable CORS
    cors: true,
    // Proxy for API calls to avoid CORS
    proxy: {
      "/api/hf": {
        target: "https://router.huggingface.co",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hf/, ""),
        secure: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIQUxBLU1BRFJJRFxcXFxEZXNrdG9wXFxcXENoZXJhZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSEFMQS1NQURSSURcXFxcRGVza3RvcFxcXFxDaGVyYWdcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0hBTEEtTUFEUklEL0Rlc2t0b3AvQ2hlcmFnL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgb3V0cHV0IGZyb20gJ3ZpdGUtcGx1Z2luLWNvbXByZXNzaW9uJ1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCksIG91dHB1dCgpXSxcclxuXHJcbiAgYnVpbGQ6IHtcclxuICAgIC8vIEVuYWJsZSBzb3VyY2UgbWFwcyBmb3IgYmV0dGVyIGRlYnVnZ2luZ1xyXG4gICAgc291cmNlbWFwOiBmYWxzZSxcclxuXHJcbiAgICAvLyBVc2UgZXNidWlsZCBmb3IgbWluaWZpY2F0aW9uIChidWlsdC1pbiwgZmFzdGVyIHRoYW4gdGVyc2VyKVxyXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsXHJcblxyXG4gICAgLy8gQ29kZSBzcGxpdHRpbmcgY29uZmlndXJhdGlvblxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIC8vIFJlYWN0IENvcmUgLSBjcml0aWNhbCBmb3Igc3RhcnR1cFxyXG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuXHJcbiAgICAgICAgICAvLyBVSSBMaWJyYXJpZXMgLSB1c2VkIGFjcm9zcyBtb3N0IHBhZ2VzXHJcbiAgICAgICAgICAndmVuZG9yLXVpJzogWydsdWNpZGUtcmVhY3QnLCAnZnJhbWVyLW1vdGlvbiddLFxyXG5cclxuICAgICAgICAgIC8vIFN1cGFiYXNlIC0gbmVlZGVkIGZvciBhdXRoL2RhdGFcclxuICAgICAgICAgICd2ZW5kb3Itc3VwYWJhc2UnOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxyXG5cclxuICAgICAgICAgIC8vIFBERi9ET0NYIHBhcnNlcnMgYXJlIGxhenktbG9hZGVkIGluIGNvZGUsIGJ1dCB3ZSBjYW4gZXhwbGljaXQgdGhlbSBoZXJlIGlmIHdlIHdhbnQgXHJcbiAgICAgICAgICAvLyB0byBlbnN1cmUgdGhleSBhcmUgZGVmaW5pdGVseSBzZXBhcmF0ZS4gSG93ZXZlciwgbWluaW1hbCBjaHVua3MgaXMgdXN1YWxseSBiZXR0ZXIuXHJcbiAgICAgICAgICAvLyBMZWF2aW5nIHRoZW0gb3V0IG9mIG1hbnVhbENodW5rcyB1c3VhbGx5IGxldHMgVml0ZSBjcmVhdGUgYSBkeW5hbWljIGltcG9ydCBjaHVuay5cclxuICAgICAgICAgIC8vIFdlIHdpbGwgcmVtb3ZlICd2ZW5kb3ItZXhwb3J0JyBhbmQgJ3ZlbmRvci1wZGYnIHRvIGxldCB0aGVtIGJlIGR5bmFtaWMgY2h1bmtzLlxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEluY3JlYXNlIGNodW5rIHNpemUgd2FybmluZyBsaW1pdCAoYWZ0ZXIgc3BsaXR0aW5nIHZlbmRvcnMpXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDYwMCxcclxuICB9LFxyXG5cclxuICAvLyBPcHRpbWl6ZSBkZXBlbmRlbmNpZXNcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nLCAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXHJcbiAgICBleGNsdWRlOiBbJ3BkZmpzLWRpc3QnXSwgLy8gTGFyZ2UgZGVwZW5kZW5jeSwgbG9hZCBvbiBkZW1hbmRcclxuICB9LFxyXG5cclxuICAvLyBTZXJ2ZXIgY29uZmlndXJhdGlvbiBmb3IgZGV2ZWxvcG1lbnRcclxuICBzZXJ2ZXI6IHtcclxuICAgIC8vIEVuYWJsZSBDT1JTXHJcbiAgICAvLyBFbmFibGUgQ09SU1xyXG4gICAgY29yczogdHJ1ZSxcclxuICAgIC8vIFByb3h5IGZvciBBUEkgY2FsbHMgdG8gYXZvaWQgQ09SU1xyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGkvaGYnOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9yb3V0ZXIuaHVnZ2luZ2ZhY2UuY28nLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvaGYvLCAnJyksXHJcbiAgICAgICAgc2VjdXJlOiB0cnVlLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxUyxTQUFTLG9CQUFvQjtBQUNsVSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxZQUFZO0FBR25CLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO0FBQUEsRUFFM0IsT0FBTztBQUFBO0FBQUEsSUFFTCxXQUFXO0FBQUE7QUFBQSxJQUdYLFFBQVE7QUFBQTtBQUFBLElBR1IsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBO0FBQUEsVUFFWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUE7QUFBQSxVQUd6RCxhQUFhLENBQUMsZ0JBQWdCLGVBQWU7QUFBQTtBQUFBLFVBRzdDLG1CQUFtQixDQUFDLHVCQUF1QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFNN0M7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUFBO0FBQUEsRUFHQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLG9CQUFvQix1QkFBdUI7QUFBQSxJQUMzRSxTQUFTLENBQUMsWUFBWTtBQUFBO0FBQUEsRUFDeEI7QUFBQTtBQUFBLEVBR0EsUUFBUTtBQUFBO0FBQUE7QUFBQSxJQUdOLE1BQU07QUFBQTtBQUFBLElBRU4sT0FBTztBQUFBLE1BQ0wsV0FBVztBQUFBLFFBQ1QsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLGNBQWMsRUFBRTtBQUFBLFFBQ2hELFFBQVE7QUFBQSxNQUNWO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
