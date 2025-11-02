import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['neurax-main.onrender.com'], // 👈 Add this to allow Render preview
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://neurax-server.onrender.com', // 👈 Your Python server
        changeOrigin: true,
        secure: true
      },
      '/socket.io': {
        target: 'wss://neurax-server.onrender.com',
        ws: true,
        secure: true,
        changeOrigin: true
      }
    }
  }
})
