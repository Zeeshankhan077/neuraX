import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    port: 4173,
    allowedHosts: ["neurax-main.onrender.com", "neurax-webapp.onrender.com"]
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'https://neurax-main.onrender.com',
        ws: true
      }
    }
  }
})
