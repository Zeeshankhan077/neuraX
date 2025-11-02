import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: mode === 'production'
          ? 'https://neurax-main.onrender.com'
          : 'http://localhost:10000',
        changeOrigin: true
      },
      '/socket.io': {
        target: mode === 'production'
          ? 'wss://neurax-main.onrender.com'
          : 'ws://localhost:10000',
        ws: true
      }
    }
  },
  preview: {
    allowedHosts: [
      'neurax-main.onrender.com',
      'neurax-1.onrender.com',
      'localhost'
    ]
  }
}))
