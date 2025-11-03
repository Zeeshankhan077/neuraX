import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 🧠 Vite config that works for both local dev and Render
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Local dev only: forward WebSocket + API requests to backend
      '/socket.io': {
        target: 'http://localhost:10000',
        ws: true
      },
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    allowedHosts: [
      'neurax-main.onrender.com',
      'neurax-webapp.onrender.com'
    ]
  },
  build: {
    outDir: 'dist'
  }
}))
