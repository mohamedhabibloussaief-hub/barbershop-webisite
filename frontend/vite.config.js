import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: '0.0.0.0',   // Required when running inside Docker
    // In dev, the Vite container proxies /api to the backend container.
    // "backend" resolves via Docker DNS when inside Docker Compose.
    // When running Vite on the host machine (npm run dev), use localhost:8000.
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:8000',
        changeOrigin: true,
        // Uncomment if Django uses HTTPS locally:
        // secure: false,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          query:    ['@tanstack/react-query'],
          forms:    ['react-hook-form'],
          charts:   ['recharts'],
        },
      },
    },
  },
})
