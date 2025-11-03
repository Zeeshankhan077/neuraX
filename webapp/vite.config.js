import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'https://neurax-main.onrender.com',
        ws: true
      }
    }
  },
  // ✅ Optional in production, just helps Render preview.
  preview: {
    port: 4173
  },
  // ✅ Allow Render to serve the built app without blocking
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
}))
