import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Universal config for both local dev & Render
export default defineConfig(({ mode }) => ({
  base: './', // fixes white screen issues in Render builds
  plugins: [react()],
  server: {
    port: 3000,
    proxy: mode === 'development' ? {
      '/socket.io': {
        target: 'http://localhost:10000',
        ws: true
      },
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true
      }
    } : undefined
  },
  preview: {
    port: 4173,
    allowedHosts: [
      'neurax-main.onrender.com',
      'neurax-webapp.onrender.com'
    ]
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
}))
